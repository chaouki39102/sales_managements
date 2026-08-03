<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portal_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_id')->constrained('parties')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 150)->nullable();
            $table->string('email', 150)->index();
            $table->string('password');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'email']);
            $table->unique(['company_id', 'party_id']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE portal_users COMMENT 'حسابات بوابة الزبائن — لكل زبون حساب دخول منفصل للاطلاع على فواتيره وأرصدته'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_users');
    }
};
