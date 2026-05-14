<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $rows = [];
        $now = Carbon::now();

        for ($i = 1; $i <= 10; $i++) {
            $rows[] = [
                'name'       => "Danh mục $i",
                'slug'       => Str::slug("Danh mục $i"),
                'image'      => "/uploads/categories/category$i.jpg",
                'parent_id'  => 0,
                'sort_order' => $i,
                'description'=> "Mô tả danh mục số $i",
                'created_by' => 1,
                'updated_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
                'status'     => 1,
            ];
        }

        DB::table('category')->upsert(
            $rows,
            ['slug'],
            ['name','image','sort_order','description','status','updated_at']
        );
    }
}
