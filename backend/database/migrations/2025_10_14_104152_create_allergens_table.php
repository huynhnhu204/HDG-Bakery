<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('allergens', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique(); // vd: nuts, dairy, egg, soy, gluten
            $table->string('name', 100);          // "Hạt", "Sữa", "Trứng", ...
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('allergens');
    }
};
