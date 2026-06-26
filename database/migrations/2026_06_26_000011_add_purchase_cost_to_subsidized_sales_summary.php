<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subsidized_sales_summary', function (Blueprint $table) {
            $table->decimal('total_purchase_cost', 15, 4)->default(0)->after('total_margin');
        });
    }

    public function down(): void
    {
        Schema::table('subsidized_sales_summary', function (Blueprint $table) {
            $table->dropColumn('total_purchase_cost');
        });
    }
};
