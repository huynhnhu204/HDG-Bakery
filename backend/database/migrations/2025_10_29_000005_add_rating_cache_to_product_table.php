<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product', function (Blueprint $table) {
            if (!Schema::hasColumn('product', 'average_rating')) {
                $table->float('average_rating')->default(0)->after('status');
            }
            if (!Schema::hasColumn('product', 'reviews_count')) {
                $table->unsignedInteger('reviews_count')->default(0)->after('average_rating');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product', function (Blueprint $table) {
            if (Schema::hasColumn('product', 'reviews_count')) {
                $table->dropColumn('reviews_count');
            }
            if (Schema::hasColumn('product', 'average_rating')) {
                $table->dropColumn('average_rating');
            }
        });
    }
};




















