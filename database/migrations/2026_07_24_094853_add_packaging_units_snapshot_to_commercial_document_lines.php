<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->decimal('packaging_units_snapshot', 15, 4)->nullable()->after('packaging_id')
                ->comment('Frozen ProductPackaging.quantity at time of sale — never recompute from live packaging row');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropColumn('packaging_units_snapshot');
        });
    }
};
