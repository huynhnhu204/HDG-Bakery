<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $table = 'reviews';

    protected $fillable = [
        'product_id','user_id','order_id','rating','title','content',
        'is_verified','nickname','tags','images','status','pinned',
        'helpful_count','report_count',
        'reply_content','reply_admin_user_id','reply_created_at',
        'created_at','updated_at'
    ];

    protected $casts = [
        'product_id'    => 'int',
        'user_id'       => 'int',
        'order_id'      => 'int',
        'rating'        => 'int',
        'is_verified'   => 'bool',
        'pinned'        => 'bool',
        'helpful_count' => 'int',
        'report_count'  => 'int',
        'tags'          => 'array',
        'images'        => 'array',
        'reply_admin_user_id' => 'int',
        'reply_created_at' => 'datetime',
    ];

    public function product() { return $this->belongsTo(Product::class, 'product_id'); }
}


