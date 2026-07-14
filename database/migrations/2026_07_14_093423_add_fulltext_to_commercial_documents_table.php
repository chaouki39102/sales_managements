<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') return;

        DB::statement(
            'ALTER TABLE commercial_documents ADD FULLTEXT INDEX idx_docs_fulltext_search (document_number, reference)'
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') return;

        DB::statement('ALTER TABLE commercial_documents DROP INDEX idx_docs_fulltext_search');
    }
};
