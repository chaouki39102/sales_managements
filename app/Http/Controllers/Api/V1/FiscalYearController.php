<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalYearResource;
use App\Services\FiscalYearService;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FiscalYearController extends BaseApiController
{
    protected string $resourceName = 'fiscal_year';
    protected ?string $resourceClass = FiscalYearResource::class;

    public function __construct(private FiscalYearService $service)
    {
        parent::__construct();
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = FiscalYear::query();

            if ($request->has('include')) {
                $includes = array_map('trim', explode(',', $request->get('include')));
                $allowed  = ['closedBy'];
                $query->with(array_intersect($allowed, $includes));
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $years   = $query->orderBy('start_date', 'desc')->paginate($perPage);

            return $this->successResponse(
                $years,
                'تم جلب السنوات المالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function current(Request $request): JsonResponse
    {
        try {
            $year = $this->service->getCurrent();
            return $this->successResponse(
                $year ? new FiscalYearResource($year) : null,
                'تم جلب السنة المالية الحالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    public function open(Request $request): JsonResponse
    {
        try {
            $years = $this->service->getOpen();
            return $this->successResponse(
                FiscalYearResource::collection($years),
                'تم جلب السنوات المالية المفتوحة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'open');
        }
    }

    public function close(Request $request): JsonResponse
    {
        try {
            $year  = FiscalYear::findOrFail((int) $request->route('year'));
            $notes = $request->get('notes');
            $year  = $this->service->close($year, auth()->id(), $notes);

            $year->load('closedBy');

            return $this->successResponse(
                new FiscalYearResource($year),
                'تم غلق السنة المالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'close');
        }
    }

    /**
     * حذف السنة المالية مع كل البيانات المرتبطة بها
     */
    public function destroy($id): JsonResponse
    {
        try {
            $year = FiscalYear::findOrFail($this->extractId($id));
            $this->authorizeAction('delete', $year);

            if ($year->is_closed) {
                return $this->errorResponse('لا يمكن حذف سنة مالية مقفلة.', 400);
            }

            if ($year->is_current) {
                return $this->errorResponse('لا يمكن حذف السنة المالية الحالية. عيّن سنة أخرى كحالية أولاً.', 400);
            }

            $relatedCounts = $this->getRelatedCounts($year);

            DB::transaction(function () use ($year) {
                DB::table('commercial_document_lines')
                    ->whereIn('commercial_document_id', $year->commercialDocuments()->pluck('id'))
                    ->delete();
                $year->commercialDocuments()->delete();
                $year->payments()->delete();
                $year->expenses()->delete();
                $year->stockMovements()->delete();
                $year->openingBalancesTreasury()->delete();
                $year->openingBalancesStock()->delete();
                $year->openingBalancesParties()->delete();
                $year->delete();
            });

            return $this->successResponse(
                ['deleted' => $relatedCounts],
                'تم حذف السنة المالية وكل البيانات المرتبطة بها بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    /**
     * استيراد الأرصدة الافتتاحية من سنة أخرى
     * POST /fiscal-years/{year}/import-from/{sourceYear}
     */
    public function importBalances(Request $request): JsonResponse
    {
        $yearId       = (int) $request->route('year');
        $sourceYearId = (int) $request->route('sourceYear');
        return $this->doImportBalances($yearId, $sourceYearId, $request);
    }

    /**
     * ترحيل الأرصدة الافتتاحية من سنة إلى أخرى
     * POST /fiscal-years/{year}/transfer-to/{targetYear}
     */
    public function transferBalances(Request $request): JsonResponse
    {
        $sourceYearId = (int) $request->route('year');
        $targetYearId = (int) $request->route('targetYear');
        return $this->doImportBalances($targetYearId, $sourceYearId, $request);
    }

    private function doImportBalances(int $yearId, int $sourceYearId, Request $request): JsonResponse
    {
        try {
            $year       = FiscalYear::findOrFail($yearId);
            $sourceYear = FiscalYear::findOrFail($sourceYearId);

            if ($year->company_id !== $sourceYear->company_id) {
                return $this->errorResponse('يجب أن تكون السنتان لنفس الشركة.', 400);
            }

            $importStock    = $request->boolean('stock', true);
            $importParties  = $request->boolean('parties', true);
            $importTreasury = $request->boolean('treasury', true);

            $imported = ['stock' => 0, 'parties' => 0, 'treasury' => 0];

            DB::transaction(function () use ($year, $sourceYear, $importStock, $importParties, $importTreasury, &$imported) {
                if ($importStock) {
                    $rows = DB::table('opening_balances_stock')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'       => $year->company_id,
                            'fiscal_year_id'   => $year->id,
                            'product_id'       => $r->product_id,
                            'warehouse_id'     => $r->warehouse_id,
                            'opening_quantity' => $r->opening_quantity,
                            'opening_value'    => $r->opening_value,
                            'lot_number'       => $r->lot_number,
                            'manufacturing_date' => $r->manufacturing_date,
                            'expiration_date'  => $r->expiration_date,
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_stock')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'],
                            ['opening_quantity', 'opening_value', 'updated_at']
                        );
                        $imported['stock'] = count($rows);
                    }
                }

                if ($importParties) {
                    $rows = DB::table('opening_balances_parties')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'     => $year->company_id,
                            'fiscal_year_id' => $year->id,
                            'party_id'       => $r->party_id,
                            'opening_balance'=> $r->opening_balance,
                            'balance_type'   => $r->balance_type,
                            'created_at'     => now(),
                            'updated_at'     => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_parties')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'party_id'],
                            ['opening_balance', 'balance_type', 'updated_at']
                        );
                        $imported['parties'] = count($rows);
                    }
                }

                if ($importTreasury) {
                    $rows = DB::table('opening_balances_treasury')
                        ->where('fiscal_year_id', $sourceYear->id)
                        ->where('company_id', $year->company_id)
                        ->get()
                        ->map(fn($r) => [
                            'company_id'          => $year->company_id,
                            'fiscal_year_id'      => $year->id,
                            'treasury_account_id' => $r->treasury_account_id,
                            'opening_balance'     => $r->opening_balance,
                            'created_at'          => now(),
                            'updated_at'          => now(),
                        ])->toArray();

                    if (!empty($rows)) {
                        DB::table('opening_balances_treasury')->upsert(
                            $rows,
                            ['company_id', 'fiscal_year_id', 'treasury_account_id'],
                            ['opening_balance', 'updated_at']
                        );
                        $imported['treasury'] = count($rows);
                    }
                }
            });

            return $this->successResponse($imported, 'تم استيراد الأرصدة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'importBalances');
        }
    }

    /**
     * إحصائيات البيانات المرتبطة قبل الحذف
     */
    public function relatedData(Request $request): JsonResponse
    {
        try {
            $year = FiscalYear::findOrFail((int) $request->route('year'));
            return $this->successResponse($this->getRelatedCounts($year));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'relatedData');
        }
    }

    private function getRelatedCounts(FiscalYear $year): array
    {
        return [
            'documents'    => $year->commercialDocuments()->count(),
            'payments'     => $year->payments()->count(),
            'expenses'     => $year->expenses()->count(),
            'stock_movements' => $year->stockMovements()->count(),
            'stock_balances'  => $year->openingBalancesStock()->count(),
            'party_balances'  => $year->openingBalancesParties()->count(),
            'treasury_balances' => $year->openingBalancesTreasury()->count(),
            'pos_sessions' => $year->posSessions()->count(),
            'total'        => $year->commercialDocuments()->count()
                           + $year->payments()->count()
                           + $year->expenses()->count()
                           + $year->stockMovements()->count()
                           + $year->openingBalancesStock()->count()
                           + $year->openingBalancesParties()->count()
                           + $year->openingBalancesTreasury()->count()
                           + $year->posSessions()->count(),
        ];
    }

    protected function getService(): FiscalYearService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return FiscalYear::class;
    }
}
