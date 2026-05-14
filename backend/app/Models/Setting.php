<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $table = 'setting';
    public $timestamps = false;

    protected $fillable = [
        'site_name','email','phone','hotline','address',
        'logo','favicon','meta_title','meta_description','meta_keywords','status'
    ];
}
