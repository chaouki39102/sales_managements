<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow manual POS/document lines that are not linked to a catalog product.
     * The line's display name is carried in `description`; stock movements are skipped.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->change();
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
        });

        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        Schema::enableForeignKeyConstraints();
    }
};
