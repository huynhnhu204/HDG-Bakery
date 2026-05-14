<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            
            // Name & Code
            $table->string('name', 191);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            
            // Discount Type
            // fixed: giảm số tiền cố định (vd 30.000đ)
            // percent: giảm theo % (vd 20%)
            // free_ship: miễn phí ship
            $table->enum('discount_type', ['fixed', 'percent', 'free_ship'])->default('percent');
            $table->decimal('discount_value', 12, 2)->default(0); // Số tiền hoặc % giảm
            $table->decimal('max_discount', 12, 2)->nullable(); // Tối đa giảm (cho percent)
            $table->decimal('min_order_amount', 12, 2)->default(0); // Đơn tối thiểu
            
            // Product restrictions
            $table->enum('apply_to', ['all', 'category', 'product'])->default('all');
            $table->json('category_ids')->nullable();
            $table->json('product_ids')->nullable();
            $table->json('exclude_product_ids')->nullable();
            
            // Delivery method
            $table->enum('delivery_method', ['all', 'pickup', 'delivery'])->default('all');
            
            // Advance order requirement (cho bánh cần làm trước)
            $table->integer('advance_hours')->default(0); // Số giờ phải đặt trước
            
            // Customer restrictions
            $table->enum('customer_restriction', ['all', 'new', 'birthday'])->default('all');
            $table->boolean('exclude_sale_items')->default(false); // Không áp với món sale
            
            // Time validity
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->string('time_restriction', 50)->nullable(); // VD: "15:00-17:00" hoặc null
            
            // Usage limits
            $table->integer('total_usage_limit')->default(0); // 0 = không giới hạn
            $table->integer('current_usage_count')->default(0);
            $table->integer('usage_per_customer')->default(1); // Số lần 1 khách dùng
            $table->json('allowed_customer_emails')->nullable(); // Danh sách email cụ thể
            
            // Stacking rules
            $table->boolean('can_stack_with_ship')->default(false); // Cho phép kèm free ship
            
            // Display message
            $table->string('success_message')->nullable(); // Thông điệp khi apply thành công
            $table->string('error_message')->nullable(); // Thông điệp khi không hợp lệ
            
            // Status
            $table->tinyInteger('status')->default(1); // 1=active, 0=inactive
            
            $table->timestamps();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            
            $table->index('code');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};


