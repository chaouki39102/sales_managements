<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tax_declaration_periods', function (Blueprint $table) {
            $table->decimal('tva_due', 15, 4)->default(0)->after('tva_net');
        });
    }

    public function down(): void
    {
        Schema::table('tax_declaration_periods', function (Blueprint $table) {
            $table->dropColumn('tva_due');
        });
    }
};
