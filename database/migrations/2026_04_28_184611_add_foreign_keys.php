<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('stock_lot_id')->references('id')->on('product_lots')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreign('commercial_document_line_id')->references('id')->on('commercial_document_lines')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('stock_lot_id')->references('id')->on('product_lots')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('product_lots', function (Blueprint $table) {
            $table->foreign('stock_movement_id')->references('id')->on('stock_movements')->nullOnDelete()->cascadeOnUpdate();
        });
    }
    public function down(): void {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropForeign(['stock_lot_id']);
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['commercial_document_line_id']);
            $table->dropForeign(['stock_lot_id']);
        });
        Schema::table('product_lots', function (Blueprint $table) {
            $table->dropForeign(['stock_movement_id']);
        });
    }
};
