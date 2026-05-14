<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_ins', function (Blueprint $table) {
            // Kiểm tra và thêm warehouse sau supplier
            if (!Schema::hasColumn('stock_ins', 'warehouse')) {
                $table->string('warehouse', 100)->nullable()->after('supplier');
            }
            
            // Kiểm tra và thêm status sau note
            if (!Schema::hasColumn('stock_ins', 'status')) {
                $table->unsignedTinyInteger('status')->default(0)->after('note'); // 0 = nháp, 1 = đã xác nhận
            }
            
            // Kiểm tra và thêm confirmed_by sau created_by
            if (!Schema::hasColumn('stock_ins', 'confirmed_by')) {
                $table->unsignedBigInteger('confirmed_by')->nullable()->after('created_by');
            }
            
            // Kiểm tra và thêm confirmed_at sau confirmed_by
            if (!Schema::hasColumn('stock_ins', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            }
            
            // Thêm index cho status và warehouse (nếu chưa có)
            // Lưu ý: Laravel không có hasIndex, nên sẽ bỏ qua nếu index đã tồn tại
            try {
                $table->index(['status']);
            } catch (\Exception $e) {
                // Index đã tồn tại, bỏ qua
            }
            try {
                $table->index(['warehouse']);
            } catch (\Exception $e) {
                // Index đã tồn tại, bỏ qua
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_ins', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['warehouse']);
            $table->dropColumn(['warehouse', 'status', 'confirmed_by', 'confirmed_at']);
        });
    }
};

