<?php

namespace App\Services\Fiscal;

use App\Models\IfuDocumentSource;
use App\Models\IfuDocumentSourceCode;
use App\Models\TaxConfiguration;
use App\Models\TimbreBareme;
use App\Models\TvaRate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaxConfigService
{
    public function getActiveConfig(int $companyId, string $regime): TaxConfiguration
    {
        $config = TaxConfiguration::forCompany($companyId)
            ->where('regime', $regime)
            ->where('is_active', true)
            ->with(['tvaRates', 'timbreBareme', 'ifuDocumentSources.codes'])
            ->first();

        if (!$config) {
            $config = $this->createDefault($companyId, $regime);
        }

        return $config;
    }

    public function updateConfig(int $companyId, string $regime, array $data, int $userId): TaxConfiguration
    {
        $current = TaxConfiguration::forCompany($companyId)
            ->where('regime', $regime)
            ->where('is_active', true)
            ->first();

        if ($current) {
            $current->update(['is_active' => false]);
        }

        $tvaRates          = $data['tva_rates'] ?? [];
        $timbreBareme      = $data['timbre_bareme'] ?? [];
        $ifuDocumentSources = $data['ifu_document_sources'] ?? [];

        unset($data['tva_rates'], $data['timbre_bareme'], $data['ifu_document_sources']);

        $data['company_id'] = $companyId;
        $data['regime']     = $regime;
        $data['updated_by'] = $userId;
        $data['version']    = ($current?->version ?? 0) + 1;

        $config = DB::transaction(function () use ($data, $tvaRates, $timbreBareme, $ifuDocumentSources) {
            $config = TaxConfiguration::create($data);

            foreach ($tvaRates as $r) {
                $config->tvaRates()->create([
                    'rate'  => $r['rate'] ?? 0,
                    'label' => $r['label'] ?? '',
                ]);
            }

            foreach ($timbreBareme as $b) {
                $config->timbreBareme()->create([
                    'from_amount' => $b['from'] ?? 0,
                    'to_amount'   => $b['to'] ?? null,
                    'rate'        => $b['rate'] ?? 0,
                    'type'        => $b['type'] ?? 'percent_per_100',
                    'amount'      => $b['amount'] ?? null,
                ]);
            }

            foreach ($ifuDocumentSources as $src) {
                $codes = $src['document_codes'] ?? [];
                unset($src['document_codes']);

                $source = $config->ifuDocumentSources()->create($src);

                foreach ($codes as $code) {
                    $source->codes()->create(['document_code' => $code]);
                }
            }

            return $config->load(['tvaRates', 'timbreBareme', 'ifuDocumentSources.codes']);
        });

        Log::info("TaxConfigService: تحديث النظام {$regime} للشركة {$companyId} (إصدار {$data['version']})");

        return $config;
    }

    public function getHistory(int $companyId, string $regime): Collection
    {
        return TaxConfiguration::forCompany($companyId)
            ->where('regime', $regime)
            ->orderByDesc('version')
            ->get();
    }

    public function getTimbreFiscalAmount(float $documentAmount, bool $isElectronic, int $companyId): float
    {
        $config = $this->getActiveConfig($companyId, 'reel');

        if ($isElectronic && $config->timbre_fiscal_electronic_exempt) {
            return 0;
        }

        $bareme = $config->timbreBareme;
        if ($bareme->isEmpty()) {
            return 0;
        }

        foreach ($bareme as $bracket) {
            $from = (float) $bracket->from_amount;
            $to   = $bracket->to_amount;

            if ($documentAmount >= $from && ($to === null || $documentAmount <= (float) $to)) {
                return match ($bracket->type) {
                    'fixed'           => (float) ($bracket->amount ?? 0),
                    'percent_per_100' => floor($documentAmount / 100) * (float) $bracket->rate,
                    default           => 0,
                };
            }
        }

        return 0;
    }

    private function createDefault(int $companyId, string $regime): TaxConfiguration
    {
        $defaults = $this->getDefaultConfig($regime);
        $tvaRates        = $defaults['tva_rates'] ?? [];
        $timbreBareme    = $defaults['timbre_bareme'] ?? [];
        $ifuDocSources   = $defaults['ifu_document_sources'] ?? [];

        unset($defaults['tva_rates'], $defaults['timbre_bareme'], $defaults['ifu_document_sources']);

        $defaults['company_id'] = $companyId;
        $defaults['regime']     = $regime;
        $defaults['is_active']  = true;

        Log::info("TaxConfigService: إنشاء إعدادات افتراضية للنظام {$regime} للشركة {$companyId}");

        return DB::transaction(function () use ($defaults, $tvaRates, $timbreBareme, $ifuDocSources) {
            $config = TaxConfiguration::create($defaults);

            foreach ($tvaRates as $r) {
                $config->tvaRates()->create($r);
            }
            foreach ($timbreBareme as $b) {
                $config->timbreBareme()->create($b);
            }
            foreach ($ifuDocSources as $src) {
                $codes = $src['document_codes'] ?? [];
                unset($src['document_codes']);
                $source = $config->ifuDocumentSources()->create($src);
                foreach ($codes as $code) {
                    $source->codes()->create(['document_code' => $code]);
                }
            }

            return $config->load(['tvaRates', 'timbreBareme', 'ifuDocumentSources.codes']);
        });
    }

    public function getDefaultConfig(string $regime): array
    {
        if ($regime === 'forfaitaire') {
            return [
                'tva_rates'                    => [],
                'timbre_bareme'                => [],
                'timbre_fiscal_electronic_exempt' => true,
                'g50_deadline_day'             => 20,
                'ifu_rate_goods'               => 0.05,
                'ifu_rate_services'            => 0.12,
                'ifu_rate_auto'                => 0.005,
                'ifu_rate_subsidized'          => null,
                'ifu_minimum'                  => 30000.00,
                'ifu_minimum_auto'             => 10000.00,
                'ifu_ca_threshold'             => 8000000.00,
                'ifu_document_sources'         => [
                    [
                        'category'       => 'subsidized',
                        'base'           => 'purchases',
                        'require_locked' => false,
                        'document_codes' => ['FA', 'BR'],
                    ],
                    [
                        'category'       => 'other_goods',
                        'base'           => 'purchases',
                        'require_locked' => false,
                        'document_codes' => ['FA', 'BR'],
                    ],
                    [
                        'category'       => 'services',
                        'base'           => 'purchases',
                        'require_locked' => false,
                        'document_codes' => ['FA'],
                    ],
                ],
                'ifu_require_locked'           => false,
                'ifu_period_type'              => 'annual',
                'g12_previsionnel_deadline'    => '30/06',
                'g12_definitif_deadline'       => '20/01',
                'g12_tranche1_pct'             => 50,
                'g12_tranche2_pct'             => 25,
                'g12_tranche3_pct'             => 25,
                'g12_tranche2_deadline'        => '15/09',
                'g12_tranche3_deadline'        => '15/12',
                'version'                      => 1,
            ];
        }

        return [
            'tva_rates' => [
                ['rate' => 0.19, 'label' => 'TVA 19%'],
                ['rate' => 0.09, 'label' => 'TVA 9%'],
                ['rate' => 0.00, 'label' => 'TVA 0% (Exonéré)'],
            ],
            'timbre_bareme' => [
                ['from_amount' => 0,      'to_amount' => 300,    'rate' => 0,     'type' => 'fixed',             'amount' => 0],
                ['from_amount' => 301,    'to_amount' => 30000,  'rate' => 0.01,  'type' => 'percent_per_100'],
                ['from_amount' => 30001,  'to_amount' => 100000, 'rate' => 0.015, 'type' => 'percent_per_100'],
                ['from_amount' => 100001, 'to_amount' => null,   'rate' => 0.02,  'type' => 'percent_per_100'],
            ],
            'timbre_fiscal_electronic_exempt' => true,
            'g50_deadline_day'               => 20,
            'ifu_rate_goods'                 => 0.05,
            'ifu_rate_services'              => 0.12,
            'ifu_rate_auto'                  => 0.005,
            'ifu_minimum'                    => 30000.00,
            'ifu_ca_threshold'               => 8000000.00,
            'g12_previsionnel_deadline'      => '30/06',
            'g12_definitif_deadline'         => '20/01',
            'g12_tranche1_pct'               => 50,
            'g12_tranche2_pct'               => 25,
            'g12_tranche3_pct'               => 25,
            'g12_tranche2_deadline'          => '15/09',
            'g12_tranche3_deadline'          => '15/12',
            'ifu_document_sources'           => [],
            'version'                        => 1,
        ];
    }
}
