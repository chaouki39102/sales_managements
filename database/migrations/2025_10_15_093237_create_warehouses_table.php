<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();

            // ✅ name و code ليسا unique عالمياً — الـ unique المركب أسفله يكفي
            $table->string('name', 100);
            $table->string('code', 20)->nullable();
            $table->text('address')->nullable();

            $table->foreignId('commune_id')
                ->nullable()->constrained('communes')
                ->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')
                ->nullable()->constrained('wilayas')
                ->nullOnDelete()->cascadeOnUpdate();

            $table->string('phone', 20)->nullable();
            $table->string('manager_name', 100)->nullable();

            $table->text('activity')->nullable();
            $table->string('rc',  50)->nullable();
            $table->string('nif', 50)->nullable();
            $table->string('nis', 50)->nullable();
            $table->string('ai',  50)->nullable();

            $table->boolean('active')->default(true)->index();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // ✅ unique مركب: نفس الاسم / الكود مسموح في شركات مختلفة
            // (company_id يُضاف في migration add_company_id_to_core_tables)
            // الفهارس العادية هنا — الـ unique المركب في migration منفصل بعد إضافة company_id
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
