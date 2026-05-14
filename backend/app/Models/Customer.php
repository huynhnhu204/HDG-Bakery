<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;

    protected $table = 'customers';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'address',
        'birthday',
        'gender',          // male|female|other|null
        'group',           // VIP/Normal...
        'source',
        'tags',
        'owner',
        'note',
        'points',
        'level',           // lưu RFM gộp, ví dụ "532"
        'benefit_note',
        'email_verified',
        'allow_email',
        'allow_sms',
        'consent_note',
        'cmnd',
        'documents',
        'vip_level',       // 0..10
        'status',          // 0/1
        'created_by',
        'updated_by',
        // 🔹 Membership
        'total_orders',
        'total_spent',
        'membership_level',
        'membership_label',
        'membership_changed_at',
    ];

    protected $casts = [
        'birthday'       => 'date',
        'email_verified' => 'boolean',
        'allow_email'    => 'boolean',
        'allow_sms'      => 'boolean',
        'vip_level'      => 'integer',
        'status'         => 'integer',
        'deleted_at'     => 'datetime',
        'membership_changed_at' => 'datetime',
    ];

    /** Quan hệ ngược: Customer thuộc về User */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Recalculate totals and determine membership level.
     * - modeCriterion: 'amount' | 'orders'
     * - window: 'lifetime' | '12m'
     * - thresholds: array of levels with min values ascending
     */
    public function recomputeMembership(
        string $modeCriterion = 'amount',
        string $window = 'lifetime',
        array $thresholds = null
    ): void {
        if (!$this->user_id) {
            // guest customer without user link: skip
            return;
        }

        // Defaults (VNĐ)
        $thresholds = $thresholds ?? [
            ['key' => 'dong',    'label' => 'Đồng',     'min' => 0],
            ['key' => 'bac',     'label' => 'Bạc',      'min' => 1_000_000],
            ['key' => 'vang',    'label' => 'Vàng',     'min' => 3_000_000],
            ['key' => 'bachkim', 'label' => 'Bạch Kim', 'min' => 7_000_000],
        ];

        $validStatuses = [3]; // only delivered = paid

        try {
            // Debug: Log để kiểm tra
            \Log::info('Customer::recomputeMembership - Starting', [
                'user_id' => $this->user_id,
                'customer_id' => $this->id,
                'window' => $window,
                'valid_statuses' => $validStatuses,
            ]);

            // Debug: Kiểm tra tất cả orders của user (không phân biệt status)
            $allOrdersQuery = \DB::table('orders as o')
                ->where('o.user_id', $this->user_id)
                ->whereNull('o.deleted_at'); // Loại bỏ soft deleted
            $allOrders = $allOrdersQuery->select('o.id', 'o.status', 'o.total', 'o.created_at')->get();
            $allOrdersByStatus = $allOrders->groupBy('status');
            \Log::info('Customer::recomputeMembership - All orders check', [
                'user_id' => $this->user_id,
                'total_orders' => $allOrders->count(),
                'by_status' => $allOrdersByStatus->map(fn($g) => $g->count())->toArray(),
                'orders' => $allOrders->map(fn($o) => [
                    'id' => $o->id,
                    'status' => $o->status,
                    'total' => $o->total,
                ])->toArray(),
            ]);

            $qb = \DB::table('orders as o')
                ->where('o.user_id', $this->user_id)
                ->whereNull('o.deleted_at') // Loại bỏ soft deleted
                ->whereIn('o.status', $validStatuses);

            if ($window === '12m') {
                $twelveMonthsAgo = now()->subMonthsNoOverflow(12);
                $qb->where('o.created_at', '>=', $twelveMonthsAgo);
            }

            // Sum from order_details if available, else fallback to orders.total
            $sumQuery = \DB::table('orders as o')
                ->leftJoin('order_details as od', 'od.order_id', '=', 'o.id')
                ->where('o.user_id', $this->user_id)
                ->whereNull('o.deleted_at') // Loại bỏ soft deleted
                ->whereIn('o.status', $validStatuses);
            if ($window === '12m') {
                $twelveMonthsAgo = now()->subMonthsNoOverflow(12);
                $sumQuery->where('o.created_at', '>=', $twelveMonthsAgo);
            }

            // Đếm số đơn đã hoàn tất (status = 3/delivered)
            $row = $qb->selectRaw('COUNT(DISTINCT o.id) as order_count')->first();
            $orderCount = (int)($row->order_count ?? 0);
            
            // Debug: Log số đơn tìm được
            \Log::info('Customer::recomputeMembership - Order count (delivered)', [
                'user_id' => $this->user_id,
                'order_count' => $orderCount,
                'raw_row' => $row,
                'status_filter' => $validStatuses,
            ]);

            // Tính tổng tiền từ các đơn đã hoàn tất (status = 3/delivered)
            // Ưu tiên: Tính từ order_details (chính xác hơn)
            // Fallback: Tính từ orders.total nếu không có order_details
            
            // Method 1: Tính từ order_details (chính xác nhất)
            $sumRow = $sumQuery->selectRaw('
                COALESCE(
                    SUM(GREATEST(0, 
                        COALESCE(od.amount, COALESCE(od.price, 0) * COALESCE(od.qty, 0), 0) - 
                        COALESCE(od.discount, 0)
                    )),
                    0
                ) as total_from_details
            ')->first();
            $totalFromDetails = (int) round((float)($sumRow->total_from_details ?? 0));

            // Method 2: Tính từ orders.total (fallback)
            $fallbackQuery = \DB::table('orders as o')
                ->where('o.user_id', $this->user_id)
                ->whereNull('o.deleted_at') // Loại bỏ soft deleted
                ->whereIn('o.status', $validStatuses);
            if ($window === '12m') {
                $twelveMonthsAgo = now()->subMonthsNoOverflow(12);
                $fallbackQuery->where('o.created_at', '>=', $twelveMonthsAgo);
            }
            $fallbackRow = $fallbackQuery->selectRaw('COALESCE(SUM(COALESCE(o.total, 0)), 0) as total_from_orders')->first();
            $totalFromOrders = (int) round((float)($fallbackRow->total_from_orders ?? 0));

            // Sử dụng total_from_details nếu > 0, ngược lại dùng total_from_orders
            // Nếu cả hai đều = 0, có thể là do không có order_details hoặc orders.total = null
            $totalAmount = $totalFromDetails > 0 ? $totalFromDetails : $totalFromOrders;
            
            // Debug: Log tổng tiền tính được
            \Log::info('Customer::recomputeMembership - Total amount (delivered orders only)', [
                'user_id' => $this->user_id,
                'total_from_details' => $totalFromDetails,
                'total_from_orders' => $totalFromOrders,
                'final_total_amount' => $totalAmount,
                'order_count' => $orderCount,
                'note' => 'Chỉ tính các đơn có status = 3 (delivered/hoàn tất)',
            ]);
            
            // Debug: Kiểm tra chi tiết các đơn delivered
            $deliveredOrders = \DB::table('orders as o')
                ->where('o.user_id', $this->user_id)
                ->whereNull('o.deleted_at')
                ->whereIn('o.status', $validStatuses)
                ->select('o.id', 'o.status', 'o.total', 'o.created_at')
                ->get();
            \Log::info('Customer::recomputeMembership - Delivered orders details', [
                'user_id' => $this->user_id,
                'delivered_orders_count' => $deliveredOrders->count(),
                'orders' => $deliveredOrders->map(fn($o) => [
                    'id' => $o->id,
                    'status' => $o->status,
                    'total' => $o->total,
                    'created_at' => $o->created_at,
                ])->toArray(),
            ]);
        } catch (\Throwable $e) {
            \Log::error('Customer::recomputeMembership - Database query failed: ' . $e->getMessage(), [
                'user_id' => $this->user_id,
                'customer_id' => $this->id,
                'trace' => $e->getTraceAsString(),
            ]);
            // Use existing values if query fails
            $orderCount = (int)($this->total_orders ?? 0);
            $totalAmount = (int)($this->total_spent ?? 0);
        }

        // Determine level
        $levelKey = 'dong';
        $levelLabel = 'Đồng';
        if ($modeCriterion === 'orders') {
            // interpret thresholds .min as number of orders
            foreach ($thresholds as $t) {
                if ($orderCount >= (int)$t['min']) { $levelKey = $t['key']; $levelLabel = $t['label']; }
            }
        } else {
            foreach ($thresholds as $t) {
                if ($totalAmount >= (int)$t['min']) { $levelKey = $t['key']; $levelLabel = $t['label']; }
            }
        }

        $changed = false;
        $oldOrders = (int)($this->total_orders ?? 0);
        $oldSpent = (int)($this->total_spent ?? 0);
        $oldLevel = $this->membership_level ?? 'dong';
        $oldLabel = $this->membership_label ?? 'Đồng';
        
        if ($oldOrders !== $orderCount) { 
            $this->total_orders = $orderCount; 
            $changed = true; 
        }
        if ($oldSpent !== $totalAmount) { 
            $this->total_spent = $totalAmount; 
            $changed = true; 
        }
        if ($oldLevel !== $levelKey || $oldLabel !== $levelLabel) {
            $this->membership_level = $levelKey;
            $this->membership_label = $levelLabel;
            $this->membership_changed_at = now();
            $changed = true;
        }
        
        if ($changed) {
            $this->save();
            \Log::info('Customer membership updated', [
                'customer_id' => $this->id,
                'user_id' => $this->user_id,
                'old_orders' => $oldOrders,
                'new_orders' => $orderCount,
                'old_spent' => $oldSpent,
                'new_spent' => $totalAmount,
                'old_level' => $oldLevel,
                'new_level' => $levelKey,
                'old_label' => $oldLabel,
                'new_label' => $levelLabel,
            ]);
        }
    }
}
