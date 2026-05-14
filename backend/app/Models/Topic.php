<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Topic extends Model
{
    protected $table = 'topic';

    protected $fillable = [
        'name','slug','image','description','sort_order','status',
        'created_by','updated_by'
    ];

    public function posts()
    {
        return $this->hasMany(Post::class, 'topic_id');
    }

    // chỉ bài hiển thị cho FE
    public function visiblePosts()
    {
        return $this->hasMany(Post::class, 'topic_id')
            ->where('status', 1)
            ->where('post_type', 'post');
    }
}
