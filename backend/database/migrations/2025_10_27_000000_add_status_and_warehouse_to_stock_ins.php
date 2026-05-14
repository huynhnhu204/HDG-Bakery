<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stock_ins', function (Blueprint $table) {
            $table->tinyInteger('status')->default(0)->after('total_cost')->comment('0: Nháp, 1: Đã xác nhận');
            $table->string('warehouse', 100)->nullable()->after('supplier')->comment('Kho nhập hàng');
            $table->unsignedBigInteger('confirmed_by')->nullable()->after('created_by')->comment('Người xác nhận');
            $table->timestamp('confirmed_at')->nullable()->after('updated_at')->comment('Thời gian xác nhận');
        });
    }

    public function down(): void
    {
        Schema::table('stock_ins', function (Blueprint $table) {
            $table->dropColumn(['status', 'warehouse', 'confirmed_by', 'confirmed_at']);
        });
    }
};


