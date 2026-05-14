<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Bảng phiếu nhập
        Schema::create('stock_ins', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();     // ví dụ: PN00001
            $table->date('date')->index();
            $table->string('supplier', 191)->nullable();
            $table->text('note')->nullable();
            $table->integer('total_qty')->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps(); // created_at, updated_at
        });

        // Bảng dòng hàng của phiếu nhập
        Schema::create('stock_in_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stock_in_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->integer('qty');                       // > 0
            $table->decimal('price', 15, 2)->default(0);  // giá nhập
            $table->decimal('amount', 15, 2)->default(0); // qty * price
            $table->timestamps();

            // FK tới phiếu nhập
            $table->foreign('stock_in_id')
                  ->references('id')->on('stock_ins')
                  ->onDelete('cascade');

            // FK tới sản phẩm — bảng của bạn tên 'product'
            $table->foreign('product_id')
                  ->references('id')->on('product')
                  ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_in_items');
        Schema::dropIfExists('stock_ins');
    }
};
