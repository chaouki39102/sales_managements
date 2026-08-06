<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * حقول الزبون العام (الطلب العام بدون حساب بوابة):
 *   customer_name    الاسم (إلزامي)
 *   customer_phone   الهاتف (إلزامي)
 *   customer_address العنوان (اختياري)
 *
 * تُخزَّن على الطلب نفسه لأن الطلب العام يُربط بزبون الصندوق الافتراضي
 * (Client Cash) — وحقول الزبون الحقيقية تخص الطلب ولا يجوز خلطها ببيانات
 * زبون الصندوق المشترك.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->string('customer_name', 150)->nullable()->after('party_id');
            $table->string('customer_phone', 30)->nullable()->after('customer_name');
            $table->string('customer_address', 255)->nullable()->after('customer_phone');
        });
    }

    public function down(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropColumn(['customer_name', 'customer_phone', 'customer_address']);
        });
    }
};
