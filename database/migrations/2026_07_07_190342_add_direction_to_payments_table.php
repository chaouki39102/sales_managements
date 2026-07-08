<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('direction', 10)->nullable()->after('amount_local')
                ->comment('in for incoming (sale), out for outgoing (purchase/expense)');
        });
    }

    public function down(): void {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('direction');
        });
    }
};
