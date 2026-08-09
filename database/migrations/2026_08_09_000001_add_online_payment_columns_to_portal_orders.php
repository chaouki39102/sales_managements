<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * أعمدة الدفع الإلكتروني على طلبات بوابة الزبائن.
     *
     * المبادئ:
     *  - payment_intent_id : مرجع نية الدفع لدى المزوّد (MOCK-xxxx / رقم بوابة حقيقي)
     *  - payment_status    : none | pending | succeeded | failed | cancelled
     *  - payment_amount    : المبلغ المحسوب في الخادم وقت الإنشاء (السلطة) —
     *                        يُقارن به مبلغ أي إشعار قبل التطبيق (amount-from-server)
     *  - payment_details   : بيانات إضافية للمزوّد (return_url، حمولة webhook الخام...)
     */
    public function up(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->string('payment_intent_id', 100)->nullable()->unique()->after('sale_document_id');
            $table->string('payment_provider', 30)->nullable()->after('payment_intent_id');
            $table->string('payment_status', 20)->default('none')->index()->after('payment_provider');
            $table->decimal('payment_amount', 15, 4)->nullable()->after('payment_status');
            $table->string('payment_transaction_id', 100)->nullable()->after('payment_amount');
            $table->timestamp('paid_at')->nullable()->after('payment_transaction_id');
            $table->json('payment_details')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropUnique(['payment_intent_id']);
            $table->dropColumn([
                'payment_intent_id',
                'payment_provider',
                'payment_status',
                'payment_amount',
                'payment_transaction_id',
                'paid_at',
                'payment_details',
            ]);
        });
    }
};
