<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coupon_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('coupon_id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable(); // Lưu user_id nếu có đăng nhập
            $table->string('email', 191)->nullable(); // Email khách (nếu guest)
            $table->string('phone', 50)->nullable(); // SĐT khách (nếu guest)
            
            $table->decimal('order_amount', 12, 2); // Giá trị đơn
            $table->decimal('discount_amount', 12, 2); // Số tiền đã giảm
            
            $table->timestamps();
            
            $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
            
            $table->index('coupon_id');
            $table->index('order_id');
            $table->index('user_id');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_usage');
    }
};


