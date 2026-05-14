<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductStore extends Model
{
    protected $table = 'product_store';
    public $timestamps = false;

    protected $fillable = [
        'product_id','price_root','qty',
        'type','ref_type','ref_id','note',
        'created_at','created_by','updated_at','updated_by','status'
    ];

    protected $casts = [
        'price_root' => 'float',
        'qty'        => 'int',
        'status'     => 'int',
    ];
}
