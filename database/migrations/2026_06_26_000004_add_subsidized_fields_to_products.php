<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // SQLite triggers that reference the products table must be dropped
            // before any ALTER TABLE on products (SQLite limitation).
            $allTriggers = DB::select("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'");
            $dropped = [];
            foreach ($allTriggers as $t) {
                if (stripos($t->sql, 'products') !== false) {
                    $dropped[$t->name] = $t->sql;
                    DB::statement("DROP TRIGGER IF EXISTS `{$t->name}`");
                }
            }

            $colExists = collect(DB::select("PRAGMA table_info(products)"))
                ->contains(fn($c) => $c->name === 'is_subsidized');

            if (!$colExists) {
                Schema::table('products', function (Blueprint $table) {
                    $table->boolean('is_subsidized')->default(false)->after('active');
                    $table->foreignId('regulated_product_config_id')
                          ->nullable()
                          ->constrained('regulated_products_config')
                          ->nullOnDelete()
                          ->after('is_subsidized');
                });
            }

            foreach ($dropped as $sql) {
                DB::statement($sql);
            }
        } else {
            // MySQL / MariaDB — no trigger workarounds needed
            $colExists = Schema::hasColumn('products', 'is_subsidized');
            if (!$colExists) {
                Schema::table('products', function (Blueprint $table) {
                    $table->boolean('is_subsidized')->default(false)->after('active');
                    $table->foreignId('regulated_product_config_id')
                          ->nullable()
                          ->constrained('regulated_products_config')
                          ->nullOnDelete()
                          ->after('is_subsidized');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['regulated_product_config_id']);
            $table->dropColumn(['is_subsidized', 'regulated_product_config_id']);
        });
    }
};
