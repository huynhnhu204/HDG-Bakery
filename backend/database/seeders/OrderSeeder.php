<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use App\Models\Order;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $faker = \Faker\Factory::create('vi_VN');

        // Tạo 10 đơn hàng
        for ($i = 1; $i <= 10; $i++) {
            Order::create([
                'user_id'        => null,
                'name'           => $faker->name,
                'email'          => $faker->safeEmail,
                'phone'          => $faker->phoneNumber,
                'address'        => $faker->address,
                'note'           => $faker->sentence,
                'payment_method' => $faker->randomElement(['cod','vnpay']),
                'status'         => $faker->numberBetween(0, 3),
                'created_at'     => Carbon::now()->subDays(rand(0, 30)),
                'updated_at'     => Carbon::now(),
            ]);
        }
    }
}
