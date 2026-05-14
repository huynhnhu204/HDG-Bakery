<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('customers', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->nullable()->unique()
                  ->comment('Liên kết user đăng nhập (nếu có)');

            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('phone')->nullable()->unique();
            $table->string('address')->nullable();
            $table->date('birthday')->nullable();
            $table->string('gender', 10)->nullable(); // male/female/other

            // Grouping / marketing
            $table->string('group', 50)->nullable();
            $table->string('source', 50)->nullable();
            $table->string('tags')->nullable();
            $table->string('owner')->nullable();
            $table->text('note')->nullable();

            // Loyalty
            $table->integer('points')->default(0);
            $table->string('level', 50)->nullable();
            $table->text('benefit_note')->nullable();

            // Contact preferences
            $table->boolean('email_verified')->default(false);
            $table->boolean('allow_email')->default(false);
            $table->boolean('allow_sms')->default(false);
            $table->text('consent_note')->nullable();

            // Files
            $table->string('cmnd')->nullable();
            $table->string('documents')->nullable();

            // Status
            $table->unsignedTinyInteger('vip_level')->default(0);
            $table->unsignedTinyInteger('status')->default(1); // 1=active,0=locked

            // Audit
            $table->timestamps();
            $table->unsignedInteger('created_by')->nullable();
            $table->unsignedInteger('updated_by')->nullable();

            $table->index(['email','phone']);
            $table->foreign('user_id')->references('id')->on('user')->onDelete('cascade');
        });
    }

    public function down(): void {
        Schema::dropIfExists('customers');
    }
};
