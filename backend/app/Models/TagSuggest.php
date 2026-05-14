<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagSuggest extends Model
{
    protected $table = 'tag_suggests';
    protected $fillable = ['tag','status'];
}
