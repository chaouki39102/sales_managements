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
     * ✅ إعدادات الجلب — فلاتر + فرز كاملة متوافقة مع DataTable v7
     */
    protected function getListConfig(): array
    {
        return array_merge(parent::getListConfig(), [
            'allowed_filters' => [
                // ─ بحث نصي شامل
                AllowedFilter::partial('search', null)->ignore([null, '']),

                // ─ فلاتر أساسية
                AllowedFilter::exact('document_type_id'),
                AllowedFilter::exact('fiscal_year_id'),

                // ─ الحالة (عبر العلاقة)
                AllowedFilter::callback('document_status.name', function ($query, $value) {
                    $query->whereHas('documentStatus', fn ($q) => $q->where('name', $value));
                }),

                // ─ المستودع (بحث نصي)
                AllowedFilter::callback('warehouse.name', function ($query, $value) {
                    $query->whereHas('warehouse', fn ($q) => $q->where('name', 'like', "%{$value}%"));
                }),

                // ─ تاريخ المستند (range)
                AllowedFilter::callback('document_date', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->whereDate('document_date', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->whereDate('document_date', '<=', $value['lte']);
                    }
                }),

                // ─ تاريخ الاستحقاق (range)
                AllowedFilter::callback('due_date', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->whereDate('due_date', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->whereDate('due_date', '<=', $value['lte']);
                    }
                }),

                // ─ الإجماليات (range)
                AllowedFilter::callback('total_ht', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->where('total_ht', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->where('total_ht', '<=', $value['lte']);
                    }
                }),
                AllowedFilter::callback('total_tva', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->where('total_tva', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->where('total_tva', '<=', $value['lte']);
                    }
                }),
                AllowedFilter::callback('total_ttc', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->where('total_ttc', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->where('total_ttc', '<=', $value['lte']);
                    }
                }),
                AllowedFilter::callback('net_to_pay', function ($query, $value) {
                    if (is_array($value)) {
                        if (!empty($value['gte'])) $query->where('net_to_pay', '>=', $value['gte']);
                        if (!empty($value['lte'])) $query->where('net_to_pay', '<=', $value['lte']);
                    }
                }),
            ],

            'allowed_sorts' => [
                AllowedSort::field('document_number'),
                AllowedSort::field('document_date'),
                AllowedSort::field('total_ht'),
                AllowedSort::field('total_tva'),
                AllowedSort::field('total_ttc'),
                AllowedSort::field('net_to_pay'),
                AllowedSort::field('due_date'),
                // ─ فرز عبر العلاقات
                AllowedSort::callback('party.name', function ($query, bool $descending) {
                    $query->leftJoin('parties', 'commercial_documents.party_id', '=', 'parties.id')
                          ->orderBy('parties.name', $descending ? 'desc' : 'asc');
                }),
                AllowedSort::callback('warehouse.name', function ($query, bool $descending) {
                    $query->leftJoin('warehouses', 'commercial_documents.warehouse_id', '=', 'warehouses.id')
                          ->orderBy('warehouses.name', $descending ? 'desc' : 'asc');
                }),
                AllowedSort::callback('document_status.name', function ($query, bool $descending) {
                    $query->leftJoin('document_statuses', 'commercial_documents.document_status_id', '=', 'document_statuses.id')
                          ->orderBy('document_statuses.name', $descending ? 'desc' : 'asc');
                }),
            ],

            'default_sort' => '-document_date',

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
