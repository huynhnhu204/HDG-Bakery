<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
// use Illuminate\Database\Eloquent\SoftDeletes; // Tạm thời tắt vì chưa có cột deleted_at

class ProductImage extends Model
{
    // Tạm thời comment SoftDeletes nếu chưa có cột deleted_at trong database
    // Sau khi chạy SQL script thêm cột deleted_at, bỏ comment lại dòng use SoftDeletes;
    // use SoftDeletes;

    protected $table = 'product_image';
    public $timestamps = true;

    protected $fillable = [
        'product_id', 'image', 'alt', 'title',
        'is_primary', 'sort', 'status',
        'created_by', 'updated_by'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'status'    => 'integer',
        'sort'      => 'integer',
    ];

    // Relationship
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Lấy URL ảnh đầy đủ
     */
    public function getImageUrlAttribute(): ?string
    {
        $src = $this->image;
        if (!$src) return null;

        if (str_starts_with($src, 'http')) {
            return $src;
        }

        // Nếu bắt đầu với storage/, chuyển thành /api/v1/storage/
        if (str_starts_with($src, 'storage/')) {
            return url('/api/v1/' . $src);
        }

        return asset($src);
    }

    /**
     * Scope: Lấy ảnh hiển thị (status = 1)
     */
    public function scopeVisible($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope: Lấy ảnh đại diện
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', 1);
    }

    /**
     * Scope: Sắp xếp theo thứ tự hiển thị (cho storefront)
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('is_primary', 'desc')
                     ->orderBy('sort', 'asc')
                     ->orderBy('id', 'asc');
    }
}
