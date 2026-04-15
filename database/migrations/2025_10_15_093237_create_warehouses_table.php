<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for warehouses table (renamed from depots)
 *
 * Manages inventory storage locations
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('address')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate();

            $table->string('phone', 20)->nullable();
            $table->string('manager_name', 100)->nullable();

            // Business and Legal Information
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');

            $table->boolean('active')->default(true)->index();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
