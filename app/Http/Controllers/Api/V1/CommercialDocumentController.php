<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCommercialDocumentRequest;
use App\Http\Requests\UpdateCommercialDocumentRequest;
use App\Http\Resources\CommercialDocumentResource;
use App\Services\QRCodeService;
use App\Services\CommercialDocumentService;
use App\Models\CommercialDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommercialDocumentController extends BaseApiController
{
    protected string $resourceName = 'commercial_document';
    protected ?string $resourceClass = CommercialDocumentResource::class;

    public function __construct(
        private CommercialDocumentService $commercialDocumentService,
        private QRCodeService $qrCodeService
    ) {
        parent::__construct();
    }

    protected function getListConfig(): array
    {
        return [
            'filters' => [
                'document_type_id', 'fiscal_year_id', 'document_status_id',
                'party_id', 'warehouse_id', 'currency_id',
                'is_locked', 'is_proforma', 'is_exported_to_accounting',
                'party.name', 'warehouse.name', 'document_status.name',
                'document_date', 'due_date', 'total_ht', 'total_ttc',
                'net_to_pay', 'remaining_amount', 'reference', 'search',
            ],
            'allowed_includes' => [
                'party', 'warehouse', 'documentType', 'documentStatus',
                'currency', 'fiscalYear', 'lines', 'lines.product',
                'payments', 'payments.paymentMode', 'validatedBy', 'user',
            ],
            'sorts' => [
                'document_number', 'document_date', 'total_ht', 'total_ttc',
                'created_at', 'updated_at', 'party.name', 'warehouse.name', 'document_status.name',
            ],
            'default_sort'           => 'document_date',
            'default_sort_direction' => 'desc',
            'search_fields'          => ['document_number', 'notes', 'internal_notes', 'reference'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $query = CommercialDocument::query()->with([
                'party', 'documentStatus', 'warehouse',
                'validatedBy', 'user', 'documentType', 'currency', 'fiscalYear',
            ]);

            // ══════════════════════════════════════════════════════════════════
            // ✅ IMPORTANT: كل الفلاتر تُقرأ من $f مباشرة كـ array
            //
            // السبب: HTTP يُرسل filter[party.name] → PHP يُحلّلها كـ:
            //   filter = ['party.name' => 'value']  ← مفتاح يحتوي نقطة حرفية
            //
            // $request->has('filter.party.name') و $request->input('filter.party.name')
            // تفشل لأن Laravel يُفسّر النقطة كـ nested path (filter→party→name)
            // بينما الحقيقي هو literal key "party.name" داخل مصفوفة "filter"
            //
            // الحل الوحيد: $f = $request->input('filter', []); isset($f['party.name'])
            // ══════════════════════════════════════════════════════════════════
            $f = $request->input('filter', []);

            // ── 1. فلاتر المفاتيح الأجنبية المباشرة ─────────────────────────
            foreach (['document_type_id','fiscal_year_id','document_status_id','party_id','warehouse_id'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, $f[$field]);
                }
            }

            // ── 2. البحث في رقم المستند ───────────────────────────────────────
            // document_number له filter type:"text" → يصل كـ $f['document_number']
            if (isset($f['document_number']) && $f['document_number'] !== '') {
                $query->where('document_number', 'like', '%' . $f['document_number'] . '%');
            }

            // ── 3. البحث العام (search) ───────────────────────────────────────
            if (isset($f['search']) && $f['search'] !== '') {
                $search = $f['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('document_number', 'like', "%{$search}%")
                      ->orWhere('notes',          'like', "%{$search}%")
                      ->orWhere('internal_notes', 'like', "%{$search}%")
                      ->orWhere('reference',      'like', "%{$search}%");
                });
            }

            // ── 4. فلاتر العلاقات النصية (مفاتيح بنقطة — literal keys) ───────
            // ✅ party.name: يدعم CSV من dynamic-multiselect ("Cevital,CANDIA")
            if (isset($f['party.name']) && $f['party.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['party.name'])));
                $query->whereHas('party', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhere('name', 'like', "%{$name}%");
                        }
                    });
                });
            }

            // ✅ warehouse.name: يدعم CSV
            if (isset($f['warehouse.name']) && $f['warehouse.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['warehouse.name'])));
                $query->whereHas('warehouse', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhere('name', 'like', "%{$name}%");
                        }
                    });
                });
            }

            // ✅ document_status.name: يدعم CSV + case-insensitive
            if (isset($f['document_status.name']) && $f['document_status.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['document_status.name'])));
                $query->whereHas('documentStatus', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhereRaw('LOWER(name) = LOWER(?)', [$name]);
                        }
                    });
                });
            }

            // ── 5. فلاتر التاريخ ──────────────────────────────────────────────
            // ✅ إصلاح رئيسي: document_date في DB هو datetime (UTC)
            //    فلتر "today" يُرسل min=max="2026-06-11"
            //    whereBetween('document_date', ['2026-06-11','2026-06-11']) = فشل على datetime!
            //    الحل: استخدام whereDate() دائماً لحقول التاريخ
            $dateFields = ['document_date', 'due_date', 'validated_at', 'created_at', 'updated_at'];
            foreach ($dateFields as $field) {
                if (!isset($f[$field]) || $f[$field] === '') continue;
                $range = $f[$field];
                $parts = array_map('trim', explode(',', $range));
                $minDate = $parts[0] ?? '';
                $maxDate = $parts[1] ?? '';

                if ($minDate !== '' && $maxDate !== '') {
                    if ($minDate === $maxDate) {
                        // ✅ نفس التاريخ → whereDate() بدلاً من whereBetween
                        $query->whereDate($field, $minDate);
                    } else {
                        // ✅ نطاق تاريخ → whereDate بين يوم البداية ويوم النهاية
                        $query->whereDate($field, '>=', $minDate)
                              ->whereDate($field, '<=', $maxDate);
                    }
                } elseif ($minDate !== '') {
                    $query->whereDate($field, '>=', $minDate);
                } elseif ($maxDate !== '') {
                    $query->whereDate($field, '<=', $maxDate);
                }
            }

            // ── 6. فلاتر الأرقام (نطاق) ──────────────────────────────────────
            $numericFields = ['total_ht','total_tva','total_ttc','total_discount','total_stamp','net_to_pay','remaining_amount'];
            foreach ($numericFields as $field) {
                if (!isset($f[$field]) || $f[$field] === '') continue;
                $range = $f[$field];
                $parts = array_map('trim', explode(',', $range));
                $min = $parts[0] ?? '';
                $max = $parts[1] ?? '';

                if ($min !== '' && $max !== '') {
                    $query->whereBetween($field, [(float)$min, (float)$max]);
                } elseif ($min !== '') {
                    $query->where($field, '>=', (float)$min);
                } elseif ($max !== '') {
                    $query->where($field, '<=', (float)$max);
                }
            }

            // ── 7. فلاتر نصية مباشرة ─────────────────────────────────────────
            foreach (['reference', 'notes', 'payment_terms'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, 'like', '%' . $f[$field] . '%');
                }
            }

            // ── 8. الفرز ─────────────────────────────────────────────────────
            $sortParam    = $request->input('sort', '-document_date');
            $sorts        = explode(',', $sortParam);
            $allowedSorts = [
                'document_number', 'document_date', 'total_ht', 'total_tva',
                'total_ttc', 'net_to_pay', 'remaining_amount',
                'created_at', 'updated_at', 'validated_at',
                'party.name', 'warehouse.name', 'document_status.name',
            ];

            foreach ($sorts as $sortItem) {
                $direction = 'asc';
                if (str_starts_with($sortItem, '-')) {
                    $direction = 'desc';
                    $sortItem  = substr($sortItem, 1);
                }
                if (!in_array($sortItem, $allowedSorts)) continue;

                match ($sortItem) {
                    'party.name' => $query
                        ->leftJoin('parties', 'commercial_documents.party_id', '=', 'parties.id')
                        ->orderBy('parties.name', $direction)
                        ->select('commercial_documents.*'),
                    'warehouse.name' => $query
                        ->leftJoin('warehouses', 'commercial_documents.warehouse_id', '=', 'warehouses.id')
                        ->orderBy('warehouses.name', $direction)
                        ->select('commercial_documents.*'),
                    'document_status.name' => $query
                        ->leftJoin('document_statuses', 'commercial_documents.document_status_id', '=', 'document_statuses.id')
                        ->orderBy('document_statuses.name', $direction)
                        ->select('commercial_documents.*'),
                    default => $query->orderBy('commercial_documents.' . $sortItem, $direction),
                };
            }

            // ── 9. Pagination ─────────────────────────────────────────────────
            $perPage = min((int) $request->input('per_page', 15), 100);

            return $this->successResponse(
                CommercialDocumentResource::collection($query->paginate($perPage)),
                'تم جلب قائمة المستندات بنجاح'
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // باقي الـ actions بدون تغيير
    // ══════════════════════════════════════════════════════════════════════════

    public function unpaid(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);
            return $this->successResponse(
                CommercialDocumentResource::collection($this->commercialDocumentService->getUnpaid()),
                'تم جلب قائمة الوثائق غير المدفوعة بنجاح'
            );
        } catch (\Throwable $e) { return $this->handleError($e, 'unpaid'); }
    }

    public function overdue(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);
            return $this->successResponse(
                CommercialDocumentResource::collection($this->commercialDocumentService->getOverdue()),
                'تم جلب قائمة الوثائق المتأخرة بنجاح'
            );
        } catch (\Throwable $e) { return $this->handleError($e, 'overdue'); }
    }

    public function validateDocument(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);
            $this->commercialDocumentService->validateDocument($document, $request);
            return $this->successResponse(new CommercialDocumentResource($document->fresh()), 'تم التحقق من الوثيقة بنجاح');
        } catch (\Throwable $e) { return $this->handleError($e, 'validate'); }
    }

    public function lock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);
            $this->commercialDocumentService->lockDocument($document);
            return $this->successResponse(new CommercialDocumentResource($document->fresh()), 'تم قفل الوثيقة بنجاح');
        } catch (\Throwable $e) { return $this->handleError($e, 'lock'); }
    }

    public function unlock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);
            $this->commercialDocumentService->unlockDocument($document);
            return $this->successResponse(new CommercialDocumentResource($document->fresh()), 'تم فتح قفل الوثيقة بنجاح');
        } catch (\Throwable $e) { return $this->handleError($e, 'unlock'); }
    }

    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('delete', $document);
            $request->validate(['cancellation_reason' => 'required|string|max:500']);
            $this->commercialDocumentService->cancelDocument($document, $request->cancellation_reason);
            return $this->successResponse(new CommercialDocumentResource($document->fresh()), 'تم إلغاء الوثيقة بنجاح');
        } catch (\Throwable $e) { return $this->handleError($e, 'cancel'); }
    }

    public function generateQRCode($id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('view', $document);
            $qrCode       = $this->qrCodeService->generateForDocument($document);
            $qrDataString = $this->qrCodeService->getQRDataString($document);
            return $this->successResponse(
                ['qr_code_base64' => $qrCode, 'qr_data_string' => $qrDataString],
                'تم توليد QR Code بنجاح'
            );
        } catch (\Throwable $e) { return $this->handleError($e, 'generateQRCode'); }
    }

    protected function getService(): CommercialDocumentService { return $this->commercialDocumentService; }
    protected function getModelClass(): string { return CommercialDocument::class; }
}
