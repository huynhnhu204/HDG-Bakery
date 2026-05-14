<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Dữ liệu mẫu
        $rows = [
            [
                'name'       => 'Quản trị',
                'email'      => 'admin@example.com',
                'phone'      => '0900000000',
                'username'   => 'admin',
                'password'   => Hash::make('admin@123'),
                'roles'      => 'admin',
                'avatar'     => null,
                'status'     => 1,
                'created_by' => 1,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'Nhân viên kho',
                'email'      => 'kho@example.com',
                'phone'      => '0903333444',
                'username'   => 'warehouse',
                'password'   => Hash::make('kho@123'),
                'roles'      => 'warehouse',
                'avatar'     => null,
                'status'     => 1,
                'created_by' => 1,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'Nguyễn Văn A',
                'email'      => 'a@example.com',
                'phone'      => '0901111222',
                'username'   => 'nguyenvana',
                'password'   => Hash::make('user@123'),
                'roles'      => 'customer',
                'avatar'     => null,
                'status'     => 1,
                'created_by' => 1,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Nếu email trùng thì update, nếu chưa có thì insert
        DB::table('user')->upsert(
            $rows,
            ['email'], // unique theo email
            ['name','phone','username','roles','avatar','status','updated_at']
        );
    }
}
