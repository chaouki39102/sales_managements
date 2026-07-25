<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->decimal('discount_percentage', 8, 4)->default(0.00)->change();
        });
    }

    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->decimal('discount_percentage', 8, 2)->default(0.00)->change();
        });
    }
};
