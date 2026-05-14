<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    protected $fillable = [
        'post_id',
        'name',
        'email',
        'content',
        'status',
        'created_by',
        'updated_by',
    ];

    public function post()
    {
        return $this->belongsTo(Post::class, 'post_id');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 1);
    }
}







