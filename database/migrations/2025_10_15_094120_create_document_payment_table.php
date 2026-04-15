<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_payment pivot table
 *
 * Implements flexible many-to-many relationship between documents and payments
 * Allows a single payment to be split across multiple documents
 * and a single document to be paid by multiple payments
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['commercial_document_id', 'payment_id']);
            $table->index('payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_payment');
    }
};
