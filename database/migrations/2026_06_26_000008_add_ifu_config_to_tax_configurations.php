<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tax_configurations', function (Blueprint $table) {
            $table->json('ifu_source_document_types')->nullable()->after('ifu_ca_threshold');
            $table->json('ifu_base_options')->nullable()->after('ifu_source_document_types');
            $table->boolean('ifu_require_locked')->default(false)->after('ifu_base_options');
            $table->string('ifu_period_type', 20)->default('annual')->after('ifu_require_locked');
            $table->decimal('ifu_rate_subsidized', 5, 4)->nullable()->after('ifu_rate_auto');
            $table->decimal('ifu_minimum_auto', 15, 2)->nullable()->after('ifu_minimum');
        });
    }

    public function down(): void
    {
        Schema::table('tax_configurations', function (Blueprint $table) {
            $table->dropColumn([
                'ifu_source_document_types',
                'ifu_base_options',
                'ifu_require_locked',
                'ifu_period_type',
                'ifu_rate_subsidized',
                'ifu_minimum_auto',
            ]);
        });
    }
};
