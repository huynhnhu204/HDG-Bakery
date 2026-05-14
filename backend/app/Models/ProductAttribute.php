<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttribute extends Model
{
    protected $table = 'product_attribute';
    public $timestamps = false;

    protected $fillable = ['product_id','attribute_id','value'];
    
    public function attribute()
    {
        return $this->belongsTo(Attribute::class, 'attribute_id');
    }
    
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
