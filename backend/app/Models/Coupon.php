<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Coupon extends Model
{
    protected $table = 'coupons';
    public $timestamps = true;

    protected $fillable = [
        'name', 'code', 'description',
        'discount_type', 'discount_value', 'max_discount', 'min_order_amount',
        'apply_to', 'category_ids', 'product_ids', 'exclude_product_ids',
        'delivery_method', 'advance_hours',
        'customer_restriction', 'exclude_sale_items',
        'start_date', 'end_date', 'time_restriction',
        'total_usage_limit', 'current_usage_count', 'usage_per_customer', 'allowed_customer_emails',
        'can_stack_with_ship', 'success_message', 'error_message',
        'status', 'created_by', 'updated_by'
    ];

    protected $casts = [
        'discount_value' => 'float',
        'max_discount' => 'float',
        'min_order_amount' => 'float',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'category_ids' => 'array',
        'product_ids' => 'array',
        'exclude_product_ids' => 'array',
        'allowed_customer_emails' => 'array',
        'total_usage_limit' => 'integer',
        'current_usage_count' => 'integer',
        'usage_per_customer' => 'integer',
        'advance_hours' => 'integer',
        'status' => 'integer',
        'exclude_sale_items' => 'boolean',
        'can_stack_with_ship' => 'boolean'
    ];

    // Relations
    public function usages()
    {
        return $this->hasMany(CouponUsage::class, 'coupon_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'coupon_id');
    }

    // Helper: Check if coupon is active
    public function isActive(): bool
    {
        if ($this->status !== 1) {
            return false;
        }

        $now = Carbon::now();
        $start = Carbon::parse($this->start_date);
        $end = Carbon::parse($this->end_date);

        if ($now->lt($start) || $now->gt($end)) {
            return false;
        }

        // Check time restriction (VD: 15:00-17:00)
        if ($this->time_restriction) {
            $parts = explode('-', trim($this->time_restriction));
            if (count($parts) === 2) {
                $startTime = Carbon::parse($now->format('Y-m-d') . ' ' . trim($parts[0]));
                $endTime = Carbon::parse($now->format('Y-m-d') . ' ' . trim($parts[1]));
                
                $currentTime = $now->format('H:i:s');
                if ($currentTime < $startTime->format('H:i:s') || $currentTime > $endTime->format('H:i:s')) {
                    return false;
                }
            }
        }

        // Check usage limit
        if ($this->total_usage_limit > 0 && $this->current_usage_count >= $this->total_usage_limit) {
            return false;
        }

        return true;
    }

    // Check if can be used by customer
    public function canUseByCustomer($userId = null, $email = null, $phone = null, array $cartItems = []): array
    {
        // Check 1: Is active?
        if (!$this->isActive()) {
            return ['valid' => false, 'message' => $this->error_message ?: 'Mã đã hết hạn hoặc không còn hiệu lực.'];
        }

        // Check 2: Allowed emails
        if (is_array($this->allowed_customer_emails) && !empty($this->allowed_customer_emails) && $email) {
            if (!in_array(strtolower(trim($email)), array_map('strtolower', $this->allowed_customer_emails))) {
                return ['valid' => false, 'message' => 'Mã này không áp dụng cho bạn.'];
            }
        }

        // Check 3: Usage per customer
        // Chỉ kiểm tra nếu có giới hạn (usage_per_customer > 0)
        if ($this->usage_per_customer && $this->usage_per_customer > 0) {
            // Nếu không có thông tin nhận diện khách → không thể kiểm tra, nhưng nếu có giới hạn thì từ chối
            if (!$userId && !$email && !$phone) {
                return ['valid' => false, 'message' => 'Vui lòng đăng nhập hoặc cung cấp thông tin để sử dụng mã này.'];
            }
            
            // Đếm số lần sử dụng: ưu tiên userId, nếu không có thì dùng email, nếu không có thì dùng phone
            $usageCount = 0;
            if ($userId) {
                $usageCount = $this->usages()->where('user_id', $userId)->count();
            } elseif ($email) {
                $usageCount = $this->usages()->where('email', $email)->count();
            } elseif ($phone) {
                $usageCount = $this->usages()->where('phone', $phone)->count();
            }

            if ($usageCount >= $this->usage_per_customer) {
                return ['valid' => false, 'message' => 'Bạn đã dùng mã này rồi.'];
            }
        }

        return ['valid' => true];
    }

    // Calculate discount amount
    public function calculateDiscount(float $orderAmount, array $cartItems = []): array
    {
        // Check minimum order amount (chỉ kiểm tra nếu có giá trị > 0)
        if ($this->min_order_amount && $this->min_order_amount > 0 && $orderAmount < $this->min_order_amount) {
            return [
                'valid' => false,
                'message' => $this->error_message ?: "Mã chỉ áp cho đơn từ " . number_format($this->min_order_amount, 0, ',', '.') . "đ.",
                'discount_amount' => 0
            ];
        }

        $discountAmount = 0;

        switch ($this->discount_type) {
            case 'fixed':
                $discountAmount = min($this->discount_value, $orderAmount);
                break;

            case 'percent':
                $discountAmount = ($orderAmount * $this->discount_value) / 100;
                if ($this->max_discount && $discountAmount > $this->max_discount) {
                    $discountAmount = $this->max_discount;
                }
                // Không cho âm
                $discountAmount = min($discountAmount, $orderAmount);
                break;

            case 'free_ship':
                // Trả về flag để FE xử lý
                $discountAmount = 0; // Ship fee sẽ được xử lý ở frontend
                break;
        }

        return [
            'valid' => true,
            'discount_amount' => $discountAmount,
            'message' => $this->success_message ?: "Áp dụng mã thành công!"
        ];
    }
}

