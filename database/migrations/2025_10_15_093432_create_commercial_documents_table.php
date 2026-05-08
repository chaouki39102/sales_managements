<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commercial_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_document_type_id');
            $table->foreignId('numbering_series_id')->constrained('numbering_series')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_numbering_series_id');
            $table->string('document_number', 50);
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_user_id');
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_party_id');
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_warehouse_id');
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_fiscal_year_id');
            $table->foreignId('currency_id')->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_currency_id');
            $table->decimal('exchange_rate', 15, 8)->default(1.00);
            $table->date('document_date');
            $table->timestampTz('issued_at')->nullable()->comment('Datetime with timezone for legal issuance time');
            $table->date('due_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->decimal('total_ht', 15, 4)->default(0.00)->comment('Total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00)->comment('Total VAT');
            $table->decimal('total_discount', 15, 4)->default(0.00)->comment('Total discount');
            $table->decimal('total_stamp', 15, 4)->default(0.00)->comment('Stamp tax');
            $table->decimal('total_ttc', 15, 4)->default(0.00)->comment('Total including tax');
            $table->decimal('net_to_pay', 15, 4)->default(0.00)->comment('Final amount to pay');
            $table->decimal('paid_amount', 15, 4)->default(0.00)->comment('Amount already paid');
            $table->decimal('remaining_amount', 15, 4)->default(0.00)->comment('Amount remaining');
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable()->comment('Internal notes not printed');
            $table->json('payment_terms')->nullable();
            $table->json('shipping_info')->nullable();
            $table->json('legal_mentions')->nullable()->comment('Mandatory legal text for invoices');
            $table->foreignId('document_status_id')->nullable()->constrained('document_statuses')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_status_id');
            $table->foreignId('fiscal_stamp_id')->nullable()->constrained('fiscal_stamps')->nullOnDelete();
            $table->boolean('is_locked')->default(false)->index();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_validated_by');
            $table->boolean('is_proforma')->default(false)->comment('Is this a proforma invoice?');
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('source_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_source_document_id');
            $table->foreignId('cancellation_of_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_cancellation_of_id');
            $table->string('qr_code_data', 500)->nullable();
            $table->boolean('is_exported_to_accounting')->default(false)->index()->comment('Exported to accounting system?');
            $table->timestamp('exported_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_deleted_by');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'document_number']);
            $table->index(['company_id', 'party_id', 'document_type_id', 'document_date', 'document_status_id'], 'idx_docs_by_party_type_date_status');
            $table->index(['company_id', 'document_status_id', 'due_date', 'remaining_amount'], 'idx_docs_due_by_status_date_amount');
            $table->index(['company_id', 'document_status_id', 'document_date', 'party_id'], 'idx_status_date_party');
            $table->index(['company_id', 'warehouse_id', 'document_date', 'document_status_id'], 'idx_warehouse_date_status');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_payment_amounts CHECK (paid_amount <= total_ttc)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_remaining_amount CHECK (remaining_amount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_dates CHECK (due_date IS NULL OR due_date >= document_date)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_discount CHECK (total_discount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_totals CHECK (total_ttc >= 0)');
            DB::statement("ALTER TABLE commercial_documents COMMENT 'الجدول الرئيسي للمستندات التجارية (فواتير، إلخ) - نظام مبسط (TVA وطابع جبائي فقط)'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('commercial_documents');
    }
};
