<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\TaxConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaxConfigController extends Controller
{
    public function __construct(
        private readonly TaxConfigService $taxConfigService,
    ) {}

    public function ifuSettings(Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $config = $this->taxConfigService->getActiveConfig($company->id, 'forfaitaire');

            $docSources = $config->ifuDocumentSources->mapWithKeys(fn ($s) => [
                $s->category => [
                    'document_codes' => $s->codes->pluck('document_code'),
                    'require_locked' => $s->require_locked,
                    'base'           => $s->base,
                ],
            ]);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'ifu_source_document_types' => $docSources,
                    'ifu_require_locked'        => $config->ifu_require_locked,
                    'ifu_period_type'           => $config->ifu_period_type,
                    'ifu_rate_subsidized'       => $config->ifu_rate_subsidized,
                    'ifu_rate_goods'            => $config->ifu_rate_goods,
                    'ifu_rate_services'         => $config->ifu_rate_services,
                    'ifu_rate_auto'             => $config->ifu_rate_auto,
                    'ifu_minimum'               => $config->ifu_minimum,
                    'ifu_minimum_auto'          => $config->ifu_minimum_auto ?? 10000.00,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function show(Company $company, string $regime): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $config = $this->taxConfigService->getActiveConfig($company->id, $regime);

            return response()->json([
                'status' => 'success',
                'data'   => $config,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Company $company, string $regime): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'tva_rates'                         => 'nullable|array',
                'tva_rates.*.rate'                  => 'numeric|min:0|max:100',
                'tva_rates.*.label'                 => 'string|max:100',
                'timbre_bareme'                     => 'nullable|array',
                'timbre_bareme.*.from_amount'       => 'numeric|min:0',
                'timbre_bareme.*.to_amount'         => 'nullable|numeric',
                'timbre_bareme.*.rate'              => 'numeric|min:0',
                'timbre_bareme.*.type'              => 'string|in:fixed,percent,percent_per_100',
                'timbre_bareme.*.amount'            => 'nullable|numeric',
                'timbre_fiscal_electronic_exempt'   => 'boolean',
                'g50_deadline_day'                  => 'integer|min:1|max:31',
                'ifu_rate_goods'                    => 'numeric|min:0|max:100',
                'ifu_rate_services'                 => 'numeric|min:0|max:100',
                'ifu_rate_auto'                     => 'numeric|min:0|max:100',
                'ifu_minimum'                       => 'numeric|min:0',
                'ifu_ca_threshold'                  => 'numeric|min:0',
                'g12_previsionnel_deadline'         => 'string|max:20',
                'g12_definitif_deadline'            => 'string|max:20',
                'g12_tranche1_pct'                  => 'integer|min:0|max:100',
                'g12_tranche2_pct'                  => 'integer|min:0|max:100',
                'g12_tranche3_pct'                  => 'integer|min:0|max:100',
                'g12_tranche2_deadline'             => 'string|max:20',
                'g12_tranche3_deadline'             => 'string|max:20',
                'ifu_document_sources'              => 'nullable|array',
                'ifu_document_sources.*.category'   => 'required|string|in:subsidized,other_goods,services',
                'ifu_document_sources.*.base'       => 'string|in:purchases,margin,revenue',
                'ifu_document_sources.*.require_locked' => 'boolean',
                'ifu_document_sources.*.document_codes' => 'nullable|array',
                'ifu_document_sources.*.document_codes.*' => 'string|max:10',
                'ifu_require_locked'                => 'boolean',
                'ifu_period_type'                   => 'string|in:annual,monthly',
                'ifu_rate_subsidized'               => 'nullable|numeric|min:0|max:100',
                'ifu_minimum_auto'                  => 'nullable|numeric|min:0',
                'change_notes'                      => 'nullable|string|max:1000',
            ]);

            $config = $this->taxConfigService->updateConfig(
                $company->id,
                $regime,
                $validated,
                auth()->id(),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حفظ إعدادات الجباية بنجاح',
                'data'    => $config,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function history(Company $company, string $regime): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $history = $this->taxConfigService->getHistory($company->id, $regime);

            return response()->json([
                'status' => 'success',
                'data'   => $history,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
