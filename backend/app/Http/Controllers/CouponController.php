<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Laravel\Sanctum\PersonalAccessToken;

class CouponController extends Controller
{
    /**
     * Get public list of active coupons
     * GET /api/v1/coupons/public
     */
    public function publicList(Request $request)
    {
        try {
            $now = Carbon::now();
            
            $coupons = Coupon::where('status', 1)
                ->where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($coupon) {
                    // Only return necessary fields for public
                    return [
                        'id' => $coupon->id,
                        'code' => $coupon->code,
                        'name' => $coupon->name,
                        'description' => $coupon->description,
                        'discount_type' => $coupon->discount_type,
                        'discount_value' => $coupon->discount_value,
                        'max_discount' => $coupon->max_discount,
                        'min_order_amount' => $coupon->min_order_amount,
                        'start_date' => $coupon->start_date,
                        'end_date' => $coupon->end_date,
                        'time_restriction' => $coupon->time_restriction,
                        'success_message' => $coupon->success_message,
                        'error_message' => $coupon->error_message,
                    ];
                });

            return response()->json([
                'data' => $coupons
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate and apply coupon code
     * POST /api/v1/coupons/validate
     */
    public function validateCode(Request $request)
    {
        try {
            $data = $request->validate([
                'code' => 'required|string|max:50',
                'cart_items' => 'nullable|array',
                'subtotal' => 'required|numeric|min:0',
                'user_id' => 'nullable|integer',
                'email' => 'nullable|string|email',
                'phone' => 'nullable|string',
            ]);

            // Nếu route không bắt buộc auth, cố gắng rút user_id từ bearer token/session
            // để phục vụ rule usage_per_customer và các hạn chế theo khách hàng.
            if (empty($data['user_id'])) {
                // Ưu tiên user từ session (nếu có middleware web)
                $authUserId = optional($request->user())->id;
                if ($authUserId) {
                    $data['user_id'] = (int) $authUserId;
                } else {
                    // Thử đọc từ bearer token (Sanctum) cho route public
                    if ($token = $request->bearerToken()) {
                        if ($pat = PersonalAccessToken::findToken($token)) {
                            $data['user_id'] = (int) $pat->tokenable_id;
                        }
                    }
                }
            }

            $code = strtoupper(trim($data['code']));
            $coupon = Coupon::where('code', $code)->first();

            if (!$coupon) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Mã giảm giá không tồn tại.'
                ], 200);
            }

            // Check if coupon is active
            if (!$coupon->isActive()) {
                return response()->json([
                    'valid' => false,
                    'message' => $coupon->error_message ?: 'Mã đã hết hạn hoặc không còn hiệu lực.'
                ], 200);
            }

            // Check customer eligibility
            $customerCheck = $coupon->canUseByCustomer(
                $data['user_id'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $data['cart_items'] ?? []
            );

            if (!$customerCheck['valid']) {
                return response()->json([
                    'valid' => false,
                    'message' => $customerCheck['message'] ?: 'Mã giảm giá không thể sử dụng.'
                ], 200);
            }

            // Calculate discount
            $discount = $coupon->calculateDiscount($data['subtotal'], $data['cart_items'] ?? []);

            if (!$discount['valid']) {
                return response()->json([
                    'valid' => false,
                    'message' => $discount['message'] ?: 'Mã giảm giá không thể áp dụng cho đơn hàng này.'
                ], 200);
            }

            return response()->json([
                'valid' => true,
                'coupon' => [
                    'id' => $coupon->id,
                    'code' => $coupon->code,
                    'name' => $coupon->name,
                    'discount_type' => $coupon->discount_type,
                    'discount_amount' => $discount['discount_amount'],
                    'message' => $discount['message'] ?: sprintf('Áp dụng mã %s thành công!', $coupon->code),
                    'free_ship' => $coupon->discount_type === 'free_ship'
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            $errorMessages = [];
            foreach ($errors as $field => $messages) {
                $errorMessages[] = implode(', ', $messages);
            }
            return response()->json([
                'valid' => false,
                'message' => 'Dữ liệu không hợp lệ: ' . implode('; ', $errorMessages)
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Coupon validation error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'valid' => false,
                'message' => 'Đã xảy ra lỗi khi kiểm tra mã giảm giá. Vui lòng thử lại.'
            ], 200);
        }
    }

    /**
     * List all coupons (admin)
     * GET /api/v1/coupons
     */
    public function index(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 20);
            $search = $request->get('q', '');
            $status = $request->get('status');

            $query = Coupon::query();

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            if ($status !== null) {
                $query->where('status', $status);
            }

            $total = $query->count();
            $items = $query->orderBy('created_at', 'desc')
                          ->skip(($page - 1) * $perPage)
                          ->take($perPage)
                          ->get();

            return response()->json([
                'data' => $items,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single coupon (admin)
     * GET /api/v1/coupons/{id}
     */
    public function show($id)
    {
        try {
            $coupon = Coupon::findOrFail($id);
            
            // Load usage statistics
            $coupon->setAttribute('total_orders', $coupon->orders()->count());
            $coupon->setAttribute('total_revenue', $coupon->orders()->sum('total'));
            $coupon->setAttribute('total_discount_given', CouponUsage::where('coupon_id', $id)->sum('discount_amount'));

            return response()->json([
                'data' => $coupon
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new coupon (admin)
     * POST /api/v1/coupons
     */
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'name' => 'required|string|max:191',
                'code' => 'required|string|max:50|unique:coupons,code',
                'description' => 'nullable|string',
                'discount_type' => 'required|in:fixed,percent,free_ship',
                'discount_value' => 'required|numeric|min:0',
                'max_discount' => 'nullable|numeric|min:0',
                'min_order_amount' => 'nullable|numeric|min:0',
                'apply_to' => 'required|in:all,category,product',
                'category_ids' => 'nullable|array',
                'product_ids' => 'nullable|array',
                'exclude_product_ids' => 'nullable|array',
                'delivery_method' => 'required|in:all,pickup,delivery',
                'advance_hours' => 'nullable|integer|min:0',
                'customer_restriction' => 'required|in:all,new,birthday',
                'exclude_sale_items' => 'nullable|boolean',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'time_restriction' => 'nullable|string',
                'total_usage_limit' => 'nullable|integer|min:0',
                'usage_per_customer' => 'nullable|integer|min:1',
                'allowed_customer_emails' => 'nullable|array',
                'can_stack_with_ship' => 'nullable|boolean',
                'success_message' => 'nullable|string',
                'error_message' => 'nullable|string',
                'status' => 'nullable|integer'
            ]);

            $data['status'] = $data['status'] ?? 1;
            $data['created_by'] = auth()->id();

            $coupon = Coupon::create($data);

            return response()->json([
                'message' => 'Coupon created successfully',
                'data' => $coupon
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update coupon (admin)
     * PUT/PATCH /api/v1/coupons/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $coupon = Coupon::findOrFail($id);

            $data = $request->validate([
                'name' => 'sometimes|string|max:191',
                'code' => 'sometimes|string|max:50|unique:coupons,code,' . $id,
                'description' => 'nullable|string',
                'discount_type' => 'sometimes|in:fixed,percent,free_ship',
                'discount_value' => 'sometimes|numeric|min:0',
                'max_discount' => 'nullable|numeric|min:0',
                'min_order_amount' => 'nullable|numeric|min:0',
                'apply_to' => 'sometimes|in:all,category,product',
                'category_ids' => 'nullable|array',
                'product_ids' => 'nullable|array',
                'exclude_product_ids' => 'nullable|array',
                'delivery_method' => 'sometimes|in:all,pickup,delivery',
                'advance_hours' => 'nullable|integer|min:0',
                'customer_restriction' => 'sometimes|in:all,new,birthday',
                'exclude_sale_items' => 'nullable|boolean',
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date',
                'time_restriction' => 'nullable|string',
                'total_usage_limit' => 'nullable|integer|min:0',
                'usage_per_customer' => 'nullable|integer|min:1',
                'allowed_customer_emails' => 'nullable|array',
                'can_stack_with_ship' => 'nullable|boolean',
                'success_message' => 'nullable|string',
                'error_message' => 'nullable|string',
                'status' => 'nullable|integer'
            ]);

            $data['updated_by'] = auth()->id();
            $coupon->update($data);

            return response()->json([
                'message' => 'Coupon updated successfully',
                'data' => $coupon->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete coupon (admin) — Đưa vào thùng rác (status=0)
     * DELETE /api/v1/coupons/{id}
     */
    public function destroy($id)
    {
        try {
            $coupon = Coupon::findOrFail($id);
            $coupon->status = 0;
            $coupon->updated_by = auth()->id();
            $coupon->save();

            return response()->json([
                'message' => 'Hidden'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/v1/coupons/trash — danh sách đang ẩn (status=0)
     */
    public function trash(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 20);
            $search = $request->get('q', '');

            $query = Coupon::where('status', 0);

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            $total = $query->count();
            $items = $query->orderBy('updated_at', 'desc')
                          ->skip(($page - 1) * $perPage)
                          ->take($perPage)
                          ->get();

            return response()->json([
                'data' => $items,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => ceil($total / $perPage),
                'current_page' => $page,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/v1/coupons/{id}/restore — khôi phục từ thùng rác
     */
    public function restore($id)
    {
        try {
            $coupon = Coupon::findOrFail($id);
            $coupon->status = 1;
            $coupon->updated_by = auth()->id();
            $coupon->save();

            return response()->json([
                'message' => 'Restored'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/v1/coupons/restore  body: { ids: [] }
     */
    public function bulkRestore(Request $request)
    {
        try {
            $ids = (array)$request->input('ids', []);
            $ids = array_values(array_filter(array_map('intval', $ids)));
            if (!$ids) return response()->json(['message' => 'No IDs'], 422);

            Coupon::whereIn('id', $ids)->update([
                'status' => 1,
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'message' => 'Restored',
                'count' => count($ids)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/coupons/{id}/purge — xoá vĩnh viễn
     */
    public function purge($id)
    {
        try {
            $coupon = Coupon::findOrFail($id);
            $coupon->delete();

            return response()->json([
                'message' => 'Purged'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/coupons/purge  body: { ids: [] }
     */
    public function bulkPurge(Request $request)
    {
        try {
            $ids = (array)$request->input('ids', []);
            $ids = array_values(array_filter(array_map('intval', $ids)));
            if (!$ids) return response()->json(['message' => 'No IDs'], 422);

            Coupon::whereIn('id', $ids)->delete();

            return response()->json([
                'message' => 'Purged',
                'count' => count($ids)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Record coupon usage after order is created
     * This should be called from OrderController after creating an order
     */
    public static function recordUsage($couponId, $orderId, $userId, $email, $phone, $orderAmount, $discountAmount)
    {
        try {
            CouponUsage::create([
                'coupon_id' => $couponId,
                'order_id' => $orderId,
                'user_id' => $userId,
                'email' => $email,
                'phone' => $phone,
                'order_amount' => $orderAmount,
                'discount_amount' => $discountAmount,
            ]);

            // Increment usage count
            $coupon = Coupon::find($couponId);
            if ($coupon) {
                $coupon->increment('current_usage_count');
            }

        } catch (\Exception $e) {
            \Log::error('Failed to record coupon usage: ' . $e->getMessage());
        }
    }
}


