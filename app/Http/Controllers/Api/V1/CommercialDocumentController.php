<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCommercialDocumentRequest;
use App\Http\Requests\UpdateCommercialDocumentRequest;
use App\Http\Resources\CommercialDocumentResource;
use App\Services\QRCodeService;
use App\Services\CommercialDocumentService;
use App\Core\Filters\RangeFilter;
use App\Models\CommercialDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;

/**
 * Commercial Document Controller
 *
 * إدارة الوثائق التجارية (فواتير، عروض أسعار، أوامر شراء)
 *
 * @package App\Http\Controllers\Api\V1
 */
class CommercialDocumentController extends BaseApiController
{
    protected string $resourceName = 'commercial_document';
    protected ?string $resourceClass = CommercialDocumentResource::class;

    public function __construct(
        private CommercialDocumentService $commercialDocumentService,
        private QRCodeService $qrCodeService
    )
    {
        parent::__construct();
    }

    /**
     * عرض قائمة الوثائق التجارية باستخدام الإعدادات والفلاتر المتقدمة.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من صلاحيات العرض المجمع (Multi-Tenancy & RBAC Safe)
            $this->authorizeAction('viewAny', $this->getModelClass());

            // 2. جلب مصفوفة الفلاتر المخصصة
            $customConfig = $this->getListConfig();

            // 3. استدعاء خدمة القوائم المركزية عبر الـ Trait لجلب البيانات (تُرجع LengthAwarePaginator)
            $paginatedData = $this->apiListWithConfig($this->getModelClass(), $customConfig, $request);

            // 4. الـ Trait قد يرجع JsonResponse في حالات خاصة (مثل التصدير للاكسيل)، نتحقق من ذلك:
            if ($paginatedData instanceof JsonResponse) {
                return $paginatedData;
            }

            // 5. تمرير الـ Paginator إلى successResponse لتوحيد الهيكل وتطبيق الـ Resource
            return $this->successResponse(
                $paginatedData,
                'تم جلب قائمة الوثائق التجارية بنجاح'
            );

        } catch (\Throwable $e) {
            // معالجة الخطأ عبر الميكانيزم الموحد للكلاس الأب
            return $this->handleError($e, 'index');
        }
    }

    /**
     * Get unpaid documents
     */
    public function unpaid(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $documents = $this->commercialDocumentService->getUnpaid();

            return $this->successResponse(
                CommercialDocumentResource::collection($documents),
                'تم جلب قائمة الوثائق غير المدفوعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unpaid');
        }
    }

    /**
     * Get overdue documents
     */
    public function overdue(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $documents = $this->commercialDocumentService->getOverdue();

            return $this->successResponse(
                CommercialDocumentResource::collection($documents),
                'تم جلب قائمة الوثائق المتأخرة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'overdue');
        }
    }

    /**
     * Validate document
     */
    public function validateDocument(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->validateDocument($document, $request);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم التحقق من الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'validate');
        }
    }

    /**
     * Lock document
     */
    public function lock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->lockDocument($document);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    /**
     * Unlock document
     */
    public function unlock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->unlockDocument($document);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم فتح قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    /**
     * Cancel document
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('delete', $document);

            $request->validate(['cancellation_reason' => 'required|string|max:500']);

            $this->commercialDocumentService->cancelDocument($document, $request->cancellation_reason);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم إلغاء الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cancel');
        }
    }

    protected function getService(): CommercialDocumentService
    {
        return $this->commercialDocumentService;
    }

    /**
     * ✅ إعدادات الجلب — فلاتر + فرز كاملة متوافقة مع DataTable v7 و RangeFilter القياسي
     */
    protected function getListConfig(): array
{
    return array_merge(parent::getListConfig(), [
        // ✅ المفتاح الصحيح هو 'advanced_filters' وليس 'allowed_filters'
        // ApiListService يقرأ: $config['filters'] + $config['custom_filters'] + $config['advanced_filters']
        'advanced_filters' => [
            AllowedFilter::exact('document_status.name', 'documentStatus.name'),
            AllowedFilter::custom('document_date', new RangeFilter(), 'document_date'),
            AllowedFilter::custom('total_ht',      new RangeFilter(), 'total_ht'),
            AllowedFilter::custom('total_ttc',     new RangeFilter(), 'total_ttc'),
        ],

        // ✅ فلاتر العلاقات كـ partial (بحث نصي)
        'filters' => array_merge(
            // فلاتر الموديل الأصلية
            CommercialDocument::$filterable,
            [
                // بحث نصي على علاقات
                'party.name'     => ['type' => 'partial', 'column' => 'party.name'],
                'warehouse.name' => ['type' => 'partial', 'column' => 'warehouse.name'],
            ]
        ),

        'sorts' => [
            'document_number', 'document_date', 'total_ht', 'total_ttc',
            AllowedSort::callback('party.name', fn($q, $d) =>
                $q->leftJoin('parties', 'commercial_documents.party_id', '=', 'parties.id')
                  ->orderBy('parties.name', $d ? 'desc' : 'asc')),
            AllowedSort::callback('warehouse.name', fn($q, $d) =>
                $q->leftJoin('warehouses', 'commercial_documents.warehouse_id', '=', 'warehouses.id')
                  ->orderBy('warehouses.name', $d ? 'desc' : 'asc')),
            AllowedSort::callback('document_status.name', fn($q, $d) =>
                $q->leftJoin('document_statuses', 'commercial_documents.document_status_id', '=', 'document_statuses.id')
                  ->orderBy('document_statuses.name', $d ? 'desc' : 'asc')),
        ],

        'default_sort'      => 'document_date',
        'default_sort_direction' => 'desc',

        'allowed_includes' => [
            'party', 'warehouse', 'documentType', 'documentStatus',
            'currency', 'fiscalYear', 'lines', 'lines.product',
            'payments', 'payments.paymentMode',
        ],
    ]);
}

    protected function getModelClass(): string
    {
        return CommercialDocument::class;
    }

    public function generateQRCode($id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('view', $document);

            $qrCode = $this->qrCodeService->generateForDocument($document);
            $qrDataString = $this->qrCodeService->getQRDataString($document);

            return $this->successResponse([
                'qr_code_base64' => $qrCode,
                'qr_data_string' => $qrDataString,
            ], 'تم توليد QR Code بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'generateQRCode');
        }
    }
}
