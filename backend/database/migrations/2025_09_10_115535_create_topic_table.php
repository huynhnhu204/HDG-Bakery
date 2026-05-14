<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('topic', function (Blueprint $table) {
            $table->id();                                     // BIGINT UNSIGNED AUTO_INCREMENT
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();          // dài hơn tinyText
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedBigInteger('created_by')->default(1);
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedTinyInteger('status')->default(1);

            $table->timestamps();                             // created_at, updated_at auto handle

            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topic');
    }
};
