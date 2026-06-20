<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->index(['company_id', 'document_status_id', 'remaining_amount'], 'idx_docs_status_remaining');
            $table->index(['company_id', 'document_date'], 'idx_docs_date');
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->index(['company_id', 'commercial_document_id'], 'idx_cdl_doc');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropIndex('idx_docs_status_remaining');
            $table->dropIndex('idx_docs_date');
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropIndex('idx_cdl_doc');
        });
    }
};
