<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $table = 'post'; // sửa nếu DB là 'posts'
    public $timestamps = true;

    protected $fillable = [
        'topic_id',
        'title','slug','image','content','description',
        'post_type','created_by','updated_by','status'
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image
            ? (str_starts_with($this->image, 'http') ? $this->image : asset($this->image))
            : null;
    }

    public function topic()
    {
        return $this->belongsTo(Topic::class, 'topic_id');
    }
}
