<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class TopicSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Danh sách topic mẫu
        $topics = [
            ['name' => 'Tin khuyến mãi', 'slug' => 'tin-khuyen-mai', 'sort_order' => 1],
            ['name' => 'Cẩm nang bánh', 'slug' => 'cam-nang-banh', 'sort_order' => 2],
            ['name' => 'Sản phẩm mới', 'slug' => 'san-pham-moi', 'sort_order' => 3],
            ['name' => 'Câu chuyện thương hiệu', 'slug' => 'cau-chuyen-thuong-hieu', 'sort_order' => 4],
        ];

        $rows = [];
        foreach ($topics as $topic) {
            $rows[] = [
                'name'       => $topic['name'],
                'slug'       => $topic['slug'],
                'sort_order' => $topic['sort_order'],
                'status'     => 1,
                'created_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // upsert: nếu trùng slug thì update name/sort_order/status/updated_at
        DB::table('topic')->upsert(
            $rows,
            ['slug'],
            ['name','sort_order','status','updated_at']
        );
    }
}
