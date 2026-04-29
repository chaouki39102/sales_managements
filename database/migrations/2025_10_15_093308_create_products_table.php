<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * تشغيل التهجير: إنشاء جدول المنتجات بنسخته النهائية المدمجة.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // --- المعلومات الأساسية ---
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->string('ref', 50)->nullable()->unique()->comment('SKU / مرجع المنتج');
            $table->string('barcode', 50)->nullable()->unique()->comment('الباركود');
            $table->text('description')->nullable();

            // --- التصنيف والروابط الخارجية ---
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_type_id')->constrained('product_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('tva_id')->nullable()->constrained('tvas')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete()->cascadeOnUpdate();

            // --- التسعير (HT) ---
            $table->decimal('purchase_price_ht', 15, 4)->default(0)->comment('سعر الشراء الأساسي');

            // --- إعدادات المخزون ---
            $table->boolean('manages_stock')->default(true);
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('has_lots')->default(false);
            $table->boolean('has_expiration_date')->default(false);
            $table->decimal('min_stock_alert', 15, 4)->default(0);
            $table->decimal('max_stock_alert', 15, 4)->default(0);
            $table->boolean('manages_quantity_discounts')->default(false);

            // --- المواصفات الفيزيائية ---
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('volume', 8, 2)->nullable();
            $table->decimal('length', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();

            $table->foreignId('valuation_method_id')
                ->nullable()
                ->constrained('inventory_valuation_methods')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // --- الحقول المرنة والبيانات الوصفية ---
            $table->json('specifications')->nullable()->comment('خصائص تقنية مرنة');
            $table->json('images')->nullable();

            // SEO
            $table->string('meta_title', 200)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('meta_keywords')->nullable();

            // --- الحالة والرقابة ---
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // --- الفهارس (Indexes) ---
            $table->index(['name', 'active']);
            $table->index(['ref', 'barcode', 'active'], 'idx_products_lookup');
            $table->index(['family_id', 'brand_id', 'active'], 'idx_products_filter');

            // FullText Search - مراعاة MariaDB/MySQL و SQLite
            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'description']);
            }
        });
    }

    /**
     * التراجع عن التهجير.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
