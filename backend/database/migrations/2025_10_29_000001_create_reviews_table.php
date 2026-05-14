<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();

            $table->unsignedTinyInteger('rating'); // 1..5
            $table->string('title', 150)->nullable();
            $table->text('content');
            $table->string('nickname', 80)->nullable();

            $table->boolean('is_verified')->default(false);
            $table->json('tags')->nullable();
            $table->json('images')->nullable();

            $table->string('status', 20)->default('pending'); // pending|approved|hidden
            $table->boolean('pinned')->default(false);

            $table->integer('helpful_count')->default(0);
            $table->integer('report_count')->default(0);

            // Admin reply
            $table->text('reply_content')->nullable();
            $table->unsignedBigInteger('reply_admin_user_id')->nullable();
            $table->dateTime('reply_created_at')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['product_id', 'status']);
            $table->index(['user_id']);
            $table->index(['rating']);

            // FKs (soft, to existing tables)
            $table->foreign('product_id')->references('id')->on('product')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
