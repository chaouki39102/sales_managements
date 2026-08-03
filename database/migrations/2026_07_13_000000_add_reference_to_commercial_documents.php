<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * العمود reference (مرجع خارجي BL/BC) كان مفقوداً من الجدول رغم أن
     * النموذج (searchableFields/filterable) والفلاتر والـ FULLTEXT index
     * (2026_07_14_093423 على MySQL) كلها تفترض وجوده → فلتر "المرجع" كان يرمي
     * "no such column" على SQLite / "Unknown column" على MySQL.
     */
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->string('reference', 150)->nullable()->index()
                ->after('document_number')
                ->comment('External reference (BL/BC number)');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropColumn('reference');
        });
    }
};
