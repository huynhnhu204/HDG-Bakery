<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // 'order', 'contact', 'review', etc.
            $table->string('title', 255);
            $table->text('message')->nullable();
            $table->string('url', 500)->nullable(); // URL để điều hướng khi click
            $table->unsignedBigInteger('reference_id')->nullable(); // ID của order, contact, etc.
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->unsignedBigInteger('read_by')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['type', 'is_read']);
            $table->index('reference_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};








