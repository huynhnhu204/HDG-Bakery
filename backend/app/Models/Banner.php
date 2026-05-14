<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Banner extends Model
{
    protected $table = 'banner';
    public $timestamps = false;

    protected $fillable = [
        'name','image','link','position','sort_order',
        'description','created_at','created_by','updated_at',
        'updated_by','status',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image) return null;
        if (Str::startsWith($this->image, ['http://', 'https://'])) {
            return $this->image;
        }
        return asset($this->image);
    }
}
