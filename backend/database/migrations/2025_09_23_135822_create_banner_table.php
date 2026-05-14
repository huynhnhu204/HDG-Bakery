<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('banner', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('image', 255);            // đường dẫn ảnh (tương đối hoặc tuyệt đối)
            $table->string('link', 255)->nullable(); // link khi click
            $table->string('position', 50)->default('slideshow'); // slideshow | ads | ...
            $table->integer('sort_order')->default(0);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->tinyInteger('status')->default(1);
            $table->index(['position', 'status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banner');
    }
};
