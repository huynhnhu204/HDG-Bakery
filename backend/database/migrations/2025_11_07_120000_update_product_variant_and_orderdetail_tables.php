<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'price_sale')) {
                $table->decimal('price_sale', 12, 2)->default(0)->after('price');
            }
            if (!Schema::hasColumn('product_variants', 'weight_gram')) {
                $table->unsignedInteger('weight_gram')->nullable()->after('price_sale');
            }
            if (!Schema::hasColumn('product_variants', 'is_default')) {
                $table->boolean('is_default')->default(false)->after('status');
            }
            if (!Schema::hasColumn('product_variants', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('is_default');
            }
        });

        Schema::table('orderdetail', function (Blueprint $table) {
            if (!Schema::hasColumn('orderdetail', 'variant_id')) {
                $table->unsignedBigInteger('variant_id')->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('orderdetail', 'variant_name')) {
                $table->string('variant_name', 191)->nullable()->after('variant_id');
            }
            if (!Schema::hasColumn('orderdetail', 'variant_weight')) {
                $table->unsignedInteger('variant_weight')->nullable()->after('variant_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if (Schema::hasColumn('product_variants', 'price_sale')) {
                $table->dropColumn('price_sale');
            }
            if (Schema::hasColumn('product_variants', 'weight_gram')) {
                $table->dropColumn('weight_gram');
            }
            if (Schema::hasColumn('product_variants', 'is_default')) {
                $table->dropColumn('is_default');
            }
            if (Schema::hasColumn('product_variants', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
        });

        Schema::table('orderdetail', function (Blueprint $table) {
            if (Schema::hasColumn('orderdetail', 'variant_id')) {
                $table->dropColumn('variant_id');
            }
            if (Schema::hasColumn('orderdetail', 'variant_name')) {
                $table->dropColumn('variant_name');
            }
            if (Schema::hasColumn('orderdetail', 'variant_weight')) {
                $table->dropColumn('variant_weight');
            }
        });
    }
};









