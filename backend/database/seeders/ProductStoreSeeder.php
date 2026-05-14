<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductStoreSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('product_store')->insert([
            ['product_id' => 1, 'price_root' => 200000, 'qty' => 15, 'created_by' => 1, 'status' => 1],
            ['product_id' => 2, 'price_root' => 90000,  'qty' => 40, 'created_by' => 1, 'status' => 1],
        ]);
    }
}
