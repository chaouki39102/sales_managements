<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('print_templates', function (Blueprint $table) {
            $table->integer('template_version')->default(1)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('print_templates', function (Blueprint $table) {
            $table->dropColumn('template_version');
        });
    }
};
