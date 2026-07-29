<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use App\Models\PriceLevel;
use App\Models\Currency;
use App\Models\PaymentMode;
use App\Models\TreasuryAccount;
use App\Models\FiscalYear;
use App\Models\Setting;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PosLookupsController extends Controller
{
    public function index(CompanyContextService $ctx): JsonResponse
    {
        $companyId = $ctx->get();

        $data = [
            'warehouses'       => Warehouse::select('id', 'name', 'code', 'is_default', 'active')
                ->where('active', true)->orderBy('name')->get(),
            'documentTypes'    => DB::table('document_types as dt')
                ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
                ->where('dt.active', true)
                ->select('dt.id', 'dt.name', 'dt.code', 'dbo.name as operation', 'dt.affects_accounting', 'dt.requires_party')
                ->orderBy('dt.name')->get(),
            'priceLevels'      => PriceLevel::select('id', 'name', 'code', 'active')
                ->where('active', true)->orderBy('name')->get(),
            'currencies'       => Currency::select('id', 'name', 'code', 'symbol', 'is_base_currency', 'exchange_rate', 'active')
                ->where('active', true)->orderBy('name')->get(),
            'paymentModes'     => PaymentMode::select('id', 'name', 'code', 'requires_reference', 'active')
                ->where('active', true)->orderBy('name')->get(),
            'treasuryAccounts' => TreasuryAccount::select('id', 'name', 'code', 'type', 'is_default', 'active')
                ->where('active', true)->orderBy('name')->get(),
            'fiscalYears'      => FiscalYear::select('id', 'name', 'start_date', 'end_date', 'is_current', 'is_closed')
                ->where('is_closed', false)
                ->orderBy('start_date', 'desc')->get(),
            'customers'        => DB::table('parties as p')
                ->join('party_types as pt', 'p.party_type_id', '=', 'pt.id')
                ->where('p.company_id', $companyId)
                ->where('pt.name', 'عميل')
                ->whereNull('p.deleted_at')
                ->select('p.id', 'p.name', 'p.code', 'p.nif', 'p.commercial_name', 'p.party_type_id')
                ->orderBy('p.name')->limit(200)->get(),
            'settings'         => [
                'fiscal_stamp_enabled' => Setting::where('company_id', $companyId)->where('key', 'fiscal_stamp_enabled')->value('value'),
                'allow_negative_stock' => Setting::where('company_id', $companyId)->where('key', 'allow_negative_stock')->value('value'),
                'default_price_level_id' => Setting::where('company_id', $companyId)->where('key', 'default_price_level_id')->value('value'),
            ],
        ];

        return response()->json([
            'status'  => 'success',
            'message' => 'تم بنجاح',
            'data'    => $data,
        ]);
    }
}
