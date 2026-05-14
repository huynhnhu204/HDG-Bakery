<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_image', function (Blueprint $table) {
            $table->unsignedBigInteger('id', true);   // Key, AUTO_INCREMENT

            $table->unsignedInteger('product_id');    // Not Null
            $table->string('image');                  // Not Null
            $table->string('alt')->nullable();        // Null
            $table->string('title')->nullable();      // Null

            // Indexes
            $table->index(['product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_image');
    }
};
