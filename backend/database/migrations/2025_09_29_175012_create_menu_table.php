// database/migrations/2025_01_01_000000_create_menu_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('menu', function (Blueprint $table) {
            $table->id();
            $table->string('name',191);
            $table->string('link',255);
            $table->string('type',30)->default('custom'); // custom|category|page|topic|group...
            $table->unsignedBigInteger('parent_id')->default(0);
            $table->integer('sort_order')->default(0);
            $table->unsignedBigInteger('table_id')->nullable();
            $table->string('position',50)->default('mainmenu'); // mainmenu|submain|footermenu|subfooter|home_list_category|...
            $table->timestamp('created_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->tinyInteger('status')->default(1); // 1=show, 0=hidden

            $table->index(['position','status']);
            $table->index(['parent_id']);
            $table->index(['sort_order']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('menu');
    }
};
