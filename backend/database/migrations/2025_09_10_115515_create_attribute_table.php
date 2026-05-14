<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attribute', function (Blueprint $table) {
            $table->unsignedBigInteger('id', true); // Key, AUTO_INCREMENT
            $table->string('name');                 // Not Null
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute');
    }
};
