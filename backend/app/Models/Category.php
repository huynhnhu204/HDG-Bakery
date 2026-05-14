<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'category';
    
    // ✅ Timestamps được quản lý thủ công (created_at, updated_at trong DB)
    public $timestamps = false;

    protected $fillable = [
        'name','slug','image','parent_id','sort_order',
        'description','status','created_at','created_by','updated_at','updated_by'
    ];

    // ✅ Casts cho các field
    protected $casts = [
        'parent_id'  => 'integer',
        'sort_order' => 'integer',
        'status'     => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    // ✅ Accessor cho image URL (giống Product model)
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

    // ✅ Relationships
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
    
    // ✅ Scope để lọc category active
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
    
    // ✅ Scope để lọc category có parent_id cụ thể
    public function scopeByParent($query, $parentId = 0)
    {
        return $query->where('parent_id', $parentId);
    }
}
