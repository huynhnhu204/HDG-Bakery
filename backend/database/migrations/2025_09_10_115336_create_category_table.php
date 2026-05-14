<?php

// database/migrations/xxxx_xx_xx_create_category_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('category', function (Blueprint $table) {
            $table->id(); // Auto-increment chuẩn

            $table->string('name');                  // NOT NULL
            $table->string('slug');                  // NOT NULL, unique
            $table->string('image')->nullable();
            $table->unsignedInteger('parent_id')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->tinyText('description')->nullable();

            $table->dateTime('created_at')->useCurrent(); // NOT NULL
            $table->unsignedInteger('created_by')->default(1);
            $table->dateTime('updated_at')->nullable();
            $table->unsignedInteger('updated_by')->nullable();
            $table->unsignedTinyInteger('status')->default(1);

            $table->unique('slug');
            $table->index(['parent_id','sort_order']);
            $table->index('status');
        });
    }
    public function down(): void {
        Schema::dropIfExists('category');
    }
};
