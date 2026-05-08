<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('fiscal_stamps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->decimal('min_amount', 15, 4)->comment('الحد الأدنى للمبلغ لتطبيق الطابع');
            $table->decimal('max_amount', 15, 4)->nullable()->comment('الحد الأقصى للمبلغ');
            $table->decimal('stamp_value', 15, 4)->comment('قيمة الطابع الجبائي');
            $table->enum('type', ['fixed', 'percentage'])->default('fixed')->comment('نوع الطابع: ثابت أو نسبة مئوية');
            $table->boolean('active')->default(true)->index();
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE fiscal_stamps COMMENT 'لإدارة قيم وقواعد تطبيق الطابع الجبائي'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('fiscal_stamps');
    }
};
