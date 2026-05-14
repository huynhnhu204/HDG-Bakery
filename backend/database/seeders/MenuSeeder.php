<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'name'      => 'Trang chủ',
                'link'      => '/',
                'type'      => 'custom',
                'parent_id' => 0,
                'sort_order'=> 1,
                'position'  => 'mainmenu',
                'status'    => 1,
                'created_by'=> 1,
            ],
            [
                'name'      => 'Sản phẩm',
                'link'      => '/product',
                'type'      => 'custom',
                'parent_id' => 0,
                'sort_order'=> 2,
                'position'  => 'mainmenu',
                'status'    => 1,
                'created_by'=> 1,
            ],
            [
                'name'      => 'Tin tức',
                'link'      => '/news',
                'type'      => 'custom',
                'parent_id' => 0,
                'sort_order'=> 3,
                'position'  => 'mainmenu',
                'status'    => 1,
                'created_by'=> 1,
            ],
            [
                'name'      => 'Liên hệ',
                'link'      => '/contact',
                'type'      => 'custom',
                'parent_id' => 0,
                'sort_order'=> 4,
                'position'  => 'mainmenu',
                'status'    => 1,
                'created_by'=> 1,
            ],
        ];

        // upsert: nếu trùng 'link' thì update name + sort_order
        DB::table('menu')->upsert(
            $rows,
            ['link'], // unique key
            ['name','type','sort_order','position','status','updated_at']
        );
    }
}
