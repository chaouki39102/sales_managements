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
            $table->decimal('discount_amount_per_unit', 15, 4)->nullable()->after('discount_percentage')
                ->comment('Frozen per-unit discount from a quantity tier, stored natively — never derived from discount_percentage.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropColumn('discount_amount_per_unit');
        });
    }
};
