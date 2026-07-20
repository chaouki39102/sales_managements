<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->decimal('cost_price_ht', 15, 4)->default(0)->after('unit_price_ht');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropColumn('cost_price_ht');
        });
    }
};
