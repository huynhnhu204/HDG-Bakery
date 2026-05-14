<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // ✅ thêm

class Order extends Model
{
    use SoftDeletes; // ✅ bật soft delete

    protected $table = 'orders';
    public $timestamps = false;

    protected $fillable = [
        'user_id','name','email','phone','address','note',
        'payment_method','status','created_at','created_by',
        'updated_at','updated_by','total',
        'coupon_id','coupon_code','discount_amount',
        // cancellation fields
        'cancel_reason','canceled_by','canceled_at',
    ];

    protected $casts = [
        'user_id'    => 'int',
        'status'     => 'int',
        'total'      => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime', // ✅ cast thêm
        'coupon_id'  => 'int',
        'discount_amount' => 'float',
        'canceled_at' => 'datetime',
    ];

    public function details()
    {
        return $this->hasMany(OrderDetail::class, 'order_id');
    }

    public function coupon()
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }
}
