<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            MenuSeeder::class,
            CategorySeeder::class,     
            AttributeSeeder::class,
            ProductSeeder::class,
            ProductImageSeeder::class,
            ProductSaleSeeder::class,
            ProductStoreSeeder::class,
            ProductAttributeSeeder::class,
            BannerSeeder::class,
            TopicSeeder::class,
            PostSeeder::class,
            ContactSeeder::class,
            UserSeeder::class,
            OrderSeeder::class,
            OrderDetailSeeder::class,
             TagSuggestSeeder::class,
        AllergenSeeder::class,
        ]);
    }
}
