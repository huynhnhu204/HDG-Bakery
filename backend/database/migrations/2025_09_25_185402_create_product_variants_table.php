<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('product_variants', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('product_id');
        $table->string('name', 191);
        $table->string('sku', 191)->unique();
        $table->decimal('price', 12, 2)->default(0);
        $table->integer('stock')->default(0);
        $table->boolean('status')->default(1);
        $table->json('options')->nullable();
        $table->timestamps();

        $table->foreign('product_id')->references('id')->on('product')->onDelete('cascade');
    });
}

public function down()
{
    Schema::dropIfExists('product_variants');
}

};
