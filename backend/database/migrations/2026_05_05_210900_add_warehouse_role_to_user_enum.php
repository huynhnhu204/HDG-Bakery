<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `user` MODIFY COLUMN `roles` ENUM('admin','warehouse','customer') NOT NULL DEFAULT 'customer'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `user` MODIFY COLUMN `roles` ENUM('admin','customer') NOT NULL DEFAULT 'customer'");
    }
};
