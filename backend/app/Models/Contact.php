<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    protected $table = 'contact';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'content',
        'reply_id',
        'created_by',
        'updated_by',
        'status'
    ];

    // scope active
    public function scopeActive($q) { return $q->where('status', 1); }
}
