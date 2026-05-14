<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_store', function (Blueprint $table) {
            // ID tự tăng
            $table->id();

            // Khóa ngoại sản phẩm
            $table->unsignedBigInteger('product_id');

            // Giá nhập có thể NULL + default 0
            $table->decimal('price_root', 12, 2)->nullable()->default(0);

            // Cho phép âm để ghi bút toán rollback tồn kho
            $table->integer('qty');

            // ====== các trường truy vết chứng từ (audit) ======
            $table->string('type', 20)->nullable();        // VD: IN, ROLLBACK_IN, OUT,...
            $table->string('ref_type', 30)->nullable();    // VD: stock_in, order, manual,...
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->string('note', 255)->nullable();

            // Thông tin tạo/cập nhật
            $table->dateTime('created_at')->useCurrent();
            $table->unsignedBigInteger('created_by')->default(1);
            $table->dateTime('updated_at')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            // Trạng thái
            $table->unsignedTinyInteger('status')->default(1);

            // Index
            $table->index(['product_id', 'status']);
            $table->index(['ref_type', 'ref_id']);
            $table->index(['type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_store');
    }
};
