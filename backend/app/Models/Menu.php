<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $table = 'menu';
    
    // ✅ Timestamps được quản lý thủ công (created_at, updated_at trong DB)
    public $timestamps = false;

    protected $fillable = [
        'name','link','type','parent_id','sort_order','table_id','position',
        'created_at','created_by','updated_at','updated_by','status'
    ];

    // ✅ Casts cho các field
    protected $casts = [
        'parent_id'  => 'integer',
        'sort_order' => 'integer',
        'table_id'   => 'integer',
        'status'     => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    // ✅ Relationships
    public function parent()
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Menu::class, 'parent_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
    
    // ✅ Scope để lọc menu active
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
    
    // ✅ Scope để lọc theo position
    public function scopeByPosition($query, $position)
    {
        return $query->where('position', $position);
    }
    
    // ✅ Scope để lọc theo type
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }
    
    // ✅ Scope để lọc menu có parent_id cụ thể
    public function scopeByParent($query, $parentId = 0)
    {
        return $query->where('parent_id', $parentId);
    }
}
