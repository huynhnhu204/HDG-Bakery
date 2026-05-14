<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $table = 'product_variants';

    protected $fillable = [
        'product_id',
        'name',
        'sku',
        'price',
        'price_sale',
        'stock',
        'status',
        'is_default',
        'sort_order',
        'weight_gram',
        'options',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'options' => 'array',
        'status'  => 'boolean',
        'price' => 'float',
        'price_sale' => 'float',
        'is_default' => 'boolean',
        'sort_order' => 'int',
        'weight_gram' => 'int',
    ];

    protected $appends = [
        'effective_price',
    ];

    public function getEffectivePriceAttribute(): float
    {
        $sale = $this->price_sale ?? 0.0;
        $base = $this->price ?? 0.0;
        return ($sale > 0 && $sale < $base) ? $sale : $base;
    }

    // Quan hệ
    public function product() {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
