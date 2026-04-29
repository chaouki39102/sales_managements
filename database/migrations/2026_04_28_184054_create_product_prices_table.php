<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * جدول أسعار المنتجات — Tarifs
 *
 * ثلاث طرق لتحديد سعر البيع HT لكل تعريفة:
 *
 *   fixed  → السعر مُدخَل مباشرة
 *            price_ht = price
 *
 *   rate   → نسبة ربح فوق سعر الشراء
 *            price_ht = purchase_price_ht × (1 + rate/100)
 *
 *   margin → هامش ربح ثابت بالدج
 *            price_ht = purchase_price_ht + margin
 *
 * الحساب يتم في PHP (ProductPrice::computePrice()) وليس في DB.
 * لا يوجد عمود price_computed لتجنب مشكلة تزامن البيانات.
 *
 * مثال:
 *   منتج A | Détail | fixed  | price=250.00
 *   منتج A | Gros   | rate   | rate=15.00   (15% فوق الشراء)
 *   منتج B | Détail | margin | margin=50.00
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('price_level_id')
                ->constrained('price_levels')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // طريقة التسعير
            $table->enum('pricing_method', ['fixed', 'rate', 'margin'])
                ->default('fixed')
                ->comment('fixed=سعر مباشر | rate=نسبة% فوق الشراء | margin=هامش ثابت دج');

            // قيم الإدخال — فقط الحقل المناسب للطريقة يُملأ، الباقي NULL
            $table->decimal('price', 15, 4)->nullable()
                ->comment('Prix de Vente HT — للطريقة fixed فقط');
            $table->decimal('rate', 8, 4)->nullable()
                ->comment('Taux % — للطريقة rate فقط');
            $table->decimal('margin', 15, 4)->nullable()
                ->comment('Marge دج — للطريقة margin فقط');

            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            // قيد: منتج × تعريفة = سجل واحد فقط
            $table->unique(['product_id', 'price_level_id'], 'product_price_level_unique');
            $table->index(['product_id', 'active']);
        });

        // قيد CHECK: التحقق أن الحقل المناسب مملوء حسب الطريقة
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE product_prices
                ADD CONSTRAINT chk_pricing_method
                CHECK (
                    (pricing_method = 'fixed'  AND price  IS NOT NULL AND price  >= 0) OR
                    (pricing_method = 'rate'   AND rate   IS NOT NULL AND rate   >= 0) OR
                    (pricing_method = 'margin' AND margin IS NOT NULL)
                )
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_prices');
    }
};
