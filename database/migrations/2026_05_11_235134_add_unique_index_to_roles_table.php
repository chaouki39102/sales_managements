<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('roles', function (Blueprint $table) {
        // حذف التكرارات الموجودة (سنقوم بها يدوياً بعد ذلك)
        // إضافة الفهرس الفريد
        $table->unique(['company_id', 'name', 'guard_name'], 'roles_company_name_guard_unique');
    });
}

public function down()
{
    Schema::table('roles', function (Blueprint $table) {
        $table->dropUnique('roles_company_name_guard_unique');
    });
}
};
