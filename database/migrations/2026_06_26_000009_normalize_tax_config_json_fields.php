<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_tva_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_configuration_id')->constrained('tax_configurations')->cascadeOnDelete();
            $table->decimal('rate', 5, 4);
            $table->string('label', 100);
            $table->timestamps();
        });

        Schema::create('tax_timbre_bareme', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_configuration_id')->constrained('tax_configurations')->cascadeOnDelete();
            $table->decimal('from_amount', 15, 4);
            $table->decimal('to_amount', 15, 4)->nullable();
            $table->decimal('rate', 5, 4);
            $table->string('type', 20)->default('percent_per_100');
            $table->decimal('amount', 15, 4)->nullable();
            $table->timestamps();
        });

        Schema::create('tax_ifu_document_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_configuration_id')->constrained('tax_configurations')->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('base', 20)->default('purchases');
            $table->boolean('require_locked')->default(false);
            $table->timestamps();
            $table->unique(['tax_configuration_id', 'category']);
        });

        Schema::create('tax_ifu_document_source_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_ifu_document_source_id')->constrained('tax_ifu_document_sources')->cascadeOnDelete();
            $table->string('document_code', 10);
            $table->timestamps();
        });

        $configs = DB::table('tax_configurations')->get();
        foreach ($configs as $config) {
            $tvaRates = json_decode($config->tva_rates ?? '[]', true) ?: [];
            foreach ($tvaRates as $rate) {
                DB::table('tax_tva_rates')->insert([
                    'tax_configuration_id' => $config->id,
                    'rate'                => $rate['rate'] ?? 0,
                    'label'               => $rate['label'] ?? '',
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
            }

            $bareme = json_decode($config->timbre_fiscal_bareme ?? '[]', true) ?: [];
            foreach ($bareme as $bracket) {
                DB::table('tax_timbre_bareme')->insert([
                    'tax_configuration_id' => $config->id,
                    'from_amount'          => $bracket['from'] ?? 0,
                    'to_amount'            => $bracket['to'] ?? null,
                    'rate'                 => $bracket['rate'] ?? 0,
                    'type'                 => $bracket['type'] ?? 'percent_per_100',
                    'amount'               => $bracket['amount'] ?? null,
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }

            $sourceTypes = json_decode($config->ifu_source_document_types ?? '{}', true) ?: [];
            $baseOptions = json_decode($config->ifu_base_options ?? '{}', true) ?: [];

            foreach (['subsidized', 'other_goods', 'services'] as $cat) {
                $catConfig = $sourceTypes[$cat] ?? [];
                $catBase   = $baseOptions["{$cat}_base"] ?? 'purchases';

                $sourceId = DB::table('tax_ifu_document_sources')->insertGetId([
                    'tax_configuration_id' => $config->id,
                    'category'             => $cat,
                    'base'                 => $catBase,
                    'require_locked'       => $catConfig['require_locked'] ?? false,
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);

                $codes = $catConfig['document_codes'] ?? [];
                foreach ($codes as $code) {
                    DB::table('tax_ifu_document_source_codes')->insert([
                        'tax_ifu_document_source_id' => $sourceId,
                        'document_code'              => $code,
                        'created_at'                 => now(),
                        'updated_at'                 => now(),
                    ]);
                }
            }
        }

        Schema::table('tax_configurations', function (Blueprint $table) {
            $table->dropColumn([
                'tva_rates',
                'timbre_fiscal_bareme',
                'ifu_source_document_types',
                'ifu_base_options',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('tax_configurations', function (Blueprint $table) {
            $table->json('tva_rates')->nullable();
            $table->json('timbre_fiscal_bareme')->nullable();
            $table->json('ifu_source_document_types')->nullable();
            $table->json('ifu_base_options')->nullable();
        });

        $configs = DB::table('tax_configurations')->get();
        foreach ($configs as $config) {
            $tvaRates = DB::table('tax_tva_rates')
                ->where('tax_configuration_id', $config->id)
                ->get(['rate', 'label']);
            $bareme = DB::table('tax_timbre_bareme')
                ->where('tax_configuration_id', $config->id)
                ->get(['from_amount', 'to_amount', 'rate', 'type', 'amount']);

            $sourceConfig = [];
            $baseOptions  = [];
            $sources = DB::table('tax_ifu_document_sources')
                ->where('tax_configuration_id', $config->id)
                ->get();

            foreach ($sources as $src) {
                $codes = DB::table('tax_ifu_document_source_codes')
                    ->where('tax_ifu_document_source_id', $src->id)
                    ->pluck('document_code');

                $sourceConfig[$src->category] = [
                    'document_codes' => $codes->toArray(),
                    'require_locked' => (bool) $src->require_locked,
                    'base'           => $src->base,
                    'rate_field'     => match ($src->category) {
                        'subsidized'  => 'ifu_rate_subsidized',
                        'other_goods' => 'ifu_rate_goods',
                        'services'    => 'ifu_rate_services',
                        default       => 'ifu_rate_goods',
                    },
                ];
                $baseOptions["{$src->category}_base"] = $src->base;
            }

            DB::table('tax_configurations')
                ->where('id', $config->id)
                ->update([
                    'tva_rates'                => json_encode($tvaRates->toArray()),
                    'timbre_fiscal_bareme'     => json_encode($bareme->toArray()),
                    'ifu_source_document_types' => json_encode($sourceConfig),
                    'ifu_base_options'         => json_encode($baseOptions),
                ]);
        }

        Schema::dropIfExists('tax_ifu_document_source_codes');
        Schema::dropIfExists('tax_ifu_document_sources');
        Schema::dropIfExists('tax_timbre_bareme');
        Schema::dropIfExists('tax_tva_rates');
    }
};
