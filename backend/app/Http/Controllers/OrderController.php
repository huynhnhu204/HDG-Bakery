<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Product;
use App\Models\ProductStore;
use App\Http\Controllers\CouponController;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\PersonalAccessToken; // ✅ để rút user từ bearer token (route public)

class OrderController extends Controller
{
    /* ===================== ORDER helpers ===================== */
    private array $statusMap = [0=>'pending',1=>'processing',2=>'shipped',3=>'delivered',4=>'cancelled'];
    private array $statusRev;

    public function __construct()
    {
        $this->statusRev = array_change_key_case(array_flip($this->statusMap), CASE_LOWER);
    }

    private function statusToInt($v): int
    {
        if (is_numeric($v)) return (int)$v;
        return $this->statusRev[strtolower((string)$v)] ?? 0;
    }

    private function statusToText($v): string
    {
        $i = is_numeric($v) ? (int)$v : $this->statusToInt($v);
        return $this->statusMap[$i] ?? (string)$v;
    }

    private function computeTotal(Order $o): float
    {
        $o->loadMissing('details');
        return (float) $o->details->sum(function ($d) {
            $amount = $d->amount ?? ((float)$d->price * (int)$d->qty);
            $disc   = $d->discount ?? 0;
            return max(0, $amount - $disc);
        });
    }

    private function decorate(Order $o): Order
    {
        $o->setAttribute('status_text', $this->statusToText($o->status));
        $o->setAttribute('total', $this->computeTotal($o));
        return $o;
    }

    /* ===================== CART (session-based) ===================== */
    
    /**
     * Lấy giỏ hàng từ session
     * @return array {items: [], updated_at: string}
     */
    private function getCart(): array
    {
        return session('cart', ['items' => [], 'updated_at' => now()->toDateTimeString()]);
    }

    /**
     * Lưu giỏ hàng vào session
     * @param array $cart
     */
    private function saveCart(array $cart): void
    {
        $cart['updated_at'] = now()->toDateTimeString();
        session(['cart' => $cart]);
        session()->save();
    }

    /**
     * Tính tổng tiền giỏ hàng và áp lại coupon (nếu đang lưu trong session)
     * @return array {subtotal, discount, total, applied_coupon?}
     */
    private function summarizeCart(array $items): array
    {
        $subtotal = 0.0;
        foreach ($items as $it) {
            $subtotal += ((float)($it['price'] ?? 0)) * ((int)($it['qty'] ?? 0));
        }

        $discountAmount = 0.0;
        $applied = session('applied_coupon'); // {coupon_id, code, discount_amount, ...}

        if ($applied && !empty($applied['coupon_id'])) {
            try {
                if ($coupon = Coupon::find($applied['coupon_id'])) {
                    // rút user cho rule usage_per_customer
                    $userId = null;
                    if (auth()->check()) {
                        $userId = auth()->id();
                    }
                    // Nếu route public mang bearer token
                    if (!$userId && request() && ($tok = request()->bearerToken())) {
                        if ($pat = PersonalAccessToken::findToken($tok)) {
                            $userId = (int)$pat->tokenable_id;
                        }
                    }
                    $check = $coupon->canUseByCustomer($userId);
                    if ($check['valid']) {
                        $calc = $coupon->calculateDiscount($subtotal, $items);
                        if ($calc['valid']) {
                            $discountAmount = (float)$calc['discount_amount'];
                            // sync lại thông tin để FE nhìn thấy message mới nhất
                            $applied['discount_amount'] = $discountAmount;
                            $applied['message'] = $calc['message'];
                            session(['applied_coupon' => $applied]);
                            session()->save();
                        } else {
                            // Nếu không còn đủ điều kiện thì gỡ coupon
                            session()->forget('applied_coupon');
                            session()->save();
                            $applied = null;
                        }
                    } else {
                        session()->forget('applied_coupon');
                        session()->save();
                        $applied = null;
                    }
                } else {
                    session()->forget('applied_coupon');
                    session()->save();
                    $applied = null;
                }
            } catch (\Throwable $e) {
                // Không làm hỏng giỏ hàng nếu có lỗi khi tính lại coupon
                \Log::warning('summarizeCart coupon error: '.$e->getMessage());
            }
        }

        $total = max(0, $subtotal - $discountAmount);
        return [
            'subtotal' => $subtotal,
            'discount' => $discountAmount,
            'total' => $total,
            'applied_coupon' => $applied
        ];
    }

    /**
     * GET /api/v1/cart
     * Lấy danh sách sản phẩm trong giỏ hàng
     */
    public function cartIndex()
    {
        $cart = $this->getCart();
        $summary = $this->summarizeCart($cart['items']);
        return response()->json([
            'items' => $cart['items'],
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    /**
     * POST /api/v1/cart/add
     * Thêm sản phẩm vào giỏ hàng
     * Body: {product_id, name, price, qty, image}
     */
    public function cartAdd(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'qty' => 'required|integer|min:1|max:99',
            'image' => 'nullable|string|max:500',
        ]);

        $cart = $this->getCart();
        $items = $cart['items'];
        $productId = (int)$data['product_id'];

        // Tìm sản phẩm đã có trong giỏ hàng
        $foundIndex = -1;
        foreach ($items as $index => $item) {
            if ((int)($item['product_id'] ?? 0) === $productId) {
                $foundIndex = $index;
                break;
            }
        }

        if ($foundIndex >= 0) {
            // Cập nhật số lượng nếu sản phẩm đã có
            $items[$foundIndex]['qty'] = (int)$items[$foundIndex]['qty'] + (int)$data['qty'];
            // Giới hạn số lượng tối đa 99
            if ($items[$foundIndex]['qty'] > 99) {
                $items[$foundIndex]['qty'] = 99;
            }
        } else {
            // Thêm sản phẩm mới
            $items[] = [
                'product_id' => $productId,
                'name' => $data['name'],
                'price' => (float)$data['price'],
                'qty' => (int)$data['qty'],
                'image' => $data['image'] ?? null,
            ];
        }

        $cart['items'] = array_values($items);
        $this->saveCart($cart);

        $summary = $this->summarizeCart($cart['items']);
        return response()->json([
            'success' => true,
            'message' => 'Đã thêm sản phẩm vào giỏ hàng',
            'items' => $cart['items'],
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    /**
     * PUT /api/v1/cart/update
     * Cập nhật số lượng sản phẩm trong giỏ hàng
     * Body: {product_id, qty}
     */
    public function cartUpdate(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'qty' => 'required|integer|min:1|max:99',
        ]);

        $cart = $this->getCart();
        $items = $cart['items'];
        $productId = (int)$data['product_id'];
        $newQty = (int)$data['qty'];

        $updated = false;
        foreach ($items as &$item) {
            if ((int)($item['product_id'] ?? 0) === $productId) {
                $item['qty'] = $newQty;
                $updated = true;
                break;
            }
        }

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm trong giỏ hàng',
            ], 404);
        }

        $cart['items'] = array_values($items);
        $this->saveCart($cart);

        $summary = $this->summarizeCart($cart['items']);
        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật số lượng',
            'items' => $cart['items'],
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    /**
     * DELETE /api/v1/cart/items/{id}
     * Xóa sản phẩm khỏi giỏ hàng
     */
    public function cartRemove($id)
    {
        $cart = $this->getCart();
        $items = $cart['items'];
        $productId = (int)$id;

        $items = array_filter($items, function($item) use ($productId) {
            return (int)($item['product_id'] ?? 0) !== $productId;
        });

        $cart['items'] = array_values($items);
        $this->saveCart($cart);

        $summary = $this->summarizeCart($cart['items']);
        return response()->json([
            'success' => true,
            'message' => 'Đã xóa sản phẩm khỏi giỏ hàng',
            'items' => $cart['items'],
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    /**
     * POST /api/v1/cart/clear
     * Xóa toàn bộ giỏ hàng
     */
    public function cartClear()
    {
        session()->forget('cart');
        session()->save();

        // clear coupon cùng lúc
        session()->forget('applied_coupon');
        session()->save();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa toàn bộ giỏ hàng',
            'items' => [],
            'subtotal' => 0,
            'discount' => 0,
            'total' => 0,
            'applied_coupon' => null,
        ]);
    }

    /* ===================== ORDERS ===================== */

    /**
     * POST /api/v1/cart/apply-coupon
     * Body: { code: string }
     */
    public function cartApplyCoupon(Request $request)
    {
        $payload = $request->validate([
            'code' => 'required|string|max:50',
        ]);

        $cart = $this->getCart();
        $items = $cart['items'];

        // rút user
        $userId = null;
        if ($request->user()) {
            $userId = (int)$request->user()->id;
        } elseif ($token = $request->bearerToken()) {
            if ($pat = PersonalAccessToken::findToken($token)) {
                $userId = (int)$pat->tokenable_id;
            }
        }

        $coupon = Coupon::where('code', strtoupper(trim($payload['code'])))->first();
        if (!$coupon) {
            return response()->json(['success' => false, 'message' => 'Mã giảm giá không tồn tại.'], 200);
        }

        $check = $coupon->canUseByCustomer($userId, null, null, $items);
        if (!$check['valid']) {
            return response()->json(['success' => false, 'message' => $check['message']], 200);
        }

        $summary = $this->summarizeCart($items);
        $calc = $coupon->calculateDiscount($summary['subtotal'], $items);
        if (!$calc['valid']) {
            return response()->json(['success' => false, 'message' => $calc['message']], 200);
        }

        $applied = [
            'coupon_id' => $coupon->id,
            'code' => $coupon->code,
            'name' => $coupon->name,
            'discount_type' => $coupon->discount_type,
            'discount_amount' => $calc['discount_amount'],
            'message' => $calc['message'],
            'free_ship' => $coupon->discount_type === 'free_ship',
        ];
        session(['applied_coupon' => $applied]);
        session()->save();

        // trả về cart + tổng mới
        $summary = $this->summarizeCart($items);
        return response()->json([
            'success' => true,
            'message' => $applied['message'] ?: 'Áp dụng mã thành công!',
            'items' => $items,
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    /**
     * POST /api/v1/cart/remove-coupon
     */
    public function cartRemoveCoupon()
    {
        $cart = $this->getCart();
        session()->forget('applied_coupon');
        session()->save();

        $summary = $this->summarizeCart($cart['items']);
        return response()->json([
            'success' => true,
            'message' => 'Đã gỡ mã giảm giá',
            'items' => $cart['items'],
            'updated_at' => $cart['updated_at'],
            'subtotal' => $summary['subtotal'],
            'discount' => $summary['discount'],
            'total' => $summary['total'],
            'applied_coupon' => $summary['applied_coupon'],
        ]);
    }

    // GET /api/v1/orders?per_page=20
    public function index(Request $request)
    {
        $per = max(1, (int)$request->query('per_page', 20));
        $rows = Order::with('details')->orderByDesc('id')->paginate($per);
        $rows->getCollection()->transform(fn($o) => $this->decorate($o));
        return response()->json($rows);
    }

    /**
     * POST /api/v1/orders
     * - Public: cho phép khách vãng lai
     * - Nếu có Bearer token: gắn user_id vào order
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id'   => 'nullable|integer',
            'name'      => 'required|string|max:191',
            'email'     => 'nullable|email|max:191',
            'phone'     => 'required|string|max:50',
            'address'   => 'required|string',
            'note'      => 'nullable|string',
            'payment_method' => 'required|string',
            'coupon_id' => 'nullable|integer',
            'coupon_code' => 'nullable|string|max:50',
            'items'     => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer',
            'items.*.name'       => 'nullable|string|max:191',
            'items.*.qty'        => 'required|integer|min:1',
            'items.*.price'      => 'required|numeric|min:0',
        ]);

        // ✅ rút user từ Bearer token dù route public
        $userId = null;
        if ($token = $request->bearerToken()) {
            if ($pat = PersonalAccessToken::findToken($token)) {
                $userId = $pat->tokenable_id;
            }
        }
        if (!$userId && !empty($data['user_id'])) {
            $userId = (int)$data['user_id']; // guest có thể gửi user_id thủ công (nếu cần)
        }

        $code = 'DOLA-'.Str::upper(Str::random(6));

        // Calculate subtotal first for coupon validation
        $subtotal = 0;
        foreach ($data['items'] as $it) {
            $subtotal += (float)$it['price'] * (int)$it['qty'];
        }

        $discountAmount = 0;
        $couponId = null;
        $couponCodeValue = null;

        // Handle coupon if provided
        if (!empty($data['coupon_id']) && !empty($data['coupon_code'])) {
            try {
                $coupon = \App\Models\Coupon::find($data['coupon_id']);
                if ($coupon && $coupon->code === $data['coupon_code']) {
                    // Validate coupon can be used
                    $customerCheck = $coupon->canUseByCustomer($userId, $data['email'] ?? null, $data['phone'] ?? null);
                    if ($customerCheck['valid']) {
                        // Calculate discount
                        $discountResult = $coupon->calculateDiscount($subtotal);
                        if ($discountResult['valid']) {
                            $discountAmount = $discountResult['discount_amount'];
                            $couponId = $coupon->id;
                            $couponCodeValue = $coupon->code;
                        }
                    }
                }
            } catch (\Exception $e) {
                \Log::error("Coupon validation error: " . $e->getMessage());
            }
        }

        $finalTotal = max(0, $subtotal - $discountAmount);

        $o = Order::create([
            'user_id'        => $userId,
            'name'           => $data['name'],
            'email'          => $data['email'] ?? null,
            'phone'          => $data['phone'],
            'address'        => $data['address'],
            'note'           => $data['note'] ?? null,
            'payment_method' => $data['payment_method'],
            'coupon_id'     => $couponId,
            'coupon_code'   => $couponCodeValue,
            'discount_amount' => $discountAmount,
            'total'          => $finalTotal,
            'status'         => 0, // pending
            'created_at'     => Carbon::now(),
            'created_by'     => $userId ?? optional(auth())->id,
        ]);

        foreach ($data['items'] as $it) {
            $qty   = (int)$it['qty'];
            $price = (float)$it['price'];
            $productId = $it['product_id'] ?? null;
            
            OrderDetail::create([
                'order_id'   => $o->id,
                'product_id' => $productId,
                'name'       => $it['name'] ?? null,
                'qty'        => $qty,
                'price'      => $price,
                'amount'     => $qty * $price,
                'discount'   => 0,
            ]);
            
            // ✅ GIỮ CHỖ TỒN KHO KHI ĐẶT HÀNG (RESERVE)
            if ($productId) {
                try {
                    $product = Product::find($productId);
                    if ($product) {
                        $product->reserveStock($qty, 'ORDER', $o->id, "Giữ chỗ đơn hàng #{$code}");
                    }
                } catch (\Exception $e) {
                    // Log lỗi nhưng không chặn đơn hàng
                    \Log::error("Failed to decrease stock for product {$productId}: " . $e->getMessage());
                }
            }
        }

        // Record coupon usage if applied
        if ($couponId) {
            try {
                CouponController::recordUsage(
                    $couponId,
                    $o->id,
                    $userId,
                    $data['email'] ?? null,
                    $data['phone'] ?? null,
                    $subtotal,
                    $discountAmount
                );
            } catch (\Exception $e) {
                \Log::error("Failed to record coupon usage: " . $e->getMessage());
            }
        }

        // Dọn giỏ hàng BE
        try { session()->forget('cart'); session()->save(); } catch (\Throwable $e) {}

        // Thuộc tính bổ sung trả về cho FE
        $o->setAttribute('code', $code);
        $o->setAttribute('admin_url', url('/admin/orders/'.$o->id));
        $o->setAttribute('customer_url', url('/orders/'.$o->id));

        // Gửi email xác nhận (không chặn luồng nếu lỗi)
        try {
            $order = $this->decorate($o->load('details'));
            $total = number_format($order->total, 0, ',', '.').'đ';

            $html = '<h2>Đặt hàng thành công</h2>'.
                    '<p><strong>Mã đơn:</strong> '.$code.'</p>'.
                    '<p><strong>Khách hàng:</strong> '.e($order->name).'</p>'.
                    '<p><strong>Điện thoại:</strong> '.e($order->phone).'</p>'.
                    '<p><strong>Địa chỉ:</strong> '.e($order->address).'</p>'.
                    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:10px">'.
                    '<thead><tr><th align="left">Sản phẩm</th><th>SL</th><th align="right">Đơn giá</th><th align="right">Thành tiền</th></tr></thead><tbody>';

            foreach ($order->details as $d) {
                $html .= '<tr>'.
                        '<td>'.e($d->name ?? ('#'.$d->product_id)).'</td>'.
                        '<td align="center">'.(int)$d->qty.'</td>'.
                        '<td align="right">'.number_format((float)$d->price, 0, ',', '.').'đ'.'</td>'.
                        '<td align="right">'.number_format((float)$d->amount, 0, ',', '.').'đ'.'</td>'.
                        '</tr>';
            }
            $html .= '</tbody></table>'.
                     '<p style="margin-top:10px"><strong>Tổng cộng:</strong> '.$total.'</p>'.
                     '<p>Cảm ơn bạn đã mua hàng tại Dola Bakery!</p>';

            if (!empty($order->email)) {
                Mail::html($html, function ($m) use ($order, $code) {
                    $m->to($order->email, $order->name)
                      ->subject('[Dola] Xác nhận đơn hàng '.$code);
                });
            }
        } catch (\Throwable $e) {
            // ignore
        }

        return response()->json($this->decorate($o->load('details')), 201);
    }

    // GET /api/v1/orders/{id}
    public function show(int $id)
    {
        $o = Order::with('details')->findOrFail($id);
        return response()->json($this->decorate($o));
    }

    // PUT /api/v1/orders/{id}
    public function update(Request $request, int $id)
    {
        $o = Order::findOrFail($id);
        $oldStatus = (int)($o->status ?? 0);
        $payload = $request->only(['name','email','phone','address','note','payment_method','status']);
        if (array_key_exists('status', $payload)) {
            $payload['status'] = $this->statusToInt($payload['status']);
        }
        $o->fill($payload);
        $o->updated_at = Carbon::now();
        $o->updated_by = optional(auth())->id;
        $o->save();

        // 🔹 Commit tồn kho khi đơn chuyển sang delivered (3)
        try {
            $newStatus = (int)($o->status ?? 0);
            if ($newStatus === 3 && $oldStatus !== 3) {
                $o->loadMissing('details');
                foreach ($o->details as $d) {
                    if ($d->product_id && $d->qty > 0) {
                        if ($p = Product::find($d->product_id)) {
                            $p->commitReserved('ORDER', $o->id);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('Commit reserved stock on delivered failed: '.$e->getMessage());
        }

        // 🔹 Membership: khi trạng thái chuyển sang delivered (3) hoặc rời khỏi 3 → tính lại
        try {
            if ($o->user_id && ($newStatus === 3 || $oldStatus === 3)) {
                $customer = \App\Models\Customer::where('user_id', $o->user_id)->first();
                if ($customer) {
                    $customer->recomputeMembership('amount', 'lifetime');
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed to recompute membership after order update: '.$e->getMessage());
        }

        return response()->json($this->decorate($o->load('details')));
    }

    // DELETE /api/v1/orders/{id} => soft delete
    public function destroy(int $id)
    {
        $o = Order::findOrFail($id);
        $o->delete(); // cần SoftDeletes & deleted_at trong bảng
        return response()->json(['message' => 'Trashed']);
    }

    // POST /api/v1/orders/{id}/cancel
    public function cancel(int $id)
    {
        $o = Order::with('details')->findOrFail($id);
        $oldStatus = (int)($o->status ?? 0);
        $o->status = 4; // cancelled
        // nếu admin gọi endpoint này thì đánh dấu bởi admin
        $o->canceled_by = 'admin';
        $o->canceled_at = Carbon::now();
        $o->updated_at  = Carbon::now();
        $o->save();
        // ✅ Chỉ hoàn tồn nếu trước đó chưa ở trạng thái cancelled
        if ($oldStatus !== 4) {
            foreach ($o->details as $d) {
                if ($d->product_id && $d->qty > 0) {
                    try {
                        if ($p = Product::find($d->product_id)) {
                            $p->releaseStock((int)$d->qty, 'ORDER', $o->id, 'Hoàn tồn do huỷ đơn (admin)');
                        }
                    } catch (\Throwable $e) {
                        \Log::warning('Release stock failed on admin cancel: '.$e->getMessage());
                    }
                }
            }
        }
        return response()->json(['message' => 'Cancelled']);
    }

    // GET /api/v1/orders/{id}/details
    public function details(int $id)
    {
        $o = Order::with('details')->findOrFail($id);
        return response()->json($o->details);
    }

    /**
     * POST /api/v1/orders/purge
     * body: { statuses?: [3,4], older_than_days?: number }
     */
    public function purge(Request $request)
    {
        $statuses = $request->input('statuses', [3,4]);
        $olderThanDays = max(0, (int)$request->input('older_than_days', 0));

        $q = Order::query()->whereIn('status', $statuses);
        if ($olderThanDays > 0) {
            $q->where('created_at', '<', now()->subDays($olderThanDays));
        }

        $ids = $q->pluck('id');
        if ($ids->count()) {
            Order::whereIn('id', $ids)->delete(); // soft delete
        }

        return response()->json(['deleted_orders' => $ids->values(), 'count' => $ids->count()]);
    }

    /* ===================== MY ORDERS (customer) ===================== */

    // GET /api/v1/orders/my (auth:sanctum)
    public function myOrders(Request $r)
    {
        $user = $r->user();
        if (!$user) return response()->json(['message'=>'Unauthenticated'], 401);

        $per  = max(1, (int)$r->query('per_page', 20));
        $rows = Order::with('details')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->paginate($per);

        $rows->getCollection()->transform(fn($o) => $this->decorate($o));
        return response()->json($rows);
    }

    // GET /api/v1/orders/my/{id} (auth:sanctum)
    public function myOrderDetail(Request $r, int $id)
    {
        $user = $r->user();
        if (!$user) return response()->json(['message'=>'Unauthenticated'], 401);

        $o = Order::with('details')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        return response()->json($this->decorate($o));
    }

    // POST /api/v1/orders/my/{id}/cancel (auth:sanctum)
    public function cancelMine(Request $r, int $id)
    {
        $user = $r->user();
        if (!$user) return response()->json(['message'=>'Unauthenticated'], 401);

        $o = Order::with('details')->where('id', $id)->where('user_id', $user->id)->firstOrFail();

        // chỉ cho hủy khi pending/processing
        if (!in_array((int)$o->status, [0,1], true)) {
            return response()->json(['message'=>'Đơn đã qua bước xác nhận, không thể huỷ'], 422);
        }

        // rule: chỉ được huỷ trong vòng 12 giờ sau khi đặt
        $createdAt = $o->created_at ? Carbon::parse($o->created_at) : null;
        if ($createdAt && Carbon::now()->greaterThan($createdAt->copy()->addHours(12))) {
            return response()->json(['message'=>'Bạn chỉ có thể huỷ trong 12 giờ sau khi đặt.'], 422);
        }

        // lấy lý do huỷ (tuỳ chọn), FE sẽ gửi { reason: string }
        $reason = (string) $r->input('reason', '');
        if (mb_strlen($reason) > 500) {
            $reason = mb_substr($reason, 0, 500);
        }

        $oldStatus = (int)($o->status ?? 0);
        $o->status        = 4; // cancelled
        $o->cancel_reason = $reason ?: null;
        $o->canceled_by   = 'customer';
        $o->canceled_at   = Carbon::now();
        $o->updated_at    = Carbon::now();
        $o->save();

        // ✅ Hoàn tồn nếu vừa chuyển sang cancelled
        if ($oldStatus !== 4) {
            foreach ($o->details as $d) {
                if ($d->product_id && $d->qty > 0) {
                    try {
                        if ($p = Product::find($d->product_id)) {
                            $p->releaseStock((int)$d->qty, 'ORDER', $o->id, 'Hoàn tồn do khách huỷ');
                        }
                    } catch (\Throwable $e) {
                        \Log::warning('Release stock failed on customer cancel: '.$e->getMessage());
                    }
                }
            }
        }

        return response()->json(['message' => 'Đã huỷ đơn hàng', 'order'=> $this->decorate($o)]);
    }
}
