<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إغلاق فتحة التحويل المتكرر: التحويل إلى فاتورة (FV/POS) مسموح مرة واحدة فقط.
 * sale_document_id = المستند التجاري الناتج عن التحويل (أول تحويل ناجح).
 * العلامة تُكتب داخل نفس معاملة التحويل، وتُفحص في بداية convertToSale
 * فيُرفض أي محاولة تحويل ثانية بخطأ 409 — لا يمكن إنشاء فاتورتين من طلب واحد.
 */
return new class extends Migration {
    public function up(): void {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->foreignId('sale_document_id')
                ->nullable()
                ->after('commercial_document_id')
                ->constrained('commercial_documents')
                ->nullOnDelete();
        });
    }

    public function down(): void {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sale_document_id');
        });
    }
};
