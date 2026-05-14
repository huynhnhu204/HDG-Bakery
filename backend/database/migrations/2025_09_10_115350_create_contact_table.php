<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contact', function (Blueprint $table) {
            $table->unsignedBigInteger('id', true); // Key, AUTO_INCREMENT

            $table->unsignedInteger('user_id')->nullable(); // Null
            $table->string('name');                          // Not Null
            $table->string('email');                         // Not Null
            $table->string('phone');                         // Not Null
            $table->mediumText('content');                   // Not Null

            $table->unsignedInteger('reply_id')->default(0); // Default 0

            // timestamps theo đặc tả (created_at not null, updated_at null)
            $table->timestamp('created_at')->useCurrent();
            $table->unsignedInteger('created_by')->default(1);

            $table->timestamp('updated_at')->nullable();
            $table->unsignedInteger('updated_by')->nullable();

            $table->unsignedTinyInteger('status')->default(1); // Default 1

            // Các chỉ mục gợi ý
            $table->index(['email', 'phone']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact');
    }
};
