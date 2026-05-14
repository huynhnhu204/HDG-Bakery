<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderDetail;

class OrderDetailSeeder extends Seeder
{
    public function run(): void
    {
        $orders = Order::all();

        foreach ($orders as $order) {
            // Mỗi đơn có 2-5 sản phẩm
            $n = rand(2, 5);
            for ($j = 1; $j <= $n; $j++) {
                $qty   = rand(1, 5);
                $price = rand(10000, 200000);
                $discount = rand(0, 1) ? rand(0, 5000) : 0;

                OrderDetail::create([
                    'order_id'   => $order->id,
                    'product_id' => rand(1, 20), // giả định đã có 20 sản phẩm
                    'name'       => 'Sản phẩm ' . $j,
                    'qty'        => $qty,
                    'price'      => $price,
                    'amount'     => $qty * $price - $discount,
                    'discount'   => $discount,
                ]);
            }
        }
    }
}
