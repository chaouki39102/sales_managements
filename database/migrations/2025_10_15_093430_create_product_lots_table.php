<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 📦 جدول دفعات المنتجات (Product Lots)
 * النسخة النهائية – متوافقة مع Laravel 12 و Blueprint v4
 * تشمل تطبيق FIFO + التتبع + التكلفة القانونية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();

            // 🧾 معلومات أساسية
            $table->string('lot_number', 50)->unique();
            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // 📅 معلومات زمنية (التصنيع والانتهاء والشراء)
            $table->date('manufacturing_date')->nullable()->index()->comment('تاريخ التصنيع');
            $table->date('expiration_date')->nullable()->index()->comment('تاريخ انتهاء الصلاحية');
            $table->date('purchase_date')->index()->comment('تاريخ الشراء');

            // 💰 الأسعار والكميات
            $table->decimal('purchase_price', 15, 4)->comment('سعر الشراء للوحدة');
            $table->decimal('legal_selling_price', 15, 4)->comment('السعر القانوني للوحدة');
            $table->decimal('margin_percentage', 8, 4)->default(5.00)->comment('نسبة الهامش');
            $table->decimal('original_quantity', 15, 3)->comment('الكمية الأصلية');
            $table->decimal('remaining_quantity', 15, 3)->index()->comment('الكمية المتبقية');

            // ⚙️ أعمدة محسوبة (Computed Columns)
            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')
                    ->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')
                    ->index()
                    ->comment('هل تم استهلاك الدفعة بالكامل؟');

                $table->decimal('total_cost', 15, 4)
                    ->storedAs('original_quantity * purchase_price')
                    ->comment('إجمالي تكلفة الدفعة');

                $table->decimal('remaining_value', 15, 4)
                    ->storedAs('remaining_quantity * purchase_price')
                    ->comment('قيمة المخزون المتبقي');
            } else {
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost', 15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            // 🔗 الربط بالحركة الأصلية (لتتبع الدفعات)
$table->unsignedBigInteger('stock_movement_id') // <--- تم التغيير من foreignId
    ->nullable();

            // 🧾 رقم دفعة المورد
            $table->string('supplier_lot_number', 100)->nullable()->comment('رقم الدفعة عند المورد');

            // ⚡ الحالة
            $table->boolean('active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();

            // 📈 الفهارس المخصصة لتحسين الأداء
            $table->index(['product_variant_id', 'warehouse_id', 'is_depleted', 'purchase_date'], 'idx_fifo_lookup');
            $table->index(['active', 'remaining_quantity'], 'idx_active_stock');
        });

        // ✅ قيود التحقق (Data Validation Constraints)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE product_lots
                ADD CONSTRAINT chk_quantities
                CHECK (remaining_quantity >= 0 AND remaining_quantity <= original_quantity)
            ");
            DB::statement("
                ALTER TABLE product_lots
                ADD CONSTRAINT chk_prices
                CHECK (purchase_price > 0 AND legal_selling_price >= purchase_price)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_lots');
    }
};
