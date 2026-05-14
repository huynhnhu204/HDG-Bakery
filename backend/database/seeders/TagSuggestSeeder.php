<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TagSuggest;

class TagSuggestSeeder extends Seeder
{
    public function run(): void
    {
        $tags = ['Sinh nhật','Không trứng','Trà chiều','Đám cưới','Ít đường'];
        foreach ($tags as $t) {
            TagSuggest::firstOrCreate(['tag'=>$t], ['status'=>1]);
        }
    }
}
