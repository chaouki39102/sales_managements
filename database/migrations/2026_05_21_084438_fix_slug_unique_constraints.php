<?php
// database/migrations/xxxx_fix_slug_unique_constraints.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // brands: من global unique إلى per-company unique
        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['company_id', 'slug'], 'brands_company_id_slug_unique');
        });

        // families: من global unique إلى per-company unique
        Schema::table('families', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['company_id', 'slug'], 'families_company_id_slug_unique');
        });

        // products: لا unique موجود — أضف per-company unique
        Schema::table('products', function (Blueprint $table) {
            // الـ slug nullable — نضيف unique جزئي فقط للقيم غير الـ null
            $table->unique(['company_id', 'slug'], 'products_company_id_slug_unique');
        });

        // parties: unique صحيح بالفعل ✅ — لا تغيير مطلوب
    }

    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique('brands_company_id_slug_unique');
            $table->unique('slug');
        });

        Schema::table('families', function (Blueprint $table) {
            $table->dropUnique('families_company_id_slug_unique');
            $table->unique('slug');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_company_id_slug_unique');
        });
    }
};
