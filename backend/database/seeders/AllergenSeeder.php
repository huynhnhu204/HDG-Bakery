<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Allergen;

class AllergenSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'nuts',   'name' => 'Hạt',   'status' => 1],
            ['code' => 'dairy',  'name' => 'Sữa',   'status' => 1],
            ['code' => 'egg',    'name' => 'Trứng', 'status' => 1],
            ['code' => 'gluten', 'name' => 'Gluten','status' => 1],
        ];
        foreach ($rows as $r) {
            Allergen::updateOrCreate(['code' => $r['code']], $r);
        }
    }
}
