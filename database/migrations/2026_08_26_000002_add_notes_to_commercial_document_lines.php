<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('line_attributes')->comment('ملاحظة داخلية للسطر');
        });
    }

    public function down(): void {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
