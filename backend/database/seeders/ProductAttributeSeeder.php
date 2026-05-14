<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductAttributeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('product_attribute')->insert([
            ['product_id' => 1, 'attribute_id' => 1, 'value' => '16cm'],
            ['product_id' => 1, 'attribute_id' => 2, 'value' => 'Socola'],
            ['product_id' => 2, 'attribute_id' => 1, 'value' => 'Hộp 12'],
        ]);
    }
}
