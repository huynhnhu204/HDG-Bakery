<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CouponUsage extends Model
{
    protected $table = 'coupon_usage';
    public $timestamps = true;

    protected $fillable = [
        'coupon_id', 'order_id', 'user_id', 'email', 'phone',
        'order_amount', 'discount_amount'
    ];

    protected $casts = [
        'order_amount' => 'float',
        'discount_amount' => 'float',
    ];

    // Relations
    public function coupon()
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}


