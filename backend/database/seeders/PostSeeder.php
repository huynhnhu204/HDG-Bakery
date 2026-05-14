<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $faker = \Faker\Factory::create('vi_VN');

        // Đảm bảo thư mục lưu ảnh tồn tại
        $storageDir = storage_path('app/public/uploads/posts');
        File::ensureDirectoryExists($storageDir);

        // Reset dữ liệu cũ (tránh bị trùng slug)
        DB::table('post')->truncate();

        // Lấy danh sách topic_id hiện có
        $topicIds = DB::table('topic')->pluck('id')->toArray();

        // Tạo 12 bài viết ngẫu nhiên
        for ($i = 1; $i <= 12; $i++) {
            $title = $faker->sentence(6, true);

            // Sinh ảnh giả (640x480) -> fileName
            $fileName = $faker->image($storageDir, 640, 480, 'food', false);

            DB::table('post')->insert([
                'topic_id'    => $faker->randomElement($topicIds), // gán FK tới topic
                'title'       => $title,
                'slug'        => Str::slug($title) . '-' . Str::random(4),
                'image'       => '/storage/uploads/posts/' . $fileName,
                'description' => $faker->sentence(12, true),
                'content'     => $faker->paragraphs(3, true),
                'post_type'   => 'post',
                'status'      => 1,
                'created_at'  => Carbon::now()->subDays(rand(0, 10)),
                'created_by'  => 1,
                'updated_at'  => Carbon::now(),
                'updated_by'  => 1,
            ]);
        }
    }
}
