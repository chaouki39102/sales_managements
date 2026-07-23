<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->decimal('previous_balance_snapshot', 15, 4)->nullable()->after('remaining_amount')
                ->comment('Frozen party balance BEFORE this document — persisted at creation time for historical receipt reprinting');
            $table->decimal('new_balance_snapshot', 15, 4)->nullable()->after('previous_balance_snapshot')
                ->comment('Frozen party balance AFTER this document — persisted at creation time for historical receipt reprinting');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropColumn(['previous_balance_snapshot', 'new_balance_snapshot']);
        });
    }
};
