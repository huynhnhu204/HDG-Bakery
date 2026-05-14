<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('category_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('thumbnail')->nullable();
            $table->string('image')->nullable();
            $table->longText('content')->nullable();
            $table->text('description')->nullable();

            // Giá
            $table->decimal('price_buy', 12, 2);
            $table->decimal('price_sale', 12, 2)->nullable();
            $table->decimal('discount_percent', 5, 2)->nullable();

            // Thuộc tính sản phẩm
            $table->decimal('quantity', 8, 2)->nullable();
            $table->string('unit', 10)->nullable();
            $table->string('type', 50)->nullable();   // Loại bánh: Bánh kem, Bánh ngọt...
            $table->string('weight', 50)->nullable(); // Trọng lượng: 500g, 1kg...

            // Trạng thái
            $table->boolean('product_new')->default(0); // Đánh dấu sản phẩm mới
            $table->unsignedTinyInteger('status')->default(1); // 1: hiển thị, 0: ẩn

            $table->timestamps();
            $table->unsignedBigInteger('created_by')->default(1);
            $table->unsignedBigInteger('updated_by')->nullable();

            // Index
            $table->index(['category_id', 'status']);
            $table->index(['price_buy']);
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product');
    }
};
