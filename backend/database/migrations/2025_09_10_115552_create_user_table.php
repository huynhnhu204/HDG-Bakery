<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user', function (Blueprint $table) {
             $table->bigIncrements('id');
    $table->string('name');
    $table->string('email');
    $table->timestamp('email_verified_at')->nullable(); // ⬅️ THÊM VÀO
    $table->string('phone');
    $table->string('username');
    $table->string('password');
    $table->string('remember_token', 100)->nullable();  // ⬅️ TUỲ CHỌN: THÊM VÀO
    $table->enum('roles', ['admin','warehouse','customer'])->default('customer');
    $table->string('avatar')->nullable();
    $table->dateTime('created_at')->useCurrent();
    $table->unsignedInteger('created_by')->default(1);
    $table->dateTime('updated_at')->nullable();
    $table->unsignedInteger('updated_by')->nullable();
    $table->unsignedTinyInteger('status')->default(1);

    $table->unique('email');
    $table->unique('username');
    $table->index(['roles','status']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('user');
    }
};
