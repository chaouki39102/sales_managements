<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('DROP INDEX payments_payment_number_unique ON payments');
        } else {
            DB::statement('DROP INDEX IF EXISTS payments_payment_number_unique');
        }

        DB::statement('CREATE UNIQUE INDEX payments_company_id_payment_number_unique ON payments (company_id, payment_number)');
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('DROP INDEX payments_company_id_payment_number_unique ON payments');
        } else {
            DB::statement('DROP INDEX IF EXISTS payments_company_id_payment_number_unique');
        }

        DB::statement('CREATE UNIQUE INDEX payments_payment_number_unique ON payments (payment_number)');
    }
};
