<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * فهرس مركّب على commercial_documents لتسريع استعلام PartyBalanceService
 *
 * الاستعلام في getBalanceAt():
 *   WHERE company_id + party_id + fiscal_year_id + is_locked=true
 *   JOIN document_types (affects_accounting=true)
 *   WHERE document_date <= $date
 *
 * الفهارس الموجودة:
 *   idx_docs_by_party_type_date_status  → (company_id, party_id, document_type_id, document_date, document_status_id)
 *   idx_status_date_party               → (company_id, document_status_id, document_date, party_id)
 *
 * المشكلة: لا يوجد فهرس يجمع (party_id + fiscal_year_id + is_locked) معاً.
 * الفهرس الجديد يغطي الاستعلام المحوري لرصيد المتعامل.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->index(
                ['company_id', 'party_id', 'fiscal_year_id', 'is_locked', 'document_date'],
                'idx_docs_party_fiscal_year_balance'
            );
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropIndex('idx_docs_party_fiscal_year_balance');
        });
    }
};
