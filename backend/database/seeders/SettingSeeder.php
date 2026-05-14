<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('setting')->insert([
            'site_name' => 'Dola Bakery',
            'email'     => 'heyzun@support.vn',
            'phone'     => '028-0000-0000',
            'hotline'   => '19006750',
            'address'   => '70 Lữ Gia, P.15, Q.11, TP.HCM',
            'status'    => 1,
        ]);
    }
}
