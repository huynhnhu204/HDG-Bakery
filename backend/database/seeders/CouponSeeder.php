<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Coupon;
use Carbon\Carbon;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Mã giảm 20% tối đa 50k cho đơn từ 200k
        Coupon::create([
            'name' => 'Khai trương - Giảm 20%',
            'code' => 'BANH20',
            'description' => 'Giảm 20% cho đơn từ 200k, tối đa 50k',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'max_discount' => 50000,
            'min_order_amount' => 200000,
            'apply_to' => 'all',
            'delivery_method' => 'all',
            'customer_restriction' => 'all',
            'exclude_sale_items' => false,
            'start_date' => Carbon::now()->toDateTimeString(),
            'end_date' => Carbon::now()->addMonths(3)->toDateTimeString(),
            'total_usage_limit' => 200,
            'usage_per_customer' => 1,
            'status' => 1,
            'success_message' => 'Áp dụng mã BANH20: giảm 20% (tối đa 50.000đ)',
            'error_message' => 'Mã chỉ áp cho đơn từ 200.000đ',
        ]);

        // 2. Mã giảm cố định 30k cho đơn từ 300k
        Coupon::create([
            'name' => 'Khách mới - Giảm 30k',
            'code' => 'NEW30K',
            'description' => 'Giảm 30k cho khách mới, đơn từ 300k',
            'discount_type' => 'fixed',
            'discount_value' => 30000,
            'max_discount' => null,
            'min_order_amount' => 300000,
            'apply_to' => 'all',
            'delivery_method' => 'all',
            'customer_restriction' => 'new',
            'exclude_sale_items' => false,
            'start_date' => Carbon::now()->toDateTimeString(),
            'end_date' => Carbon::now()->addMonths(2)->toDateTimeString(),
            'total_usage_limit' => 100,
            'usage_per_customer' => 1,
            'status' => 1,
            'success_message' => 'Áp dụng mã NEW30K: giảm 30.000đ',
            'error_message' => 'Mã chỉ áp cho khách mới và đơn từ 300.000đ',
        ]);

        // 3. Mã miễn phí ship
        Coupon::create([
            'name' => 'Miễn phí ship',
            'code' => 'FREESHIP',
            'description' => 'Miễn phí vận chuyển cho đơn từ 200k',
            'discount_type' => 'free_ship',
            'discount_value' => 0,
            'max_discount' => null,
            'min_order_amount' => 200000,
            'apply_to' => 'all',
            'delivery_method' => 'all',
            'customer_restriction' => 'all',
            'exclude_sale_items' => false,
            'start_date' => Carbon::now()->toDateTimeString(),
            'end_date' => Carbon::now()->addMonths(1)->toDateTimeString(),
            'total_usage_limit' => 500,
            'usage_per_customer' => 1,
            'status' => 1,
            'success_message' => 'Áp dụng mã FREESHIP: miễn phí vận chuyển',
            'error_message' => 'Mã chỉ áp cho đơn từ 200.000đ',
        ]);

        // 4. Mã giảm 15% bánh kem
        Coupon::create([
            'name' => 'Thứ Tư bánh kem',
            'code' => 'CAKE15',
            'description' => 'Giảm 15% bánh kem vào thứ Tư',
            'discount_type' => 'percent',
            'discount_value' => 15,
            'max_discount' => 80000,
            'min_order_amount' => 0,
            'apply_to' => 'category',
            'category_ids' => json_encode([1]), // Thay bằng ID category bánh kem thực tế
            'delivery_method' => 'all',
            'customer_restriction' => 'all',
            'exclude_sale_items' => true,
            'start_date' => Carbon::now()->toDateTimeString(),
            'end_date' => Carbon::now()->addMonths(6)->toDateTimeString(),
            'total_usage_limit' => 0,
            'usage_per_customer' => 3,
            'time_restriction' => '00:00-23:59',
            'status' => 1,
            'success_message' => 'Áp dụng mã CAKE15: giảm 15% bánh kem',
            'error_message' => 'Mã chỉ áp cho bánh kem và không áp với sản phẩm đang sale',
        ]);

        // 5. Mã đã hết hạn (để test error)
        Coupon::create([
            'name' => 'Mã test hết hạn',
            'code' => 'EXPIRED',
            'description' => 'Mã đã hết hạn để test',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'max_discount' => null,
            'min_order_amount' => 0,
            'apply_to' => 'all',
            'delivery_method' => 'all',
            'customer_restriction' => 'all',
            'exclude_sale_items' => false,
            'start_date' => Carbon::now()->subMonths(2)->toDateTimeString(),
            'end_date' => Carbon::now()->subMonth()->toDateTimeString(),
            'total_usage_limit' => 0,
            'usage_per_customer' => 1,
            'status' => 1,
            'success_message' => 'Áp dụng mã thành công',
            'error_message' => 'Mã đã hết hạn',
        ]);
    }
}


