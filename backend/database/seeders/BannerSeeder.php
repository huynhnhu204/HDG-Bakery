<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('banner')->insert([
            [
                'name'        => 'Hero Slideshow 1',
                'image'       => '/banners/hero1.jpg',
                'link'        => '/product',
                'position'    => 'slideshow',
                'sort_order'  => 0,
                'description' => 'Ưu đãi tuần lễ vàng',
                'created_by'  => 1,
                'status'      => 1,
            ],
            [
                'name'        => 'Hero Slideshow 2',
                'image'       => '/banners/hero2.jpg',
                'link'        => '/news',
                'position'    => 'slideshow',
                'sort_order'  => 1,
                'description' => 'Tin mới từ Dola',
                'created_by'  => 1,
                'status'      => 1,
            ],
            [
                'name'        => 'QC Sidebar',
                'image'       => '/banners/ads1.jpg',
                'link'        => '/contact',
                'position'    => 'ads',
                'sort_order'  => 0,
                'description' => 'Đặt bánh theo yêu cầu',
                'created_by'  => 1,
                'status'      => 1,
            ],
        ]);
    }
}
