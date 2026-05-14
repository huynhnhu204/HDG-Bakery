<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('name', 191);
            $table->string('email', 191)->nullable();
            $table->string('phone', 50);
            $table->text('address');
            $table->text('note')->nullable();
            $table->string('payment_method', 50)->default('cod');
            $table->tinyInteger('status')->default(0); // 0=New, 1=Approved, 2=Shipping, 3=Done, 4=Cancelled

            $table->timestamps();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->softDeletes();                 // ✅ thêm cột deleted_at
            $table->index('deleted_at');           // ✅ (không bắt buộc) index để truy vấn thùng rác nhanh
        });
    }

    public function down(): void {
        Schema::dropIfExists('orders');
    }
};
