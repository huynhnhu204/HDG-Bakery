<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('orderdetail', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('product_id')->nullable();
            $table->string('name', 191)->nullable();
            $table->decimal('price',12,2);
            $table->unsignedInteger('qty');
            $table->decimal('amount',12,2);
            $table->decimal('discount',12,2)->default(0);

            $table->index(['order_id','product_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('orderdetail');
    }
};
