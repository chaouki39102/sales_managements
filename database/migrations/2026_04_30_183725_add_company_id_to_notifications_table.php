// database/migrations/2026_04_30_000002_add_company_id_to_notifications_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // إضافة company_id مع فهرس لتحسين الأداء
            $table->foreignId('company_id')
                ->nullable()
                ->after('type')
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index('company_id');

            // إضافة فهرس مركب لتسريع استعلامات الإشعارات لشركة معينة
            $table->index(['company_id', 'notifiable_type', 'notifiable_id'], 'notifications_company_notifiable_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_company_notifiable_idx');
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });
    }
};
