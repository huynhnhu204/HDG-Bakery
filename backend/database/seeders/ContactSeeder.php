<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('contact')->insert([
            'user_id'    => null,
            'name'       => 'Trần B',
            'email'      => 'b@example.com',
            'phone'      => '0902222333',
            'content'    => 'Cho hỏi bánh kem có giao trong ngày không?',
            'reply_id'   => 0,
            'created_by' => 1,
            'status'     => 1,
        ]);
    }
}
