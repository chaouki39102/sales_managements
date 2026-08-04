<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // طلبات بوابة الزبائن: غلاف حالة/مرجع حول مستند تجاري (commercial_documents).
        // الأسطر والأسعار تعيش في commercial_document_lines — هذا الجدول يحمل
        // المرجع + حالة دورة الطلب (جديد/قيد التجهيز/مكتمل/ملغى) + سجلّ التغيير.
        Schema::create('portal_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('party_id')->nullable()->constrained()->nullOnDelete();
            // المستخدم (users) الذي يعالج الطلب — فارغ حتى يتكفل به مسؤول.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // المستند التجاري المرفق بالطلب (أمر زبون CMD) — القاعدة كلها عليه.
            $table->foreignId('commercial_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete();
            $table->string('reference')->unique();
            $table->string('status', 30)->default('pending')->index();
            $table->text('notes')->nullable();
            // لقطات إجماليات (عرض سريع في القوائم) — المصدر الحقيقي في المستند.
            $table->decimal('total_ht', 15, 4)->default(0);
            $table->decimal('total_tva', 15, 4)->default(0);
            $table->decimal('total_ttc', 15, 4)->default(0);
            $table->timestamp('requested_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'created_at']);
        });

        // سجلّ تتبع حالات الطلب (كل تغيير حالة = صف).
        Schema::create('portal_order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('portal_order_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->index();
            $table->string('changed_by', 20)->default('customer'); // customer | admin
            $table->string('changed_by_name')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['portal_order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_order_status_histories');
        Schema::dropIfExists('portal_orders');
    }
};
