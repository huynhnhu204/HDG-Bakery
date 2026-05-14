<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_sale', function (Blueprint $table) {
    $table->bigIncrements('id');

    $table->unsignedBigInteger('product_id');
    $table->decimal('price_sale', 12, 2);
    $table->dateTime('date_begin');
    $table->dateTime('date_end');

    $table->timestamps();
    $table->unsignedBigInteger('created_by')->default(1);
    $table->unsignedBigInteger('updated_by')->nullable();
    $table->unsignedTinyInteger('status')->default(1);

    $table->foreign('product_id')->references('id')->on('product')->onDelete('cascade');

    $table->index(['product_id', 'status']);
    $table->index(['date_begin']);
    $table->index(['date_end']);
});

    }

    public function down(): void
    {
        Schema::dropIfExists('product_sale');
    }
};
