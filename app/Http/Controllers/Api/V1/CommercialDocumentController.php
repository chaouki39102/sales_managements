<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCommercialDocumentRequest;
use App\Http\Requests\UpdateCommercialDocumentRequest;
use App\Http\Resources\CommercialDocumentResource;
use App\Services\QRCodeService;
use App\Services\CommercialDocumentService;
use App\Services\PaymentSynchronizer;
use App\Services\PartyBalanceService;
use App\Models\CommercialDocument;
use App\Services\NotificationService;
use App\Models\Company;          // ✅ أضفنا هذا
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommercialDocumentController extends BaseApiController
{
    protected string $resourceName = 'commercial_document';
    protected ?string $resourceClass = CommercialDocumentResource::class;

    public function __construct(
        private CommercialDocumentService $commercialDocumentService,
        private PaymentSynchronizer $paymentSynchronizer,
        private QRCodeService $qrCodeService,
        private NotificationService $notificationService,
        private PartyBalanceService $partyBalanceService,
    ) {
        parent::__construct();
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $query = CommercialDocument::query()->with([
                'party', 'documentStatus', 'warehouse',
                'validatedBy', 'user', 'documentType', 'currency', 'fiscalYear',
            ]);

            $f = $request->input('filter', []);

            foreach (['document_type_id','fiscal_year_id','document_status_id','party_id','warehouse_id','user_id'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, $f[$field]);
                }
            }

            if (isset($f['document_number']) && $f['document_number'] !== '') {
                $query->where('document_number', 'like', '%' . $f['document_number'] . '%');
            }

            if (isset($f['search']) && $f['search'] !== '') {
                $search = $f['search'];
                $isMysql = DB::getDriverName() === 'mysql';

                $query->where(function ($q) use ($search, $isMysql) {
                    if ($isMysql) {
                        $q->whereRaw("MATCH(document_number, reference) AGAINST(? IN BOOLEAN MODE)", [$search . '*']);
                    } else {
                        $q->where('document_number', 'like', "%{$search}%")
                          ->orWhere('reference', 'like', "%{$search}%");
                    }
                    $q->orWhere('notes', 'like', "%{$search}%")
                      ->orWhere('internal_notes', 'like', "%{$search}%");
                });
            }

            if (isset($f['party.name']) && $f['party.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['party.name'])));
                $hasWildcard = fn(string $n) => str_contains($n, '%') || str_contains($n, '_');
                if (count($names) === 1 && !$hasWildcard($names[0])) {
                    $query->whereIn('party_id', fn($q) => $q->select('id')->from('parties')
                        ->where('name', 'like', $names[0]));
                } else {
                    $query->whereHas('party', function ($q) use ($names) {
                        $q->where(function ($inner) use ($names) {
                            foreach ($names as $name) {
                                $inner->orWhere('name', 'like', "%{$name}%");
                            }
                        });
                    });
                }
            }

            if (isset($f['warehouse.name']) && $f['warehouse.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['warehouse.name'])));
                $hasWildcard = fn(string $n) => str_contains($n, '%') || str_contains($n, '_');
                if (count($names) === 1 && !$hasWildcard($names[0])) {
                    $query->whereIn('warehouse_id', fn($q) => $q->select('id')->from('warehouses')
                        ->where('name', 'like', $names[0]));
                } else {
                    $query->whereHas('warehouse', function ($q) use ($names) {
                        $q->where(function ($inner) use ($names) {
                            foreach ($names as $name) {
                                $inner->orWhere('name', 'like', "%{$name}%");
                            }
                        });
                    });
                }
            }

            if (isset($f['document_status.name']) && $f['document_status.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['document_status.name'])));
                $query->whereIn('document_status_id', fn($q) => $q->select('id')->from('document_statuses')
                    ->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhereRaw('LOWER(name) = LOWER(?)', [$name]);
                        }
                    }));
            }

            if (isset($f['user.name']) && $f['user.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['user.name'])));
                $query->whereIn('user_id', fn($q) => $q->select('id')->from('users')
                    ->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhereRaw('LOWER(name) = LOWER(?)', [$name]);
                        }
                    }));
            }

            if (isset($f['validatedBy.name']) && $f['validatedBy.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['validatedBy.name'])));
                $query->whereIn('validated_by', fn($q) => $q->select('id')->from('users')
                    ->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhereRaw('LOWER(name) = LOWER(?)', [$name]);
                        }
                    }));
            }

            $dateFields = ['document_date', 'due_date', 'validated_at', 'created_at', 'updated_at'];
            foreach ($dateFields as $field) {
                if (!isset($f[$field]) || $f[$field] === '') continue;
                $range = $f[$field];
                $parts = array_map('trim', explode(',', $range));
                $minDate = $parts[0] ?? '';
                $maxDate = $parts[1] ?? '';

                $isTimestamp = in_array($field, ['validated_at', 'created_at', 'updated_at']);

                if ($minDate !== '' && $maxDate !== '') {
                    if ($minDate === $maxDate) {
                        if ($isTimestamp) {
                            $query->where($field, '>=', $minDate . ' 00:00:00')
                                  ->where($field, '<=', $minDate . ' 23:59:59');
                        } else {
                            $query->where($field, $minDate);
                        }
                    } else {
                        if ($isTimestamp) {
                            $query->where($field, '>=', $minDate . ' 00:00:00')
                                  ->where($field, '<=', $maxDate . ' 23:59:59');
                        } else {
                            $query->where($field, '>=', $minDate)
                                  ->where($field, '<=', $maxDate);
                        }
                    }
                } elseif ($minDate !== '') {
                    if ($isTimestamp) {
                        $query->where($field, '>=', $minDate . ' 00:00:00');
                    } else {
                        $query->where($field, '>=', $minDate);
                    }
                } elseif ($maxDate !== '') {
                    if ($isTimestamp) {
                        $query->where($field, '<=', $maxDate . ' 23:59:59');
                    } else {
                        $query->where($field, '<=', $maxDate);
                    }
                }
            }

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

            foreach (['reference', 'notes', 'payment_terms'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, 'like', '%' . $f[$field] . '%');
                }
            }

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
    // دوال Route Model Binding المُصلحة (أضفنا Company $company كأول معامل)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Override show() to attach balance_data from backend SSOT.
     */
    public function show($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item = $this->getService()->findById($resolvedId);
            $this->authorizeAction('view', $item);
            $this->attachBalanceData($item);
            return $this->successResponse($this->transformItem($item));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', $this->getModelClass());
            $data = $this->getValidatedData($request);
            $item = $this->getService()->create($data, $request);
            $this->attachBalanceData($item);
            return $this->successResponse(
                $this->transformItem($item),
                "تم إنشاء {$this->resourceName} بنجاح",
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item       = $this->getService()->findById($resolvedId);
            $this->authorizeAction('update', $item);
            $data = $this->getValidatedData($request, $resolvedId);
            $item = $this->getService()->update($item, $data, $request);
            $this->attachBalanceData($item);
            return $this->successResponse(
                $this->transformItem($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

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

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function validateDocument(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->validateDocument($commercialDocument, $request);
            $this->notificationService->success(
                'تم التحقق من المستند',
                $commercialDocument->document_number ?? '',
            );
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم التحقق من الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'validate');
        }
    }

    /**
     * LEGACY — Additive payments endpoint.
     *
     * Kept for backward compatibility (external API consumers).
     * The frontend no longer calls this endpoint.
     *
     * Payments are now synchronized through the unified payments[]
     * workflow inside create() and update() — see syncPayments().
     * POST /documents/{id}/payments still works for legacy clients.
     */
    public function addPayments(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);

            if ($commercialDocument->is_locked) {
                return $this->errorResponse('لا يمكن إضافة دفعات لوثيقة مقفلة.', 409);
            }

            $validated = $request->validate([
                'payments'                         => 'required|array|min:1',
                'payments.*.payment_mode_id'       => 'required|integer',
                'payments.*.amount'                => 'required|numeric|min:0.01',
                'payments.*.payment_date'          => 'required|date',
                'payments.*.reference'             => 'nullable|string|max:255',
                'payments.*.treasury_account_id'   => 'nullable|integer',
            ]);

            DB::transaction(function () use ($commercialDocument, $validated) {
                $this->paymentSynchronizer->syncPayments(
                    $commercialDocument,
                    $validated['payments']
                );
            });

            $this->notificationService->success(
                'تمت إضافة دفعات',
                $commercialDocument->document_number ?? '',
            );

            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh(['payments.paymentMode', 'payments.treasuryAccount', 'documentStatus'])),
                'تمت إضافة الدفعات بنجاح'
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'addPayments');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function lock(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->lockDocument($commercialDocument);
            $this->notificationService->warning(
                'تم قفل المستند',
                $commercialDocument->document_number ?? '',
            );
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function unlock(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->unlockDocument($commercialDocument);
            $this->notificationService->info(
                'تم فتح قفل المستند',
                $commercialDocument->document_number ?? '',
            );
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم فتح قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function cancel(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('delete', $commercialDocument);

            $validated = $request->validate([
                'cancellation_reason' => 'required|string|max:500'
            ]);

            $this->commercialDocumentService->cancelDocument(
                $commercialDocument,
                $validated['cancellation_reason']
            );

            $this->notificationService->warning(
                'تم إلغاء المستند',
                $commercialDocument->document_number ?? '',
            );
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم إلغاء الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cancel');
        }
    }

    /**
     * ✅ مصحح: (Company, CommercialDocument) — لا يوجد $request
     */
    public function generateQRCode(Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('view', $commercialDocument);

            $qrCode       = $this->qrCodeService->generateForDocument($commercialDocument);
            $qrDataString = $this->qrCodeService->getQRDataString($commercialDocument);

            return $this->successResponse(
                ['qr_code_base64' => $qrCode, 'qr_data_string' => $qrDataString],
                'تم توليد QR Code بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'generateQRCode');
        }
    }

    protected function getService(): CommercialDocumentService { return $this->commercialDocumentService; }
    protected function getModelClass(): string { return CommercialDocument::class; }

    private function attachBalanceData(CommercialDocument $doc): void
    {
        if (!$doc->party_id || !$doc->document_date) return;
        try {
            $balanceData = $this->partyBalanceService->getBalanceAt(
                $doc->party_id,
                $doc->document_date
            );
            $currentBalance = $balanceData['current_balance'];

            $doc->loadMissing('documentType.documentBaseOperation');
            $isSale = $doc->documentType?->documentBaseOperation?->name === 'sale';
            $isAccounting = $doc->documentType?->affects_accounting ?? true;

            // For non-accounting documents (BL, DEV, BCC, etc.), getBalanceAt() excludes
            // this document's net_to_pay from currentBalance because it filters by
            // affects_accounting=true. So subtracting net_to_pay would produce a
            // incorrect negative previousBalance. Instead, use currentBalance directly
            // as the old debt — this document doesn't affect it.
            $previousBalance = $isAccounting
                ? ($isSale ? $currentBalance - $doc->net_to_pay : $currentBalance + $doc->net_to_pay)
                : $currentBalance;

            $doc->balance_data = [
                'previous_balance' => round($previousBalance, 2),
                'new_balance'      => round($currentBalance, 2),
            ];
        } catch (\Throwable) {
            $doc->balance_data = null;
        }
    }
}
