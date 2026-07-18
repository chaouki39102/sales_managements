<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop global unique on payment_number — allows PAY-2026-000001 in multiple companies
        DB::statement('DROP INDEX IF EXISTS payments_payment_number_unique');

        // Composite unique: same number allowed across companies, but unique within a company
        DB::statement('CREATE UNIQUE INDEX payments_company_id_payment_number_unique ON payments (company_id, payment_number)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS payments_company_id_payment_number_unique');
        DB::statement('CREATE UNIQUE INDEX payments_payment_number_unique ON payments (payment_number)');
    }
};
