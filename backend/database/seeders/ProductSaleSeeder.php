<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductSaleSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Xóa sạch trước khi insert
        DB::table('product_sale')->truncate();

        // Lấy danh sách product id
        $productIds = DB::table('product')->pluck('id')->toArray();

       foreach ($productIds as $pid) {
    if (rand(0, 1)) {
        $priceBuy  = DB::table('product')->where('id', $pid)->value('price_buy');
        $pname     = DB::table('product')->where('id', $pid)->value('name'); // <- lấy tên SP
        $salePrice = $priceBuy - rand(5000, 50000);

        DB::table('product_sale')->insert([
            'product_id' => $pid,
            'name'       => 'Sale cho ' . ($pname ?: ('SP #' . $pid)), // <- THÊM NAME
            'price_sale' => max(10000, $salePrice),
            'date_begin' => $now,
            'date_end'   => $now->copy()->addDays(rand(5, 15)),
            'status'     => 1,
            'created_at' => $now,
            'created_by' => 1,
            'updated_at' => $now,
        ]);
    }
}
    }
}                       