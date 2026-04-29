<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير: إنشاء جدول أسطر الوثائق التجارية المرتبط بالمنتجات مباشرة.
     */
    public function up(): void
    {
        Schema::create('commercial_document_lines', function (Blueprint $table) {
            $table->id();

            // --- الربط بالوثيقة الأم ---
            $table->foreignId('commercial_document_id')
                ->constrained('commercial_documents')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // --- الربط بالمنتج (بديل لـ product_id المحذوف) ---
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // --- تفاصيل السطر ---
            $table->unsignedSmallInteger('line_order')->default(0)->comment('ترتيب العرض');
            $table->text('description')->nullable()->comment('وصف إضافي للسطر');

            // --- الكميات ---
            $table->decimal('quantity', 15, 3);
            $table->decimal('delivered_quantity', 15, 3)->default(0)->comment('الكمية المستلمة/المسلمة');
            $table->decimal('returned_quantity', 15, 3)->default(0)->comment('الكمية المرتجعة');

            // --- التسعير والضرائب ---
            $table->decimal('unit_price_ht', 15, 4)->comment('سعر الوحدة قبل الضريبة');
            $table->decimal('discount_percentage', 8, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.00);
            $table->decimal('tva_rate', 8, 2)->comment('نسبة القيمة المضافة');

            $table->decimal('total_ht', 15, 4)->comment('المجموع الصافي قبل الضريبة');
            $table->decimal('total_tva', 15, 4)->default(0.00);
            $table->decimal('total_ttc', 15, 4)->comment('المجموع النهائي شامل الضريبة');

            $table->json('additional_costs')->nullable()->comment('تكاليف إضافية مرتبطة بالسطر (مثل الشحن، التعبئة، إلخ)');
            $table->decimal('total_additional_cost', 15, 4)->default(0)->comment('مجموع التكاليف');
            $table->decimal('total_discount_amount', 15, 4)->default(0)->comment('مجموع الخصومات');

            // --- إدارة الدفعات (Lots) ---
            // نستخدم unsignedBigInteger لتجنب مشاكل الدائرية في البداية
            $table->unsignedBigInteger('stock_lot_id')->nullable();

            // --- دعم تجزئة الأسطر (Auto-Split) ---
            $table->boolean('is_auto_split')->default(false)->index();
            $table->unsignedBigInteger('parent_line_id')->nullable();

            $table->foreign('parent_line_id')
                ->references('id')
                ->on('commercial_document_lines')
                ->restrictOnDelete();

            // --- بيانات إضافية مرنة ---
            $table->json('line_attributes')->nullable()->comment('خصائص إضافية للسطر');

            $table->timestamps();

            // --- الفهارس (Indexes) ---
            // تحسين البحث عن أسطر وثيقة معينة مرتبة
            $table->index(['commercial_document_id', 'line_order'], 'idx_cdl_doc_order');
            // تحسين التقارير المبنية على المنتجات
            $table->index('product_id', 'idx_cdl_product');
            // فهرس لدفعات المخزون
            $table->index('stock_lot_id', 'idx_cdl_lot');
        });
    }

    /**
     * التراجع عن التهجير.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_document_lines');
    }
};
