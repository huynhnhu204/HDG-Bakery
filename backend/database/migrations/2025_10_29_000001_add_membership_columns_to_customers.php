<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('customers', function (Blueprint $table) {
            // Tổng số đơn đã mua (được tính từ đơn đã giao thành công)
            if (!Schema::hasColumn('customers', 'total_orders')) {
                $table->unsignedInteger('total_orders')->default(0)->after('vip_level');
            }
            // Tổng tiền đã chi (VNĐ)
            if (!Schema::hasColumn('customers', 'total_spent')) {
                $table->unsignedBigInteger('total_spent')->default(0)->after('total_orders'); // lưu vnđ, không dùng float để tránh sai số
            }
            // Hạng thành viên hiện tại: dong|bac|vang|bachkim
            if (!Schema::hasColumn('customers', 'membership_level')) {
                $table->string('membership_level', 20)->nullable()->after('total_spent');
            }
            // Nhãn hiển thị (ví dụ: Đồng/Bạc/Vàng/Bạch Kim)
            if (!Schema::hasColumn('customers', 'membership_label')) {
                $table->string('membership_label', 50)->nullable()->after('membership_level');
            }
            // Thời điểm thay đổi hạng gần nhất
            if (!Schema::hasColumn('customers', 'membership_changed_at')) {
                $table->timestamp('membership_changed_at')->nullable()->after('membership_label');
            }
        });
    }

    public function down(): void {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'total_orders')) {
                $table->dropColumn('total_orders');
            }
            if (Schema::hasColumn('customers', 'total_spent')) {
                $table->dropColumn('total_spent');
            }
            if (Schema::hasColumn('customers', 'membership_level')) {
                $table->dropColumn('membership_level');
            }
            if (Schema::hasColumn('customers', 'membership_label')) {
                $table->dropColumn('membership_label');
            }
            if (Schema::hasColumn('customers', 'membership_changed_at')) {
                $table->dropColumn('membership_changed_at');
            }
        });
    }
};























