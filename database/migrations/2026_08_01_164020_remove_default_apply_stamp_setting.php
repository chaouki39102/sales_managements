<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the obsolete duplicate apply-stamp global setting — the fiscal
     * stamp is now gated ONLY by the global `fiscal_stamp_enabled` setting.
     */
    public function up(): void
    {
        DB::table('settings')->where('key', 'default_apply_stamp')->delete();
    }

    public function down(): void
    {
        // best-effort restore — the setting no longer exists in the seeder
    }
};
