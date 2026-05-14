<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    // Bạn đang đặt tên bảng là 'user' (số ít)
    protected $table = 'user';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'username',
        'password',
        'roles',          // 'admin' | 'customer'
        'avatar',
        'status',         // 1: active, 0: locked
        'created_by',
        'updated_by',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
        'email_verified_at' => 'datetime',
        'status'            => 'boolean',
        'deleted_at'        => 'datetime', // quan trọng để SoftDeletes hoạt động mượt
    ];

    /** Quan hệ 1-1 với hồ sơ khách hàng */
    public function customer()
    {
        return $this->hasOne(Customer::class, 'user_id');
    }

    /** Mutator: luôn băm mật khẩu khi set nếu chuỗi chưa được băm */
    protected function password(): Attribute
    {
        return Attribute::make(
            set: function ($value) {
                if (is_string($value) && $value !== '') {
                    return \Illuminate\Support\Str::startsWith($value, '$2y$')
                        ? $value
                        : \Illuminate\Support\Facades\Hash::make($value);
                }
                return $value;
            }
        );
    }

    /* Helpers */
    public function isAdmin(): bool    { return $this->roles === 'admin'; }
    public function isCustomer(): bool { return $this->roles === 'customer'; }
}
