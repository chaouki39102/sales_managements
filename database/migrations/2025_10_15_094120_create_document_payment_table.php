<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'commercial_document_id', 'payment_id'], 'dp_compid_doc_pmt_idx');
            $table->index('payment_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_payment');
    }
};
