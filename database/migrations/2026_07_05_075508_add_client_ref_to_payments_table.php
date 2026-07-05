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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('client_ref', 100)->nullable()->after('id');
            $table->unique(['company_id', 'client_ref'], 'uniq_payments_company_client_ref');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('uniq_payments_company_client_ref');
            $table->dropColumn('client_ref');
        });
    }
};
