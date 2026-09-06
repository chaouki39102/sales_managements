<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->unsignedBigInteger('version')->default(0)->after('qr_code_data');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropColumn('version');
        });
    }
};