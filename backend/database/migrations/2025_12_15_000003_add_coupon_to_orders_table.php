<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Thêm cột total trước (để tránh lỗi khi insert)
            if (!Schema::hasColumn('orders', 'total')) {
                $table->decimal('total', 12, 2)->default(0)->after('payment_method');
            }
            
            $table->unsignedBigInteger('coupon_id')->nullable()->after('payment_method');
            $table->string('coupon_code', 50)->nullable()->after('coupon_id');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('coupon_code');
            
            $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('set null');
            $table->index('coupon_id');
            $table->index('coupon_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['coupon_id']);
            $table->dropColumn(['coupon_id', 'coupon_code', 'discount_amount', 'total']);
        });
    }
};


