<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductImageSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('product_image')->insert([
            ['product_id' => 1, 'image' => '/images/cakes/choco_1.jpg', 'alt' => 'Choco 1', 'title' => 'Choco angle'],
            ['product_id' => 1, 'image' => '/images/cakes/choco_2.jpg', 'alt' => 'Choco 2', 'title' => 'Choco top'],
            ['product_id' => 2, 'image' => '/images/cookies/mix_1.jpg', 'alt' => 'Cookies 1', 'title' => 'Cookies mix'],
        ]);
    }
}
