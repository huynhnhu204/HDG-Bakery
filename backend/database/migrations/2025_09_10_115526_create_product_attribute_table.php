<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_attribute', function (Blueprint $table) {
            $table->unsignedBigInteger('id', true); // Key, AUTO_INCREMENT
            $table->unsignedInteger('product_id');  // Not Null
            $table->unsignedInteger('attribute_id');// Not Null
            $table->string('value');                // Not Null

            $table->index(['product_id', 'attribute_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attribute');
    }
};
