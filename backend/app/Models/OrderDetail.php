<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderDetail extends Model
{
    // Bảng hiện hữu: 'orderdetail' (không timestamps)
    protected $table = 'orderdetail';
    public $timestamps = false;

    // Nếu khoá chính KHÔNG phải 'id' thì khai báo thêm:
    // protected $primaryKey = 'id'; // sửa nếu khác

    protected $fillable = [
        'order_id',
        'product_id',
        'variant_id',
        'variant_name',
        'variant_weight',
        'name',
        'qty',
        'price',
        'amount',
        'discount',
    ];

    protected $casts = [
        'order_id'   => 'int',
        'product_id' => 'int',
        'variant_id' => 'int',
        'variant_weight' => 'int',
        'qty'        => 'int',
        'price'      => 'float',
        'amount'     => 'float',
        'discount'   => 'float',
    ];

    // Quan hệ
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
