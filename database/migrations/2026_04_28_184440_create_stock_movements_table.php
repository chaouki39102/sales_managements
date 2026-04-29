<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول حركات المخزون  [مرتبط بـ product_id مباشرة]
 *
 * الـ circular FKs التالية تُضاف في migration منفصل (add_foreign_keys_new):
 *   - commercial_document_line_id  → commercial_document_lines
 *   - stock_lot_id                 → product_lots
 *
 * price_source: يوضح مصدر السعر المسجَّل في unit_price
 *   purchase  → سعر شراء (فاتورة شراء، إدخال مخزون)
 *   sale      → سعر بيع  (فاتورة بيع، إخراج مخزون)
 *   adjustment→ تسوية يدوية أو جرد
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            // المنتج والمستودع
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // وحدة التعبئة المستخدمة في الحركة
            $table->foreignId('packaging_id')
                ->nullable()
                ->constrained('product_packagings')
                ->nullOnDelete()
                ->cascadeOnUpdate()
                ->comment('التعبئة المستخدمة — UN / FD / PLT');

            // السنة المالية
            $table->foreignId('fiscal_year_id')
                ->constrained('fiscal_years')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // نوع الحركة
            $table->foreignId('stock_movement_type_id')
                ->constrained('stock_movement_types')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // الوثيقة التجارية المرتبطة (FK يُضاف في add_foreign_keys_new)
            $table->unsignedBigInteger('commercial_document_line_id')
                ->nullable()
                ->comment('FK يُضاف لاحقاً — circular dependency');

            // تفاصيل الحركة
            $table->dateTime('movement_date');

            // الكميات — دائماً بالوحدة الأساسية
            $table->decimal('quantity', 15, 4)
                ->comment('الكمية بالوحدة الأساسية');
            $table->decimal('packaging_quantity', 15, 4)->nullable()
                ->comment('الكمية بوحدة التعبئة — للعرض فقط');

            // الأسعار
            $table->decimal('unit_price', 15, 4)
                ->comment('سعر الوحدة الأساسية وقت الحركة');
            $table->decimal('cost_price', 15, 4)
                ->comment('سعر التكلفة (PMP أو FIFO) وقت الحركة');
            $table->decimal('total_price', 15, 4);

            // مصدر السعر — يوضح من أين جاء unit_price
            $table->enum('price_source', ['purchase', 'sale', 'adjustment'])
                ->default('purchase')
                ->comment('purchase=شراء | sale=بيع | adjustment=تسوية');

            // الرصيد بعد الحركة
            $table->decimal('stock_balance_after', 15, 4)
                ->comment('الرصيد بالوحدة الأساسية بعد الحركة');

            // تتبع الدفعات (Lots)
            $table->string('lot_number', 100)->nullable();
            $table->date('expiration_date')->nullable();
            $table->unsignedBigInteger('stock_lot_id')->nullable()->index()
                ->comment('FK يُضاف لاحقاً — circular dependency');

            // معلومات إضافية
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();

            // المستخدم المنفِّذ
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // حركة أب (للتحويلات والإلغاءات)
            $table->foreignId('parent_movement_id')
                ->nullable()
                ->constrained('stock_movements')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // التحقق والاعتماد
            $table->boolean('is_validated')->default(false)->index();
            $table->foreignId('validated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('validated_at')->nullable();

            // المنشئ
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // فهارس
            $table->index(
                ['product_id', 'warehouse_id', 'movement_date'],
                'stock_mov_prod_wh_date_idx'
            );
            $table->index(['movement_date', 'stock_movement_type_id']);
            $table->index(['warehouse_id', 'movement_date']);
            $table->index(['fiscal_year_id', 'movement_date']);
            $table->index('lot_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
