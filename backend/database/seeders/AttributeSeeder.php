<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AttributeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('attribute')->insert([
            ['name' => 'Size'],
            ['name' => 'Hương vị'],
        ]);
    }
}
