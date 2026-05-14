<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockInItem extends Model
{
    protected $table = 'stock_in_items';

    protected $fillable = [
        'stock_in_id','product_id','qty','price','amount'
    ];

    public function product() {
        return $this->belongsTo(Product::class,'product_id');
    }

    public function stockIn() {
        return $this->belongsTo(StockIn::class,'stock_in_id');
    }
}
