<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StorePartyRequest;
use App\Http\Requests\UpdatePartyRequest;
use App\Http\Resources\PartyResource;
use App\Services\PartyService;
use App\Models\Party;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Party Controller
 *
 * إدارة الأطراف (الزبائن والموردين) مع:
 * - CRUD كامل
 * - تصفية حسب النوع (زبون/مورد)
 * - البحث والترتيب
 * - التحقق من الصلاحيات
 *
 * @package App\Http\Controllers\Api\V1
 */
class PartyController extends BaseApiController
{
    protected string $resourceName = 'party';
    protected ?string $resourceClass = PartyResource::class;

    public function __construct(private PartyService $partyService)
    {
        parent::__construct();
    }

    /**
     * Get customers only
     */
    public function customers(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Party::class);

            $result = $this->partyService->getCustomers($request->all());

            return $this->successResponse(
                PartyResource::collection($result),  // ✅ يدعم paginator تلقائياً
                'تم جلب قائمة الزبائن بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'customers');
        }
    }

    /**
     * GET /cash-client — find or create the default "Client Cash" party.
     */
    public function cashClient(): JsonResponse
    {
        try {
            $companyId = app(CompanyContextService::class)->get();

            $party = Party::where('company_id', $companyId)
                ->where('slug', 'client-cash')
                ->first();

            if (!$party) {
                $clientTypeId = DB::table('party_types')
                    ->where('company_id', $companyId)
                    ->where('name', 'client')
                    ->value('id')
                    ?? DB::table('party_types')
                        ->where('company_id', $companyId)
                        ->value('id');

                if (!$clientTypeId) {
                    return $this->errorResponse('لم يُعثر على نوع أطراف للشركة. تأكد من بذر البيانات.', 422);
                }

                $party = Party::create([
                    'company_id'        => $companyId,
                    'party_type_id'     => $clientTypeId,
                    'code'              => 'CC000',
                    'name'              => 'Client Cash',
                    'slug'              => 'client-cash',
                    'is_tva_exempt'     => true,
                    'is_taxable'        => false,
                    'is_final_consumer' => true,
                    'active'            => true,
                ]);
            }

            return $this->successResponse(
                new PartyResource($party),
                'تم جلب زبون الصندوق'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cashClient');
        }
    }

    public function suppliers(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Party::class);

            $result = $this->partyService->getSuppliers($request->all());

            return $this->successResponse(
                PartyResource::collection($result),
                'تم جلب قائمة الموردين بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suppliers');
        }
    }

    // === Abstract Methods Implementation ===

    protected function getService(): PartyService
    {
        return $this->partyService;
    }

    protected function getModelClass(): string
    {
        return Party::class;
    }
}
