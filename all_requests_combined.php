<?php

// دمج تلقائي لكل ملفات الـ requests



// ===== ملف: AttachmentController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\AttachmentResource;
use App\Services\AttachmentService;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttachmentController extends BaseApiController
{
    protected string $resourceName = 'attachment';
    protected ?string $resourceClass = AttachmentResource::class;

    public function __construct(private AttachmentService $attachmentService)
    {
        parent::__construct();
    }

    public function download(Request $request, int $id)
    {
        try {
            $attachment = $this->attachmentService->findById($id);
            return response()->download(
                storage_path('app/' . $this->attachmentService->getFilePath($attachment)),
                $attachment->file_name
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'download');
        }
    }

    protected function getService(): AttachmentService
    {
        return $this->attachmentService;
    }

    protected function getModelClass(): string
    {
        return Attachment::class;
    }
}



// ===== ملف: AuditController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\AuditResource;
use App\Services\AuditService;
use App\Models\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends BaseApiController
{
    protected string $resourceName = 'audit';
    protected ?string $resourceClass = AuditResource::class;

    public function __construct(private AuditService $auditService)
    {
        parent::__construct();
    }

    public function byUser(Request $request, int $userId): JsonResponse
    {
        try {
            $audits = $this->auditService->getByUser($userId);
            return $this->successResponse(
                AuditResource::collection($audits),
                'تم جلب سجلات التدقيق للمستخدم بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byUser');
        }
    }

    public function byEvent(Request $request, string $event): JsonResponse
    {
        try {
            $audits = $this->auditService->getByEvent($event);
            return $this->successResponse(
                AuditResource::collection($audits),
                'تم جلب سجلات التدقيق حسب الحدث بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byEvent');
        }
    }

    protected function getService(): AuditService
    {
        return $this->auditService;
    }

    protected function getModelClass(): string
    {
        return Audit::class;
    }
}



// ===== ملف: AuthController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends BaseApiController
{
    protected string $resourceName = 'user';
    protected ?string $resourceClass = null;

    public function __construct(protected AuthService $authService)
    {
        parent::__construct();
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated());
            $user->load('roles');   // ✅ لازم للـ redirect في الواجهة

            return $this->successResponse([
                'user'       => new UserResource($user),
                'token'      => $user->createToken('auth_token')->plainTextToken,
                'token_type' => 'Bearer',
            ], 'تم التسجيل بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'register');
        }
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->login($request->email, $request->password);
            $user->load('roles');   // ✅ الأساس — بدونه الواجهة لا تعرف الدور

            return $this->successResponse([
                'user'       => new UserResource($user),
                'token'      => $user->createToken('auth_token')->plainTextToken,
                'token_type' => 'Bearer',
            ], 'تم دخولك بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'login');
        }
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');   // ✅ للتحقق عند إعادة تحميل الصفحة

        return $this->successResponse(
            new UserResource($user),
            'تم استرجاع البيانات بنجاح'
        );
    }

    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $request->validate([
                'name'  => 'sometimes|string|max:255',
                'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            ]);
            $user->update($data);

            return $this->successResponse(new UserResource($user), 'تم التحديث بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $this->authService->changePassword(
                $request->user(),
                $request->current_password,
                $request->new_password
            );
            return $this->successResponse(null, 'تم تغيير كلمة المرور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
    }

    protected function getService(): AuthService  { return $this->authService; }
    protected function getModelClass(): string    { return User::class; }
}




// ===== ملف: BarcodeController.php =====
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreBarcodeRequest;
use App\Http\Requests\UpdateBarcodeRequest;
use App\Http\Resources\BarcodeResource;
use App\Models\Barcode;
use App\Models\Product;
use App\Services\BarcodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarcodeController extends BaseApiController
{
    protected string $resourceName = 'barcode';
    protected ?string $resourceClass = BarcodeResource::class;

    public function __construct(private BarcodeService $barcodeService)
    {
        parent::__construct();
    }

    protected function getService(): BarcodeService
    {
        return $this->barcodeService;
    }

    protected function getModelClass(): string
    {
        return Barcode::class;
    }

    public function indexByProduct(Request $request, $productId): JsonResponse
    {
        try {
            $product = Product::findOrFail($productId);
            $this->authorizeAction('viewAny', Barcode::class);
            $this->authorizeAction('view', $product);

            $data = $this->apiListWithCallback(
                Barcode::class,
                fn($query) => $query->where('product_id', $productId),
                $request,
                $this->getListConfig(),
            );

            return $this->successResponse($data, 'تم جلب باركودات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = app(StoreBarcodeRequest::class)->validated();

            $product = Product::findOrFail($validatedData['product_id']);
            $this->authorizeAction('create', [Barcode::class, $product]);

            $barcode = $this->barcodeService->create($validatedData, $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم إنشاء الباركود بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

// تغيير السطر 102 ليصبح:
public function update(Request $request, $id): JsonResponse
{
    try {
        // جلب الموديل يدوياً أو عبر السيرفس ليتوافق مع التوقيع
        $barcode = $this->barcodeService->findById($id);

        $this->authorizeAction('update', $barcode);

        // استخدام الـ Validation يدوياً بما أننا لم نمرره في التوقيع
        $validatedData = app(UpdateBarcodeRequest::class)->validated();

        $barcode = $this->barcodeService->update($barcode, $validatedData, $request);

        return $this->successResponse(
            new BarcodeResource($barcode->load('product')),
            'تم تحديث الباركود'
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'update');
    }
}

    public function destroy($id): JsonResponse
    {
        try {
            $barcode = $this->barcodeService->findById($id);
            $this->authorizeAction('delete', $barcode);
            $this->barcodeService->delete($barcode);

            return $this->successResponse(null, 'تم حذف الباركود');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }
}




// ===== ملف: BrandController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\BrandResource;
use App\Services\BrandService;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;

/**
 * Brand Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class BrandController extends BaseApiController
{
    protected string $resourceName = 'brand';
    protected ?string $resourceClass = BrandResource::class;

    public function __construct(private BrandService $brandService)
    {
        parent::__construct();
    }

    protected function getService(): BrandService
    {
        return $this->brandService;
    }

    protected function getModelClass(): string
    {
        return Brand::class;
    }
}




// ===== ملف: CheckController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CheckResource;
use App\Services\CheckService;
use App\Models\Check;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckController extends BaseApiController
{
    protected string $resourceName = 'check';
    protected ?string $resourceClass = CheckResource::class;

    public function __construct(private CheckService $checkService)
    {
        parent::__construct();
    }

    public function pending(Request $request): JsonResponse
    {
        try {
            $checks = $this->checkService->getPending();
            return $this->successResponse(
                CheckResource::collection($checks),
                'تم جلب الشيكات المعلقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'pending');
        }
    }

    public function overdue(Request $request): JsonResponse
    {
        try {
            $checks = $this->checkService->getOverdue();
            return $this->successResponse(
                CheckResource::collection($checks),
                'تم جلب الشيكات المتأخرة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'overdue');
        }
    }

    public function markAsCleared(Request $request, int $id): JsonResponse
    {
        try {
            $check = $this->checkService->findById($id);
            $check = $this->checkService->markAsCleared($check);
            return $this->successResponse(
                new CheckResource($check),
                'تم تصفيه الشيك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsCleared');
        }
    }

    public function markAsBounced(Request $request, int $id): JsonResponse
    {
        try {
            $reason = $request->get('reason', 'Reason not provided');
            $check = $this->checkService->findById($id);
            $check = $this->checkService->markAsBounced($check, $reason);
            return $this->successResponse(
                new CheckResource($check),
                'تم رفض الشيك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsBounced');
        }
    }

    protected function getService(): CheckService
    {
        return $this->checkService;
    }

    protected function getModelClass(): string
    {
        return Check::class;
    }
}



// ===== ملف: CommercialDocumentController.php =====
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




// ===== ملف: CommercialDocumentLineController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommercialDocumentLineResource;
use App\Services\CommercialDocumentLineService;
use App\Models\CommercialDocumentLine;

class CommercialDocumentLineController extends BaseApiController
{
    protected string $resourceName = 'commercial_document_line';
    protected ?string $resourceClass = CommercialDocumentLineResource::class;

    public function __construct(private CommercialDocumentLineService $service)
    {
        parent::__construct();
    }

    protected function getService(): CommercialDocumentLineService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return CommercialDocumentLine::class;
    }
}



// ===== ملف: CommuneController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommuneResource;
use App\Models\Commune;
use App\Models\Wilaya;
use App\Services\CommuneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;   // ✅ الإصلاح: كان مفقوداً مما أسبب الخطأ 500

class CommuneController extends BaseApiController
{
    protected string $resourceName = 'commune';
    protected ?string $resourceClass = CommuneResource::class;

    public function __construct(private CommuneService $communeService)
    {
        parent::__construct();
    }

    /**
     * GET /api/v1/communes/by-wilaya/{wilaya}
     * ✅ مسار عام (بدون slug) — يعيد بلديات ولاية محددة
     */
    public function byWilaya(Request $request, Wilaya $wilaya): JsonResponse
    {
        try {
            $communes = Commune::where('wilaya_id', $wilaya->id)
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'arabic_name', 'post_code', 'wilaya_id']);

            return $this->successResponse(
                CommuneResource::collection($communes),
                'تم جلب بلديات الولاية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byWilaya');
        }
    }

    protected function getService(): CommuneService
    {
        return $this->communeService;
    }

    protected function getModelClass(): string
    {
        return Commune::class;
    }
}




// ===== ملف: CompanyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CompanyController extends BaseApiController
{
    protected string  $resourceName  = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(
        private readonly CompanyService        $companyService,
        private readonly CompanyContextService $context,
    ) {
        parent::__construct(); // ✅ إلزامي
    }

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }

    // ─── مساعد: يقبل id رقمي أو slug نصي أو Company model ──────
    private function resolveCompany(mixed $identifier): Company
    {
        if ($identifier instanceof Company) {
            return $identifier;
        }
        return is_numeric($identifier)
            ? Company::findOrFail((int) $identifier)
            : Company::where('slug', $identifier)->firstOrFail();
    }

    // ─── config لـ ApiListService (يُستخدم فقط عند Super Admin) ─
    protected function getListConfig(): array
    {
        return [
            'search_fields'    => Company::$searchableFields,
            'filters'          => Company::$filterable,
            'sorts'            => Company::$sortable,
            'relations'        => Company::$allowedIncludes,
            'default_includes' => Company::$defaultWith,
            'default_sort'     => Company::$defaultSort,
            'default_per_page' => Company::$defaultPerPage,
            'per_page_limit'   => Company::$perPageLimit,
            'cache_tags'       => Company::$cacheTags,
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // ① index — قائمة الشركات
    // ═══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);

            $user  = auth()->user();
            $query = Company::query()->with(['owner:id,name,email']);

            // Super Admin → كل الشركات | غيره → شركاته فقط
            if (!$user->isSuperAdmin()) {
                // ✅ الإصلاح: users.id وليس user_id (whereHas يبحث في users table)
                $query->whereHas('users', fn($q) => $q->where('users.id', $user->id));
            }

            // فلاتر الحالة — Super Admin فقط
            if ($user->isSuperAdmin() && $request->filled('status')) {
                match ($request->status) {
                    'active'      => $query->active(),
                    'suspended'   => $query->suspended(),
                    'deactivated' => $query->deactivated(),
                    'verified'    => $query->verified(),
                    'trial'       => $query->onTrial(),
                    default       => null,
                };
            }

            // بحث نصي
            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(
                    fn($q) => $q
                        ->where('name', 'like', "%{$s}%")
                        ->orWhere('commercial_name', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%")
                        ->orWhere('nif', 'like', "%{$s}%")
                );
            }

            // فلتر الخطة — Super Admin فقط
            if ($user->isSuperAdmin() && $request->filled('plan')) {
                $query->where('plan', $request->plan);
            }

            $perPage   = min((int) $request->get('per_page', 20), 100);
            $companies = $query->orderBy('name')->paginate($perPage);

            return $this->successResponse(
                CompanyResource::collection($companies),
                'تم جلب قائمة الشركات'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ② show — عرض شركة واحدة
    // ═══════════════════════════════════════════════════════════

    public function show($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('view', $company);

            $company
                ->loadCount(['activeUsers', 'products', 'warehouses', 'parties'])
                ->load(['owner:id,name,email', 'legalForm:id,name', 'wilaya:id,name', 'commune:id,name']);

            return $this->successResponse(new CompanyResource($company));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ③ store — إنشاء شركة جديدة
    // ═══════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Company::class);

            $data = $request->validate([
                'name'            => 'required|string|max:255',
                'commercial_name' => 'nullable|string|max:255',
                'email'           => 'nullable|email|max:100',
                'phone'           => 'nullable|string|max:20',
                'mobile'          => 'nullable|string|max:30',
                'address'         => 'nullable|string|max:500',
                'nif'             => 'nullable|string|max:50|unique:companies,nif',
                'nis'             => 'nullable|string|max:50',
                'rc'              => 'nullable|string|max:50',
                'ai'              => 'nullable|string|max:50',
                'activity'        => 'nullable|string|max:500',
                'legal_form_id'   => 'nullable|exists:legal_forms,id',
                'wilaya_id'       => 'nullable|exists:wilayas,id',
                'commune_id'      => 'nullable|exists:communes,id',
                // حقول Super Admin فقط
                'plan'            => 'nullable|string|in:free,starter,professional,enterprise',
                'max_users'       => 'nullable|integer|min:1',
                'max_warehouses'  => 'nullable|integer|min:1',
                'max_products'    => 'nullable|integer|min:1',
                'notes'           => 'nullable|string|max:5000',
            ]);

            // ✅ تقييد حقول Super Admin على المستخدمين العاديين
            if (!auth()->user()->isSuperAdmin()) {
                unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
            }

            $company = DB::transaction(function () use ($data, $request) {
                $created = $this->companyService->create(
                    array_merge($data, ['owner_id' => auth()->id()]),
                    $request
                );

                // ✅ ربط المالك في pivot — afterCreate في CompanyService قد يفعلها أيضاً
                // insertOrIgnore يضمن عدم التكرار
                DB::table('company_user')->insertOrIgnore([
                    'user_id'    => auth()->id(),
                    'company_id' => $created->id,
                    'role'       => 'owner',
                    'active'     => true,
                    'is_default' => true,
                    'joined_at'  => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return $created;
            });

            return $this->successResponse(
                new CompanyResource($company->load('owner:id,name,email')),
                'تم إنشاء الشركة',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ④ update — تحديث شركة
    // ═══════════════════════════════════════════════════════════

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('update', $company);

            $data = $request->validate([
                'name'            => 'sometimes|string|max:255',
                'commercial_name' => 'nullable|string|max:255',
                'email'           => ['nullable', 'email', 'max:100', Rule::unique('companies')->ignore($company->id)],
                'phone'           => 'nullable|string|max:20',
                'mobile'          => 'nullable|string|max:30',
                'fax'             => 'nullable|string|max:30',
                'address'         => 'nullable|string|max:500',
                'nif'             => ['nullable', 'string', 'max:50', Rule::unique('companies')->ignore($company->id)],
                'nis'             => 'nullable|string|max:50',
                'rc'              => 'nullable|string|max:50',
                'rc_date'         => 'nullable|date',
                'ai'              => 'nullable|string|max:50',
                'activity'        => 'nullable|string|max:500',
                'capital_amount'  => 'nullable|numeric|min:0',
                'legal_form_id'   => 'nullable|exists:legal_forms,id',
                'wilaya_id'       => 'nullable|exists:wilayas,id',
                'commune_id'      => 'nullable|exists:communes,id',
                'bank_name'       => 'nullable|string|max:100',
                'rib'             => 'nullable|string|max:30',
                // حقول Super Admin فقط
                'plan'            => ['nullable', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'       => 'nullable|integer|min:1',
                'max_warehouses'  => 'nullable|integer|min:1',
                'max_products'    => 'nullable|integer|min:1',
                'notes'           => 'nullable|string|max:5000',
            ]);

            if (!auth()->user()->isSuperAdmin()) {
                unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
            }

            // ✅ منع تعديل slug و company_id
            unset($data['slug'], $data['company_id'], $data['owner_id']);

            $company = $this->companyService->update($company, $data, $request);

            return $this->successResponse(
                new CompanyResource($company->load('owner:id,name,email')),
                'تم تحديث الشركة'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑤ destroy — تعطيل شركة (ليس حذفاً نهائياً)
    // ═══════════════════════════════════════════════════════════

    public function destroy($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('delete', $company);
            $company->deactivate(auth()->id());
            return $this->successResponse(null, 'تم تعطيل الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑥ الشركة النشطة (Context)
    // ═══════════════════════════════════════════════════════════

    public function current(): JsonResponse
    {
        try {
            $companyId = $this->context->get();

            if (!$companyId) {
                // ✅ 404 واضح — الـ frontend يعالجه
                return $this->errorResponse('لا توجد شركة نشطة', 404, 'NO_ACTIVE_COMPANY');
            }

            $company = $this->companyService->findById($companyId);
            $this->authorizeAction('view', $company);
            $company->load(['owner:id,name', 'legalForm:id,name', 'wilaya:id,name', 'commune:id,name']);

            return $this->successResponse(new CompanyResource($company), 'الشركة النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    public function switch(Request $request): JsonResponse
    {
        try {
            $request->validate(['company_id' => 'required|integer|exists:companies,id']);

            $company = $this->companyService->findById($request->company_id);
            $this->authorizeAction('switch', $company);

            // ✅ تحقق مزدوج: الشركة يجب أن تكون نشطة وغير معلقة
            abort_if($company->is_suspended, 403, "الشركة معلّقة: {$company->suspension_reason}");
            abort_unless($company->active,   403, 'الشركة غير نشطة');

            $this->companyService->switchContext(auth()->user(), $company);

            return $this->successResponse(
                new CompanyResource($company),
                "تم التبديل إلى: {$company->name}"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑦ إجراءات Super Admin (suspend/verify/plan)
    // ═══════════════════════════════════════════════════════════

    public function suspend(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['reason' => 'nullable|string|max:500']);
            $company->suspend($data['reason'] ?? 'قرار إداري', auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم تعليق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('superAdmin', Company::class);
            $company->unsuspend();
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم رفع التعليق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function verify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('superAdmin', Company::class);
            $company->verify(auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('superAdmin', Company::class);
            $company->unverify();
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم إلغاء التوثيق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function upgradePlan(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('superAdmin', Company::class);

            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);

            $company->upgradePlan($data['plan'], array_filter([
                'max_users'      => $data['max_users']      ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products']   ?? null,
            ]));

            return $this->successResponse(new CompanyResource($company->fresh()), 'تم تحديث الخطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'upgradePlan');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑧ إدارة الأعضاء
    // ═══════════════════════════════════════════════════════════

    public function members(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);

            // getMembersBySlug يُرجع array جاهز — لا يمر بـ CompanyResource
            $members = $this->companyService->getMembersBySlug($company->slug);

            // ✅ successResponse مباشر بدون resource transformation
            return response()->json([
                'status'    => 'success',
                'message'   => 'أعضاء الشركة',
                'data'      => $members,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'members');
        }
    }

    public function addMember(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $data = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
                'role'    => ['nullable', 'string', Rule::in(Company::MEMBER_ROLES)],
            ]);
            $company->addMember($data['user_id'], $data['role'] ?? 'member', auth()->id());
            return $this->successResponse(null, 'تمت إضافة العضو', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'addMember');
        }
    }

    public function removeMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->removeMember($userId);
            return $this->successResponse(null, 'تمت إزالة العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'removeMember');
        }
    }

    public function changeMemberRole(Request $request, Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $data = $request->validate([
                'role' => ['required', 'string', Rule::in(Company::MEMBER_ROLES)],
            ]);
            $company->changeMemberRole($userId, $data['role']);
            return $this->successResponse(null, 'تم تغيير الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changeMemberRole');
        }
    }

    public function deactivateMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->deactivateMember($userId);
            return $this->successResponse(null, 'تم تعطيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivateMember');
        }
    }

    public function activateMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->activateMember($userId);
            return $this->successResponse(null, 'تم تفعيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activateMember');
        }
    }

    public function transferOwnership(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('transferOwnership', $company);
            $data = $request->validate(['user_id' => 'required|integer|exists:users,id']);
            $company->transferOwnership($data['user_id']);
            return $this->successResponse(
                new CompanyResource($company->fresh(['owner:id,name,email'])),
                'تم نقل الملكية'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'transferOwnership');
        }
    }

    public function searchUsers(Request $request, $id): JsonResponse
    {
        $company = $this->resolveCompany($id);
        $email   = $request->get('email', '');

        $users = \App\Models\User::where('email', 'like', "%{$email}%")
            ->orWhere('name', 'like', "%{$email}%")
            ->limit(10)
            ->get(['id', 'name', 'email', 'avatar']);

        return $this->rawSuccessResponse($users);
    }
}




// ===== ملف: CompanySeedController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\DocumentBaseOperationSeeder;
use Database\Seeders\DocumentStatusSeeder;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\ExpenseCategorySeeder;
use Database\Seeders\FiscalStampSeeder;
use Database\Seeders\InventoryValuationMethodSeeder;
use Database\Seeders\LegalFormSeeder;
use Database\Seeders\NumberingSeriesSeeder;
use Database\Seeders\PartyTypeSeeder;
use Database\Seeders\PaymentModeSeeder;
use Database\Seeders\PriceLevelSeeder;
use Database\Seeders\ProductTypeSeeder;
use Database\Seeders\StockMovementTypeSeeder;
use Database\Seeders\TreasuryAccountSeeder;
use Database\Seeders\TreasuryAccountTypeSeeder;
use Database\Seeders\TvaSeeder;
use Database\Seeders\UnitSeeder;
use Database\Seeders\WarehouseSeeder;
use Database\Seeders\WilayaCommuneSeeder;

class CompanySeedController extends Controller
{
    private const SEEDERS = [
        'currencies'                  => [CurrencySeeder::class,                  'currencies'],
        'tvas'                        => [TvaSeeder::class,                        'tvas'],
        'units'                       => [UnitSeeder::class,                       'units'],
        'legal-forms'                 => [LegalFormSeeder::class,                  'legal_forms'],
        'fiscal-stamps'               => [FiscalStampSeeder::class,                'fiscal_stamps'],
        'price-levels'                => [PriceLevelSeeder::class,                 'price_levels'],
        'party-types'                 => [PartyTypeSeeder::class,                  'party_types'],
        'product-types'               => [ProductTypeSeeder::class,                'product_types'],
        'stock-movement-types'        => [StockMovementTypeSeeder::class,          'stock_movement_types'],
        'treasury-account-types'      => [TreasuryAccountTypeSeeder::class,        'treasury_account_types'],
        'document-base-operations'    => [DocumentBaseOperationSeeder::class,      'document_base_operations'],
        'document-statuses'           => [DocumentStatusSeeder::class,             'document_statuses'],
        'document-types'              => [DocumentTypeSeeder::class,               'document_types'],
        'inventory-valuation-methods' => [InventoryValuationMethodSeeder::class,   'inventory_valuation_methods'],
        'warehouses'                  => [WarehouseSeeder::class,                  'warehouses'],
        'treasury-accounts'           => [TreasuryAccountSeeder::class,            'treasury_accounts'],
        'payment-modes'               => [PaymentModeSeeder::class,                'payment_modes'],
        'expense-categories'          => [ExpenseCategorySeeder::class,            'expense_categories'],
        'numbering-series'            => [NumberingSeriesSeeder::class,            'numbering_series'],
        // ✅ إضافة wilayas-communes (كان مفقوداً)
        'wilayas-communes'            => [WilayaCommuneSeeder::class,              'wilayas'],
    ];

    public function run(Company $company, string $seeder): JsonResponse
    {
        // ✅ الإصلاح: استبدال authorize('manage') بتحقق مباشر من الـ permission
        // authorize('manage', $company) كانت تبحث عن CompanyPolicy@manage غير موجودة → 403
        $user = request()->user();

        // السوبر أدمن يمر دائماً
        if (!$user->hasRole('super-admin')) {
            // تحقق أن المستخدم مالك الشركة أو عضو نشط
            $membership = DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->where('active', true)
                ->first();

            if (!$membership) {
                return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
            }

            // تحقق من permission manage_lookups أو update_company
            if (!$user->can('manage_lookups') && !$user->can('update_company')) {
                return response()->json(['message' => 'ليس لديك صلاحية بذر البيانات.'], 403);
            }
        }

        if (!isset(self::SEEDERS[$seeder])) {
            return response()->json(['message' => 'seeder غير معروف: ' . $seeder], 404);
        }

        [$class, $table] = self::SEEDERS[$seeder];

        // التحقق من وجود بيانات مسبقة — تجاهل إذا كان الجدول عالمياً (wilayas, legal_forms...)
        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        if (!in_array($table, $globalTables)) {
            if (DB::table($table)->where('company_id', $company->id)->exists()) {
                return response()->json(['message' => 'البيانات موجودة مسبقاً للشركة']);
            }
        } else {
            // للجداول العالمية: تحقق بدون company_id
            if (DB::table($table)->exists()) {
                return response()->json(['message' => 'البيانات العالمية موجودة مسبقاً']);
            }
        }

        config(['seeding.company_id' => $company->id]);

        return $this->execute($class);
    }

public function seedAll(Company $company): JsonResponse
{
    $user = request()->user();

    if (!$user->hasRole('super-admin')) {
        $membership = DB::table('company_user')
            ->where('user_id', $user->id)
            ->where('company_id', $company->id)
            ->where('active', true)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'ليس لديك صلاحية الوصول لهذه الشركة.'], 403);
        }
    }

    $ordered = array_keys(self::SEEDERS);
    $applied = [];
    $skipped = [];

    foreach ($ordered as $key) {
        [$class, $table] = self::SEEDERS[$key];

        $globalTables = ['wilayas', 'communes', 'legal_forms'];
        $exists = in_array($table, $globalTables)
            ? DB::table($table)->exists()
            : DB::table($table)->where('company_id', $company->id)->exists();

        if ($exists) {
            $skipped[] = $key;
            continue;
        }

        try {
            config(['seeding.company_id' => $company->id]);
            (new $class)->run();
            $applied[] = $key;
        } catch (\Throwable $e) {
            logger()->error("SeedAll فشل ($key) للشركة {$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => "فشل تطبيق {$key}: " . $e->getMessage(),
                'applied' => $applied,
                'skipped' => $skipped,
            ], 500);
        }
    }

    // ✅ تعيين دور admin للمالك بعد اكتمال السيد
    $owner = \App\Models\User::find($company->owner_id);
    if ($owner) {
        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $company->id)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    return response()->json([
        'message' => 'تم تطبيق جميع البيانات الأساسية بنجاح',
        'applied' => $applied,
        'skipped' => $skipped,
    ]);
}

    private function execute(string $class): JsonResponse
    {
        try {
            DB::transaction(fn () => (new $class)->run());
            return response()->json(['message' => 'تم التطبيق بنجاح']);
        } catch (\Throwable $e) {
            logger()->error('CompanySeedController فشل: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}




// ===== ملف: CurrencyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CurrencyResource;
use App\Services\CurrencyService;
use App\Models\Currency;
use Illuminate\Http\JsonResponse;

/**
 * Currency Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class CurrencyController extends BaseApiController
{
    protected string $resourceName = 'currency';
    protected ?string $resourceClass = CurrencyResource::class;

    public function __construct(private CurrencyService $currencyService)
    {
        parent::__construct();
    }

    protected function getService(): CurrencyService
    {
        return $this->currencyService;
    }

    protected function getModelClass(): string
    {
        return Currency::class;
    }
}




// ===== ملف: DashboardController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $summary = $this->dashboardService->getSummary();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب بيانات لوحة التحكم بنجاح',
            'data' => $summary,
        ]);
    }

    public function salesChart(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month');
        $data = $this->dashboardService->getSalesChart($period);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب بيانات المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function topProducts(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getTopProducts($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب المنتجات الأكثر مبيعاً بنجاح',
            'data' => $data,
        ]);
    }

    public function topCustomers(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getTopCustomers($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب أفضل العملاء بنجاح',
            'data' => $data,
        ]);
    }

    public function recentTransactions(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $data = $this->dashboardService->getRecentTransactions($limit);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب المعاملات الأخيرة بنجاح',
            'data' => $data,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $data = $this->dashboardService->getInventorySummary();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب ملخص المخزون بنجاح',
            'data' => $data,
        ]);
    }
}



// ===== ملف: DocumentBaseOperationController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentBaseOperationResource;
use App\Services\DocumentBaseOperationService;
use App\Models\DocumentBaseOperation;

class DocumentBaseOperationController extends BaseApiController
{
    protected string $resourceName = 'document_base_operation';
    protected ?string $resourceClass = DocumentBaseOperationResource::class;

    public function __construct(private DocumentBaseOperationService $documentBaseOperationService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentBaseOperationService
    {
        return $this->documentBaseOperationService;
    }

    protected function getModelClass(): string
    {
        return DocumentBaseOperation::class;
    }
}




// ===== ملف: DocumentStatusController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentStatusResource;
use App\Services\DocumentStatusService;
use App\Models\DocumentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentStatusController extends BaseApiController
{
    protected string $resourceName = 'document_status';
    protected ?string $resourceClass = DocumentStatusResource::class;

    public function __construct(private DocumentStatusService $documentStatusService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentStatusService
    {
        return $this->documentStatusService;
    }

    protected function getModelClass(): string
    {
        return DocumentStatus::class;
    }
}



// ===== ملف: DocumentTypeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentTypeResource;
use App\Services\DocumentTypeService as Service;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentTypeController extends BaseApiController
{
    protected string $resourceName = 'document_type';
    protected ?string $resourceClass = DocumentTypeResource::class;

    public function __construct(private Service $service)
    {
        parent::__construct();
    }

    protected function getService(): Service
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return DocumentType::class;
    }

    /**
     * GET /api/v1/document-types
     * يُعيد قائمة أنواع المستندات مرتبةً — مضمون أن يُعيد data دائماً
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $items = DocumentType::query()
                ->when($request->boolean('active_only'), fn($q) => $q->where('active', true))
                ->orderBy('display_order')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => DocumentTypeResource::collection($items),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'data'    => [],
                'message' => 'فشل تحميل أنواع المستندات: ' . $e->getMessage(),
            ], 500);
        }
    }
}




// ===== ملف: EmployeeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\EmployeeResource;
use App\Services\EmployeeService;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends BaseApiController
{
    protected string $resourceName = 'employee';
    protected ?string $resourceClass = EmployeeResource::class;

    public function __construct(private EmployeeService $employeeService)
    {
        parent::__construct();
    }

    public function active(Request $request): JsonResponse
    {
        try {
            $employees = $this->employeeService->getActiveEmployees();
            return $this->successResponse(
                EmployeeResource::collection($employees),
                'تم جلب قائمة الموظفين النشطين بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): EmployeeService
    {
        return $this->employeeService;
    }

    protected function getModelClass(): string
    {
        return Employee::class;
    }
}



// ===== ملف: EmploymentContractController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\EmploymentContractResource;
use App\Services\EmploymentContractService;
use App\Models\EmploymentContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmploymentContractController extends BaseApiController
{
    protected string $resourceName = 'employment_contract';
    protected ?string $resourceClass = EmploymentContractResource::class;

    public function __construct(private EmploymentContractService $employmentContractService)
    {
        parent::__construct();
    }

    public function active(Request $request, int $employeeId): JsonResponse
    {
        try {
            $contract = $this->employmentContractService->getActiveContract($employeeId);
            return $this->successResponse(
                $contract ? new EmploymentContractResource($contract) : null,
                'تم جلب العقد النشط بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): EmploymentContractService
    {
        return $this->employmentContractService;
    }

    protected function getModelClass(): string
    {
        return EmploymentContract::class;
    }
}



// ===== ملف: ExchangeRateController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExchangeRateResource;
use App\Services\ExchangeRateService;
use App\Models\ExchangeRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangeRateController extends BaseApiController
{
    protected string $resourceName = 'exchange_rate';
    protected ?string $resourceClass = ExchangeRateResource::class;

    public function __construct(private ExchangeRateService $exchangeRateService)
    {
        parent::__construct();
    }

    public function latest(Request $request): JsonResponse
    {
        try {
            $rates = $this->exchangeRateService->getLatest();
            return $this->successResponse(
                ExchangeRateResource::collection($rates),
                'تم جلب آخر أسعار الصرف بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'latest');
        }
    }

    protected function getService(): ExchangeRateService
    {
        return $this->exchangeRateService;
    }

    protected function getModelClass(): string
    {
        return ExchangeRate::class;
    }
}



// ===== ملف: ExpenseCategoryController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseCategoryResource;
use App\Services\ExpenseCategoryService;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends BaseApiController
{
    protected string $resourceName = 'expense_category';
    protected ?string $resourceClass = ExpenseCategoryResource::class;

    public function __construct(private ExpenseCategoryService $expenseCategoryService)
    {
        parent::__construct();
    }

    public function roots(Request $request): JsonResponse
    {
        try {
            $categories = $this->expenseCategoryService->getRoots();
            return $this->successResponse(
                ExpenseCategoryResource::collection($categories),
                'تم جلب الفئات الرئيسية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'roots');
        }
    }

    protected function getService(): ExpenseCategoryService
    {
        return $this->expenseCategoryService;
    }

    protected function getModelClass(): string
    {
        return ExpenseCategory::class;
    }
}



// ===== ملف: ExpenseController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ExpenseResource;
use App\Services\ExpenseService;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExpenseController extends BaseApiController
{
    protected string $resourceName = 'expense';
    protected ?string $resourceClass = ExpenseResource::class;

    public function __construct(private ExpenseService $service)
    {
        parent::__construct();
    }

    public function paid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getPaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'paid');
        }
    }

    public function unpaid(Request $request): JsonResponse
    {
        try {
            $expenses = $this->service->getUnpaid();
            return $this->successResponse(ExpenseResource::collection($expenses), 'تم جلب المصروفات غير المدفوعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unpaid');
        }
    }

    protected function getService(): ExpenseService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return Expense::class;
    }
}



// ===== ملف: FamilyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FamilyResource;
use App\Services\FamilyService;
use App\Models\Family;
use Illuminate\Http\JsonResponse;

/**
 * Family Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class FamilyController extends BaseApiController
{
    protected string $resourceName = 'family';
    protected ?string $resourceClass = FamilyResource::class;

    public function __construct(private FamilyService $familyService)
    {
        parent::__construct();
    }

    protected function getService(): FamilyService
    {
        return $this->familyService;
    }

    protected function getModelClass(): string
    {
        return Family::class;
    }
}




// ===== ملف: FiscalStampController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalStampResource;
use App\Services\FiscalStampService;
use App\Models\FiscalStamp;

class FiscalStampController extends BaseApiController
{
    protected string $resourceName = 'fiscal_stamp';
    protected ?string $resourceClass = FiscalStampResource::class;

    public function __construct(private FiscalStampService $fiscalStampService)
    {
        parent::__construct();
    }

    protected function getService(): FiscalStampService
    {
        return $this->fiscalStampService;
    }

    protected function getModelClass(): string
    {
        return FiscalStamp::class;
    }
}




// ===== ملف: FiscalYearController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FiscalYearResource;
use App\Services\FiscalYearService;
use App\Models\FiscalYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FiscalYearController extends BaseApiController
{
    protected string $resourceName = 'fiscal_year';
    protected ?string $resourceClass = FiscalYearResource::class;

    public function __construct(private FiscalYearService $service)
    {
        parent::__construct();
    }

    /**
     * ✅ index: تحميل علاقة closedBy تلقائياً إذا طُلبت
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FiscalYear::query();

            // تحميل العلاقات المطلوبة
            if ($request->has('include')) {
                $includes = array_map('trim', explode(',', $request->get('include')));
                $allowed  = ['closedBy'];
                $query->with(array_intersect($allowed, $includes));
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $years   = $query->orderBy('start_date', 'desc')->paginate($perPage);

            return $this->successResponse(
                FiscalYearResource::collection($years->items()),
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

    /**
     * ✅ إصلاح close: تحميل العلاقة closedBy بعد الإقفال
     *    حتى يعود الـ Resource بـ closed_by_user صحيحاً
     */
    public function close(Request $request, int $id): JsonResponse
    {
        try {
            $year  = FiscalYear::findOrFail($id);
            $notes = $request->get('notes');
            $year  = $this->service->close($year, auth()->id(), $notes);

            // ✅ تحميل العلاقة بعد الإقفال حتى لا يظهر [object Object]
            $year->load('closedBy');

            return $this->successResponse(
                new FiscalYearResource($year),
                'تم غلق السنة المالية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'close');
        }
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




// ===== ملف: GenderController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\GenderResource;
use App\Services\GenderService;
use App\Models\Gender;

class GenderController extends BaseApiController
{
    protected string $resourceName = 'gender';
    protected ?string $resourceClass = GenderResource::class;

    public function __construct(private GenderService $genderService)
    {
        parent::__construct();
    }

    protected function getService(): GenderService
    {
        return $this->genderService;
    }

    protected function getModelClass(): string
    {
        return Gender::class;
    }
}




// ===== ملف: HasUserPermissionEndpoints.php =====
// ════════════════════════════════════════════════════════════════════════════
// أضف هذين الـ methods لـ UserController الموجود
// (أو أنشئ ملفاً منفصلاً إذا كان UserController كبيراً)
// ════════════════════════════════════════════════════════════════════════════

// في api.php، أضف هذين الـ routes داخل tenant group (⑤):
//
//   Route::get('me/permissions', [UserController::class, 'myPermissions']);
//   Route::get('me/roles',       [UserController::class, 'myRoles']);

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\RoleResource;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Methods to add to UserController
 *
 * GET /{company}/me/permissions → string[] أسماء الصلاحيات
 * GET /{company}/me/roles       → { roles: Role[], permissions: string[] }
 */
trait HasUserPermissionEndpoints
{
    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/permissions
    //
    // ✅ يُرجع قائمة أسماء الصلاحيات للمستخدم الحالي
    // (من دوره داخل الشركة الحالية)
    // ──────────────────────────────────────────────────────────────

    public function myPermissions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // جلب الصلاحيات من خلال Spatie
            // ✅ getAllPermissions() تجمع صلاحيات كل الأدوار + المباشرة
            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse($permissions, 'صلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myPermissions');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/roles
    //
    // ✅ يُرجع أدوار المستخدم + صلاحياته معاً
    // ──────────────────────────────────────────────────────────────

    public function myRoles(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // ✅ جلب أدوار الشركة الحالية فقط
            $companyId = app(\App\Services\CompanyContextService::class)->get();

            $roles = $user->roles()
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with('permissions')
                ->get();

            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse([
                'roles'       => RoleResource::collection($roles),
                'permissions' => $permissions,
            ], 'أدوار وصلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myRoles');
        }
    }
}




// ===== ملف: InventoryController.php =====
// app/Http/Controllers/Api/V1/InventoryController.php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\InventoryStockService;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends BaseApiController
{
    protected string $resourceName = 'inventory';

    public function __construct(private InventoryStockService $inventoryStockService)
    {
        parent::__construct();
    }

    /**
     * المخزون الفعلي لكل المنتجات في تاريخ محدد
     *
     * GET /{company}/inventory/stock-at
     *
     * Params:
     *   date         string  YYYY-MM-DD  (اختياري — اليوم افتراضياً)
     *   warehouse_id integer             (اختياري — كل المستودعات افتراضياً)
     *   search       string              (اختياري)
     */
    public function stockAt(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);

            $request->validate([
                'date'         => 'nullable|date_format:Y-m-d',
                'warehouse_id' => 'nullable|integer|exists:warehouses,id',
                'search'       => 'nullable|string|max:100',
            ]);

            $date        = $request->input('date', now()->toDateString());
            $warehouseId = $request->input('warehouse_id');
            $search      = $request->input('search');

            $data = $this->inventoryStockService->getStockAt($date, $warehouseId, $search);

            return $this->successResponse($data, 'تم جلب المخزون بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'stockAt');
        }
    }

    // ── الإجباريات لـ BaseApiController ──────────────────────────────────────

    protected function getService(): InventoryStockService
    {
        return $this->inventoryStockService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}




// ===== ملف: InventoryValuationMethodController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\InventoryValuationMethodResource;
use App\Services\InventoryValuationMethodService;
use App\Models\InventoryValuationMethod;

class InventoryValuationMethodController extends BaseApiController
{
    protected string $resourceName = 'inventory_valuation_method';
    protected ?string $resourceClass = InventoryValuationMethodResource::class;

    public function __construct(private InventoryValuationMethodService $inventoryValuationMethodService)
    {
        parent::__construct();
    }

    protected function getService(): InventoryValuationMethodService
    {
        return $this->inventoryValuationMethodService;
    }

    protected function getModelClass(): string
    {
        return InventoryValuationMethod::class;
    }
}




// ===== ملف: LegalFormController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\LegalFormResource;
use App\Services\LegalFormService;

class LegalFormController extends BaseApiController
{
    protected string $resourceName = 'legal_form';
    protected ?string $resourceClass = LegalFormResource::class;

    public function __construct(private LegalFormService $legalFormService)
    {
        parent::__construct();
    }

    protected function getService(): LegalFormService
    {
        return $this->legalFormService;
    }

    protected function getModelClass(): string
    {
        return \App\Models\LegalForm::class;
    }
}



// ===== ملف: NotificationController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Auth\Access\AuthorizationException;

class NotificationController extends BaseApiController
{
    protected string $resourceName = 'notification';
    protected ?string $resourceClass = NotificationResource::class;

    public function __construct(private NotificationService $notificationService)
    {
        parent::__construct();
    }

    /**
     * جلب الإشعارات غير المقروءة للمستخدم الحالي
     */
    public function unread(Request $request): JsonResponse
    {
        try {
            // ✅ التحقق من صلاحية viewAny (يفترض أن Policty تسمح للمستخدم بمشاهدة إشعاراته)
            $this->authorizeAction('viewAny', Notification::class);

            $notifications = $this->notificationService->getUnread();
            return $this->successResponse(
                NotificationResource::collection($notifications),
                'تم جلب الإشعارات غير المقروءة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unread');
        }
    }

    /**
     * تعليم إشعار معين كمقروء
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        try {
            $notification = $this->notificationService->findById($id);

            // ✅ التحقق من صلاحية التحديث (يجب أن يكون المستخدم مالك الإشعار)
            $this->authorizeAction('update', $notification);

            $this->notificationService->markAsRead($notification);
            return $this->successResponse(
                new NotificationResource($notification->fresh()),
                'تم تعليم الإشعار كمقروء'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsRead');
        }
    }

    /**
     * تعليم جميع الإشعارات كمقروءة للمستخدم الحالي
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            // ✅ التحقق من صلاحية التحديث على النموذج (ككل)
            $this->authorizeAction('update', Notification::class);

            $this->notificationService->markAllAsRead();
            return $this->successResponse(null, 'تم تعليم جميع الإشعارات كمقروءة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAllAsRead');
        }
    }

    protected function getService(): NotificationService
    {
        return $this->notificationService;
    }

    protected function getModelClass(): string
    {
        return Notification::class;
    }
}




// ===== ملف: NumberingSeriesController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NumberingSeriesResource;
use App\Services\NumberingSeriesService;
use App\Models\NumberingSeries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NumberingSeriesController extends BaseApiController
{
    protected string $resourceName = 'numbering_series';
    protected ?string $resourceClass = NumberingSeriesResource::class;

    public function __construct(private NumberingSeriesService $numberingSeriesService)
    {
        parent::__construct();
    }

    /**
     * معاينة الرقم التالي — لا يزيد العداد (للاستعلام فقط)
     */
    public function previewNextNumber(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $preview = $series->formatNumber($series->last_number + 1);

            return $this->successResponse([
                'series_id' => $series->id,
                'next_number' => $preview,
            ], 'معاينة الرقم التالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'previewNextNumber');
        }
    }

    /**
     * الحصول على الرقم التالي وزيادة العداد (مع قفل الصف لمنع Race Condition)
     */
    public function getNextNumber(Request $request, int $id): JsonResponse
    {
        try {
            $result = $this->numberingSeriesService->getNextNumberWithLock($id);

            return $this->successResponse([
                'series_id' => $result['series_id'],
                'next_number' => $result['next_number'],
            ], 'تم جلب الرقم التالي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'getNextNumber');
        }
    }

    /**
     * مزامنة الرقم الحالي مع أعلى رقم مستخدم فعلياً في المستندات
     */
    public function syncNumber(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->syncWithActualDocuments($id);

            return $this->successResponse(
                $this->transformItem($series),
                'تمت مزامنة الرقم الحالي مع المستندات الفعلية'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'syncNumber');
        }
    }

    public function unlock(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $series = $this->numberingSeriesService->unlock($series);

            return $this->successResponse(
                $this->transformItem($series),
                'تم فتح القفل بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    public function lock(Request $request, int $id): JsonResponse
    {
        try {
            $series = $this->numberingSeriesService->findById($id);
            $series = $this->numberingSeriesService->lock($series);

            return $this->successResponse(
                $this->transformItem($series),
                'تم القفل بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    protected function getService(): NumberingSeriesService
    {
        return $this->numberingSeriesService;
    }

    protected function getModelClass(): string
    {
        return NumberingSeries::class;
    }
}




// ===== ملف: OpeningBalancePartyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\OpeningBalancePartyResource;
use App\Services\OpeningBalancePartyService;
use App\Models\OpeningBalanceParty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalancePartyController extends BaseApiController
{
    protected string $resourceName = 'opening_balance_party';
    protected ?string $resourceClass = OpeningBalancePartyResource::class;

    public function __construct(private OpeningBalancePartyService $openingBalancePartyService)
    {
        parent::__construct();
    }

    protected function getService(): OpeningBalancePartyService
    {
        return $this->openingBalancePartyService;
    }

    protected function getModelClass(): string
    {
        return OpeningBalanceParty::class;
    }
}



// ===== ملف: OpeningBalanceStockController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\OpeningBalanceStockResource;
use App\Services\OpeningBalanceStockService;
use App\Models\OpeningBalanceStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalanceStockController extends BaseApiController
{
    protected string $resourceName = 'opening_balance_stock';
    protected ?string $resourceClass = OpeningBalanceStockResource::class;

    public function __construct(private OpeningBalanceStockService $openingBalanceStockService)
    {
        parent::__construct();
    }

    protected function getService(): OpeningBalanceStockService
    {
        return $this->openingBalanceStockService;
    }

    protected function getModelClass(): string
    {
        return OpeningBalanceStock::class;
    }
}



// ===== ملف: PartyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StorePartyRequest;
use App\Http\Requests\UpdatePartyRequest;
use App\Http\Resources\PartyResource;
use App\Services\PartyService;
use App\Models\Party;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Party Controller
 *
 * إدارة الأطراف (العملاء والموردين) مع:
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
                'تم جلب قائمة العملاء بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'customers');
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




// ===== ملف: PartyTypeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PartyTypeResource;
use App\Services\PartyTypeService;
use App\Models\PartyType;

class PartyTypeController extends BaseApiController
{
    protected string $resourceName = 'party_type';
    protected ?string $resourceClass = PartyTypeResource::class;

    public function __construct(private PartyTypeService $partyTypeService)
    {
        parent::__construct();
    }

    protected function getService(): PartyTypeService
    {
        return $this->partyTypeService;
    }

    protected function getModelClass(): string
    {
        return PartyType::class;
    }
}



// ===== ملف: PaymentController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentResource;
use App\Services\PaymentService;
use App\Models\Payment;

class PaymentController extends BaseApiController
{
    protected string $resourceName = 'payment';
    protected ?string $resourceClass = PaymentResource::class;

    public function __construct(private PaymentService $paymentService)
    {
        parent::__construct();
    }

    protected function getService(): PaymentService
    {
        return $this->paymentService;
    }

    protected function getModelClass(): string
    {
        return Payment::class;
    }

    public function confirmed()
    {
        return $this->getService()->getConfirmed();
    }

    public function pending()
    {
        return $this->getService()->getPending();
    }
}




// ===== ملف: PaymentModeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PaymentModeResource;
use App\Services\PaymentModeService;
use App\Models\PaymentMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentModeController extends BaseApiController
{
    protected string $resourceName = 'payment_mode';
    protected ?string $resourceClass = PaymentModeResource::class;

    public function __construct(private PaymentModeService $paymentModeService)
    {
        parent::__construct();
    }

    public function active(Request $request): JsonResponse
    {
        try {
            $modes = $this->paymentModeService->getActive();
            return $this->successResponse(
                PaymentModeResource::collection($modes),
                'تم جلب أوضاع الدفع النشطة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    protected function getService(): PaymentModeService
    {
        return $this->paymentModeService;
    }

    protected function getModelClass(): string
    {
        return PaymentMode::class;
    }
}



// ===== ملف: PermissionController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PermissionResource;
use App\Services\PermissionService;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PermissionController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET /{company}/permissions                → index()
 *   GET /{company}/permissions/by-group       → byGroup()
 *   GET /{company}/permissions/{permission}   → show($id)
 *
 * القراءة فقط — لا create/update/delete من هنا
 * (الصلاحيات تُنشأ من AdminSystemBootController أو Seeder)
 * ══════════════════════════════════════════════════════════════════
 */
class PermissionController extends BaseApiController
{
    protected string  $resourceName  = 'permission';
    protected ?string $resourceClass = PermissionResource::class;

    public function __construct(private readonly PermissionService $permissionService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/permissions
    // يرث من BaseApiController — HasApiList يبني الـ query
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController

    // ──────────────────────────────────────────────────────────────
    // byGroup — GET /{company}/permissions/by-group?group=xxx
    //
    // ✅ يُرجع:
    //   - بدون ?group : {"group_name": [permissions...], ...}
    //   - مع ?group=xxx: [permissions...]
    // ──────────────────────────────────────────────────────────────

    public function byGroup(Request $request): JsonResponse
    {
        try {
            $group = $request->query('group');
            $data  = $this->permissionService->getByGroup($group);

            if ($group) {
                // مجموعة محددة → collection مسطّحة
                return $this->successResponse(
                    PermissionResource::collection($data),
                    "تم جلب صلاحيات المجموعة: {$group}"
                );
            }

            // كل المجموعات → grouped dict
            // ✅ نُحوّل كل collection في المجموعة إلى PermissionResource
            $grouped = $data->map(
                fn($perms) => PermissionResource::collection($perms)->toArray($request)
            )->toArray();

            return $this->successResponse(
                $grouped,
                'تم جلب الصلاحيات مجمّعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/permissions/{permission}
    // ──────────────────────────────────────────────────────────────

    public function show($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $permission = $this->permissionService->findById($resolvedId);
            $this->authorizeAction('view', $permission);
            return $this->successResponse(new PermissionResource($permission));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): PermissionService
    {
        return $this->permissionService;
    }

    protected function getModelClass(): string
    {
        return Permission::class;
    }

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('permission', 'id');
    }
}




// ===== ملف: PriceLevelController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\PriceLevelResource;
use App\Services\PriceLevelService;
use App\Models\PriceLevel;

class PriceLevelController extends BaseApiController
{
    protected string $resourceName = 'price_level';
    protected ?string $resourceClass = PriceLevelResource::class;

    public function __construct(private PriceLevelService $priceLevelService)
    {
        parent::__construct();
    }

    protected function getService(): PriceLevelService
    {
        return $this->priceLevelService;
    }

    protected function getModelClass(): string
    {
        return PriceLevel::class;
    }
}



// ===== ملف: ProductController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends BaseApiController
{
    protected string $resourceName = 'product';
    protected ?string $resourceClass = ProductResource::class;

    public function __construct(private ProductService $productService)
    {
        parent::__construct();
    }

    // ========== دوال إضافية فقط (غير موجودة في BaseApiController) ==========

    public function active(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getActiveProducts();
            return $this->successResponse(ProductResource::collection($products), 'تم جلب المنتجات النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'active');
        }
    }

    public function byFamily(Request $request, int $familyId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByFamily($familyId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byFamily');
        }
    }

    public function byBrand(Request $request, int $brandId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Product::class);
            $products = $this->productService->getByBrand($brandId);
            return $this->successResponse(ProductResource::collection($products));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byBrand');
        }
    }

    // ========== تجاوز الإعدادات الخاصة بالقائمة ==========

    protected function getListConfig(): array
    {
        return [
            'search_fields'   => Product::$searchableFields,
            'filters'         => Product::$filterable,
            'sorts'           => Product::$sortable,
            'relations'       => Product::$allowedIncludes,
            'default_includes'=> ['family', 'brand', 'productType', 'packagings'],
            'default_sort'    => Product::$defaultSort,
            'default_per_page'=> Product::$defaultPerPage ?? 15,
            'per_page_limit'  => Product::$perPageLimit ?? 100,
            'cache_tags'      => ['products'],
        ];
    }

    // ========== الإجباريات لـ BaseApiController ==========

    protected function getService(): ProductService
    {
        return $this->productService;
    }

    protected function getModelClass(): string
    {
        return Product::class;
    }
}




// ===== ملف: ProductLotController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductLotResource;
use App\Services\ProductLotService;
use App\Models\ProductLot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductLotController extends BaseApiController
{
    protected string $resourceName = 'product_lot';
    protected ?string $resourceClass = ProductLotResource::class;

    public function __construct(private ProductLotService $service)
    {
        parent::__construct();
    }

    public function available(Request $request): JsonResponse
    {
        try {
            $lots = $this->service->getAvailable();
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات المتاحة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'available');
        }
    }

    public function expiring(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);
            $lots = $this->service->getExpiringSoon($days);
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات قريبة الانتهاء بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'expiring');
        }
    }

    protected function getService(): ProductLotService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductLot::class;
    }
}



// ===== ملف: ProductTypeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductTypeResource;
use App\Services\ProductTypeService;
use App\Models\ProductType;

class ProductTypeController extends BaseApiController
{
    protected string $resourceName = 'product_type';
    protected ?string $resourceClass = ProductTypeResource::class;

    public function __construct(private ProductTypeService $productTypeService)
    {
        parent::__construct();
    }

    protected function getService(): ProductTypeService
    {
        return $this->productTypeService;
    }

    protected function getModelClass(): string
    {
        return ProductType::class;
    }
}



// ===== ملف: ProductVariantController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreProductVariantRequest;
use App\Http\Requests\UpdateProductVariantRequest;
use App\Http\Resources\ProductVariantResource;
use App\Models\ProductVariant;
use App\Services\ProductVariantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantController extends BaseApiController
{
    protected string $resourceName = 'product_variant';
    protected ?string $resourceClass = ProductVariantResource::class;

    public function __construct(private ProductVariantService $service)
    {
        parent::__construct();
    }

    protected function getService(): ProductVariantService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductVariant::class;
    }

    // ملاحظة: تم إزالة index و show و destroy لأن BaseApiController
    // يقوم بالمهمة تلقائياً وبنفس المنطق الذي كتبته، إلا إذا أردت تخصيصاً شديداً.

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', $this->getModelClass());

            // تصحيح: استخدام الـ FormRequest يدوياً للحصول على البيانات المفلترة والتوافق مع الأب
            $validatedData = app(StoreProductVariantRequest::class)->validated();

            $variant = $this->service->create($validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم إنشاء المتغير بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('update', $variant);

            // تصحيح: استخدام الـ FormRequest يدوياً
            $validatedData = app(UpdateProductVariantRequest::class)->validated();

            $variant = $this->service->update($variant, $validatedData, $request);

            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم تحديث المتغير'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function indexByProduct(Request $request, $productId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', ProductVariant::class);
            $data = $this->apiListWithCallback(
                ProductVariant::class,
                fn($query) => $query->where('product_id', $productId),
                $request,
                $this->getListConfig()
            );
            return $this->successResponse($data, 'تم جلب متغيرات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }
}




// ===== ملف: QuantityDiscountController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\QuantityDiscountResource;
use App\Services\QuantityDiscountService;
use App\Models\QuantityDiscount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuantityDiscountController extends BaseApiController
{
    protected string $resourceName = 'quantity_discount';
    protected ?string $resourceClass = QuantityDiscountResource::class;

    public function __construct(private QuantityDiscountService $quantityDiscountService)
    {
        parent::__construct();
    }

    protected function getService(): QuantityDiscountService
    {
        return $this->quantityDiscountService;
    }

    protected function getModelClass(): string
    {
        return QuantityDiscount::class;
    }
}



// ===== ملف: ReportController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService)
    {
    }

    public function sales(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'party_id']);
        $data = $this->reportService->salesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المبيعات بنجاح',
            'data' => $data,
        ]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'party_id']);
        $data = $this->reportService->purchasesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المشتريات بنجاح',
            'data' => $data,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->customersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير العملاء بنجاح',
            'data' => $data,
        ]);
    }

    public function suppliers(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->suppliersReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الموردين بنجاح',
            'data' => $data,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $filters = $request->only(['family_id', 'brand_id']);
        $data = $this->reportService->productsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المنتجات بنجاح',
            'data' => $data,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $data = $this->reportService->inventoryReport();
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المخزون بنجاح',
            'data' => $data,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date', 'payment_mode_id']);
        $data = $this->reportService->paymentsReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير المدفوعات بنجاح',
            'data' => $data,
        ]);
    }

    public function taxes(Request $request): JsonResponse
    {
        $filters = $request->only(['from_date', 'to_date']);
        $data = $this->reportService->taxesReport($filters);
        
        return response()->json([
            'success' => true,
            'message' => 'تم جلب تقرير الضرائب بنجاح',
            'data' => $data,
        ]);
    }
}



// ===== ملف: RoleController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Core\Services\ApiListService;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoleController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET    /{company}/roles              → index()
 *   GET    /{company}/roles/{role}       → show($id)
 *   POST   /{company}/roles              → store(Request)
 *   PUT    /{company}/roles/{role}       → update(Request, $id)
 *   DELETE /{company}/roles/{role}       → destroy($id)
 *
 * ✅ متوافق مع BaseApiController:
 *   - extractId() يتعامل مع route params تلقائياً
 *   - resolveRouteId() يبحث عن 'role' ثم 'id' في route params
 *   - getService() و getModelClass() مُعرَّفان
 *   - store() يستخدم StoreRoleRequest (FormRequest)
 *   - update() يستخدم UpdateRoleRequest (FormRequest)
 * ══════════════════════════════════════════════════════════════════
 */
class RoleController extends BaseApiController
{
    protected string  $resourceName  = 'role';
    // Use a plain string here to avoid static analysis errors if the resource
    // class isn't autoloadable in this context.
    protected ?string $resourceClass = 'App\\Http\\Resources\\RoleResource';

    public function __construct(private readonly RoleService $roleService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/roles
    //
    // ✅ BaseApiController::index() يستدعي getListData() → HasApiList
    // HasApiList يبني query من getListConfig() في RoleService
    // getListConfig() يضع ->distinct() لمنع التكرار
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController — لا نحتاج override

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/roles/{role}
    //
    // ✅ extractId() يستخرج 'role' من route params تلقائياً
    // لا نحتاج override إلا لإضافة RoleResource
    // ──────────────────────────────────────────────────────────────


    public function show($id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $user = $this->userService->findById($resolvedId, ['roles', 'company']);
        $this->authorizeAction('view', $user);

        // ✅ إذا كان مالك الشركة، أضف دوره
        $companyId = app(CompanyContextService::class)->get();
        if ($companyId && $user->company && $user->company->owner_id === $user->id) {
            // مالك الشركة — يمكن إضافة دور owner
            // أو تعديل response
        }

        return $this->successResponse(new UserResource($user));
    } catch (\Throwable $e) {
        return $this->handleError($e, 'show');
    }
}

    // ──────────────────────────────────────────────────────────────
    // store — POST /{company}/roles
    //
    // ✅ يستخدم StoreRoleRequest بدل Request عادي
    // BaseApiController::store() يستدعي getValidatedData() التي
    // تتحقق إذا كان الـ request FormRequest → تستدعي validated()
    // ──────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);
            $validatedData = $request instanceof StoreRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->create($validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم إنشاء الدور بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // update — PUT /{company}/roles/{role}
    //
    // ✅ يستخدم UpdateRoleRequest
    // extractId() يحل {role} من route params
    // ──────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('update', $role);
            $validatedData = $request instanceof UpdateRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->update($role, $validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم تحديث الدور بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // destroy — DELETE /{company}/roles/{role}
    // ──────────────────────────────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('delete', $role);

            // ✅ لا نسمح بحذف الأدوار الأساسية
            if (in_array($role->name, ['owner', 'admin', 'super-admin'], true)) {
                return $this->errorResponse(
                    'لا يمكن حذف الأدوار الأساسية للنظام',
                    409,
                    'BUSINESS_RULE_VIOLATION'
                );
            }

            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ──────────────────────────────────────────────────────────────
    // ✅ resolveRouteId — يبحث عن 'role' في route params
    // ──────────────────────────────────────────────────────────────

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('role', 'id');
    }
}




// ===== ملف: SeederController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * SeederController
 *
 * يتيح تشغيل الـ Seeders الفردية عبر API — للإعداد الأولي للشركة.
 * مقتصر على Super Admin أو صاحب الشركة فقط.
 */
class SeederController extends BaseApiController
{
    protected string $resourceName = 'seeder';

    protected function getService(): ?object { return null; }
    protected function getModelClass(): string { return \App\Models\Company::class; }

    /**
     * الـ Seeders المسموح بتشغيلها عبر API
     * (whitelist صريح — لا نسمح بتشغيل أي seeder عشوائي)
     */
    private const ALLOWED = [
        'RolesAndPermissionsSeeder',
        'GenderSeeder',
        'LegalFormSeeder',
        'WilayaCommuneSeeder',
        'CurrencySeeder',
        'TvaSeeder',
        'FiscalStampSeeder',
        'PriceLevelSeeder',
        'PaymentModeSeeder',
        'TreasuryAccountSeeder',
        'ExpenseCategorySeeder',
        'UnitSeeder',
        'InventoryValuationMethodSeeder',
        'WarehouseSeeder',
        'DocumentBaseOperationSeeder',
        'DocumentStatusSeeder',
        'DocumentTypeSeeder',
        'NumberingSeriesSeeder',
        'PartierSeeder',
        'FiscalYearSeeder',
    ];

    public function run(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحية — super-admin أو admin الشركة فقط
            $user = auth()->user();
            if (
                !$user->hasRole('super-admin') &&
                !$user->hasRole('admin')
            ) {
                return $this->errorResponse('ليس لديك صلاحية تشغيل الـ Seeders', 403);
            }

            // 2. التحقق من اسم الـ Seeder
            $seederName = $request->input('seeder');
            if (!$seederName || !in_array($seederName, self::ALLOWED)) {
                return $this->errorResponse(
                    "الـ Seeder '{$seederName}' غير مسموح به أو غير موجود",
                    422
                );
            }

            $class = "Database\\Seeders\\{$seederName}";
            if (!class_exists($class)) {
                return $this->errorResponse("الـ Seeder '{$seederName}' غير موجود في النظام", 404);
            }

            // 3. تشغيل الـ Seeder
            Log::info("Running seeder via API", [
                'seeder'     => $seederName,
                'user_id'    => $user->id,
                'company_id' => app(\App\Services\CompanyContextService::class)->get(),
            ]);

            Artisan::call('db:seed', [
                '--class' => $class,
                '--force' => true,
            ]);

            $output = Artisan::output();

            return $this->successResponse(
                ['seeder' => $seederName, 'output' => trim($output)],
                "تم تشغيل {$seederName} بنجاح"
            );

        } catch (\Throwable $e) {
            Log::error("Seeder API failed", [
                'seeder' => $request->input('seeder'),
                'error'  => $e->getMessage(),
            ]);

            return $this->errorResponse(
                config('app.debug') ? $e->getMessage() : 'فشل تشغيل الـ Seeder',
                500
            );
        }
    }

    /**
     * قائمة الـ Seeders المتاحة
     */
    public function available(): JsonResponse
    {
        return $this->successResponse(
            array_values(self::ALLOWED),
            'قائمة الـ Seeders المتاحة'
        );
    }
}




// ===== ملف: SettingController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\SettingService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ════════════════════════════════════════════════════════════════════
 * SettingController — النسخة المُصلحة
 *
 * المسارات:
 * GET    /{company}/settings              → index()    — dictionary
 * PATCH  /{company}/settings              → update()   — تحديث متعدد
 * PUT    /{company}/settings              → update()   — تحديث متعدد
 * GET    /{company}/settings/group/{grp}  → byGroup()  — array
 * GET    /{company}/settings/{key}        → getValue() — object واحد
 * ════════════════════════════════════════════════════════════════════
 */
class SettingController extends BaseApiController
{
    protected string  $resourceName  = 'setting';
    protected ?string $resourceClass = null;

    public function __construct(private SettingService $settingService)
    {
        parent::__construct();
    }

    // ─── GET /{company}/settings ──────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $dict = $this->settingService->getAllAsDict();
            return $this->successResponse($dict, 'تم جلب الإعدادات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ─── PATCH|PUT /{company}/settings ───────────────────────────────

    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $allData     = $request->all();
            $settingData = $this->filterSettingData($allData);

            if (empty($settingData)) {
                return $this->errorResponse(
                    'لم يتم تقديم إعدادات صحيحة — تأكد من صحة المفاتيح',
                    422,
                    'EMPTY_SETTINGS'
                );
            }

            $result = $this->settingService->upsertSettings($settingData);

            $response = $result->map(fn($s) => [
                'key'   => $s->key,
                'value' => $this->settingService->castValue($s),
                'group' => $s->group,
                'type'  => $s->type,
            ])->values()->toArray();

            return $this->successResponse($response, 'تم تحديث الإعدادات بنجاح');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ─── GET /{company}/settings/group/{group} ────────────────────────

    public function byGroup(Request $request, string $group): JsonResponse
    {
        try {
            $settings = $this->settingService->getGroupAsArray($group);
            return $this->successResponse($settings, "إعدادات المجموعة: {$group}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    // ─── GET /{company}/settings/{key} ────────────────────────────────

    public function getValue(Request $request, string $key): JsonResponse
    {
        try {
            $setting = $this->settingService->findByKey($key);

            if (!$setting) {
                return $this->errorResponse("الإعداد '{$key}' غير موجود", 404, 'SETTING_NOT_FOUND');
            }

            return $this->successResponse([
                'key'   => $setting->key,
                'value' => $this->settingService->castValue($setting),
                'group' => $setting->group,
                'type'  => $setting->type,
            ]);

        } catch (\Throwable $e) {
            return $this->handleError($e, 'getValue');
        }
    }

    // ─── Disabled endpoints ───────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        return $this->errorResponse('استخدم PATCH /settings', 405, 'METHOD_NOT_ALLOWED');
    }

    public function show($id): JsonResponse
    {
        return $this->errorResponse('استخدم GET /settings/{key}', 405, 'METHOD_NOT_ALLOWED');
    }

    public function destroy($id): JsonResponse
    {
        return $this->errorResponse('لا يمكن حذف الإعدادات', 405, 'METHOD_NOT_ALLOWED');
    }

    // ─── Required by BaseApiController ───────────────────────────────

    protected function getService(): SettingService
    {
        return $this->settingService;
    }

    protected function getModelClass(): string
    {
        return Setting::class;
    }

    // ─── Whitelist ────────────────────────────────────────────────────

    private function filterSettingData(array $data): array
    {
        $allowedKeys = [
            // invoice
            'invoice_design', 'invoice_header_color', 'invoice_paper_size',
            'invoice_font_size', 'price_mode', 'invoice_show_logo',
            'invoice_show_stamp', 'invoice_show_sign', 'invoice_show_watermark',
            'invoice_footer_text', 'invoice_legal_text', 'invoice_format',
            'invoice_number_prefix',

            // fiscal
            'tax_regime', 'entity_type', 'ifu_rate', 'default_tva_rate',
            'fiscal_stamp_enabled', 'fiscal_stamp_threshold', 'default_currency',
            'year_regimes', 'tax_rate', 'tax_number', 'currency_code', 'decimal_places',

            // inventory
            'default_valuation_method', 'allow_negative_stock', 'manage_lots',
            'manage_expiry', 'low_stock_default_threshold', 'auto_adjust_on_document',

            // alerts
            'alert_low_stock', 'alert_out_of_stock', 'low_stock_threshold',
            'alert_debt_due', 'debt_due_days', 'alert_overdue_debts',
            'alert_fiscal_close', 'fiscal_close_days', 'alert_g50', 'g50_days_before',
            'alert_g12', 'alert_g12bis', 'alert_draft_docs', 'draft_docs_days',
            'email_notifications', 'notif_email',

            // general
            'app_name', 'app_logo', 'app_color', 'theme_mode', 'language',
            'timezone', 'date_format', 'time_format',
        ];

        return array_filter(
            array_intersect_key($data, array_flip($allowedKeys)),
            fn($v) => $v !== null
        );
    }
}




// ===== ملف: StockMovementController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\StockMovementResource;
use App\Services\StockMovementService;
use App\Models\StockMovement;

class StockMovementController extends BaseApiController
{
    protected string $resourceName = 'stock_movement';
    protected ?string $resourceClass = StockMovementResource::class;

    public function __construct(private StockMovementService $stockMovementService)
    {
        parent::__construct();
    }

    protected function getService(): StockMovementService
    {
        return $this->stockMovementService;
    }

    protected function getModelClass(): string
    {
        return StockMovement::class;
    }

    public function incoming()
    {
        return $this->getService()->getIncoming();
    }

    public function outgoing()
    {
        return $this->getService()->getOutgoing();
    }
}




// ===== ملف: StockMovementTypeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\StockMovementTypeResource;
use App\Services\StockMovementTypeService;
use App\Models\StockMovementType;

class StockMovementTypeController extends BaseApiController
{
    protected string $resourceName = 'stock_movement_type';
    protected ?string $resourceClass = StockMovementTypeResource::class;

    public function __construct(private StockMovementTypeService $stockMovementTypeService)
    {
        parent::__construct();
    }

    protected function getService(): StockMovementTypeService
    {
        return $this->stockMovementTypeService;
    }

    protected function getModelClass(): string
    {
        return StockMovementType::class;
    }
}



// ===== ملف: TreasuryAccountController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountResource;
use App\Services\TreasuryAccountService;
use App\Models\TreasuryAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryAccountController extends BaseApiController
{
    protected string $resourceName = 'treasury_account';
    protected ?string $resourceClass = TreasuryAccountResource::class;

    public function __construct(private TreasuryAccountService $treasuryAccountService)
    {
        parent::__construct();
    }

    public function bankAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getBankAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات البنكية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'bankAccounts');
        }
    }

    public function cashAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getCashAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات النقدية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cashAccounts');
        }
    }

    public function default(Request $request): JsonResponse
    {
        try {
            $account = $this->treasuryAccountService->getDefault();
            return $this->successResponse($account ? new TreasuryAccountResource($account) : null, 'تم جلب الحساب الافتراضي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'default');
        }
    }

    protected function getService(): TreasuryAccountService
    {
        return $this->treasuryAccountService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccount::class;
    }
}



// ===== ملف: TreasuryAccountTypeController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountTypeResource;
use App\Services\TreasuryAccountTypeService;
use App\Models\TreasuryAccountType;

class TreasuryAccountTypeController extends BaseApiController
{
    protected string $resourceName = 'treasury_account_type';
    protected ?string $resourceClass = TreasuryAccountTypeResource::class;

    public function __construct(private TreasuryAccountTypeService $treasuryAccountTypeService)
    {
        parent::__construct();
    }

    protected function getService(): TreasuryAccountTypeService
    {
        return $this->treasuryAccountTypeService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccountType::class;
    }
}




// ===== ملف: TvaController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TvaResource;
use App\Services\TvaService;

class TvaController extends BaseApiController
{
    protected string $resourceName = 'tva';
    protected ?string $resourceClass = TvaResource::class;

    public function __construct(private TvaService $tvaService)
    {
        parent::__construct();
    }

    public function default(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $rate = $this->tvaService->getDefaultRate();
            return $this->successResponse(['rate' => $rate]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'default');
        }
    }

    protected function getService(): TvaService
    {
        return $this->tvaService;
    }

    protected function getModelClass(): string
    {
        return \App\Models\Tva::class;
    }
}



// ===== ملف: UnitController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\UnitResource;
use App\Services\UnitService;
use App\Models\Unit;

class UnitController extends BaseApiController
{
    protected string $resourceName = 'unit';
    protected ?string $resourceClass = UnitResource::class;

    public function __construct(private UnitService $unitService)
    {
        parent::__construct();
    }

    protected function getService(): UnitService
    {
        return $this->unitService;
    }

    protected function getModelClass(): string
    {
        return Unit::class;
    }
}



// ===== ملف: UserController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseApiController
{
    protected string  $resourceName = 'user';
    protected ?string $resourceClass = UserResource::class;

    public function __construct(private UserService $userService)
    {
        parent::__construct();
    }

    protected function getService(): UserService
    {
        return $this->userService;
    }

    protected function getModelClass(): string
    {
        return User::class;
    }

    public function index(Request $request): JsonResponse
{
    $companyId = app(\App\Services\CompanyContextService::class)->get();

    $users = User::whereHas('companies', function ($q) use ($companyId) {
        $q->where('companies.id', $companyId);
    })->paginate($request->get('per_page', 15));

    return $this->successResponse(
        UserResource::collection($users),
        'تم جلب المستخدمين بنجاح'
    );
}

    // ─────────────────────────────────────────────────────────────────
    // السبب الجذري للمشكلة:
    //
    // الـ route هو: /{company}/{user}
    // Laravel يمرر parameters بالترتيب للـ method signature:
    //   BaseApiController::update(Request $request, $id)
    //                                                ↑
    //                                         يستقبل {company} بدل {user}!
    //
    // الحل: قراءة {user} مباشرة من الـ route بالاسم، وليس من الـ $id.
    // نحافظ على نفس signature للـ parent لتجنب خطأ PHP type compatibility.
    // ─────────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;

            $item = $this->userService->findById($userId);
            $this->authorizeAction('update', $item);

            $data = $this->getValidatedData($request, $userId);
            $item = $this->userService->update($item, $data, $request);

            return $this->successResponse(
                new UserResource($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // show و destroy يعانيان من نفس مشكلة {company}/{user} parameter mixing
    public function show($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('view', $item);
            return $this->successResponse(new UserResource($item));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('delete', $item);
            $this->userService->delete($item);
            return $this->successResponse(null, "تم حذف {$this->resourceName} بنجاح");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ─── الملف الشخصي ───────────────────────────────────────────────

    public function profile(Request $request): JsonResponse
    {
        try {
            // ✅ نحمّل roles + permissions لتظهر في تبويب الصلاحيات
            $user = $request->user()->load(['gender', 'commune', 'wilaya', 'roles', 'permissions']);
            return $this->successResponse(new UserResource($user));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'profile');
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'       => 'sometimes|string|max:255',
                'username'   => 'nullable|string|max:50',
                'phone'      => 'nullable|string|max:20',
                'bio'        => 'nullable|string',
                'birth_date' => 'nullable|date',
                'gender_id'  => 'nullable|exists:genders,id',
                'address'    => 'nullable|string|max:500',
                'commune_id' => 'nullable|exists:communes,id',
                'wilaya_id'  => 'nullable|exists:wilayas,id',
            ]);
            $user = $this->userService->updateProfile($request->user(), $data);
            return $this->successResponse(new UserResource($user), 'تم تحديث الملف الشخصي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateProfile');
        }
    }

    // ─── عمليات على مستخدم محدد ─────────────────────────────────────

    public function changePassword(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $data = $request->validate(['password' => 'required|string|min:8|max:100']);
            $this->userService->changePassword($user, $data['password']);
            return $this->successResponse(null, 'تم تغيير كلمة المرور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    public function toggleActive($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $user = $this->userService->toggleActive($user);
            $msg  = $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user), $msg);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleActive');
        }
    }

    public function assignRole(Request $request, $id): JsonResponse
{
    try {
        $userId = $request->route('user') ?? $id;
        $user   = $this->userService->findById($userId);
        $this->authorizeAction('update', $user);

        $companyId = app(\App\Services\CompanyContextService::class)->get();

        $data = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        app(\App\Services\CompanyRoleService::class)
            ->assignRole($user, $data['role'], $companyId);

        return $this->successResponse(
            new UserResource($user->load('roles')),
            'تم تعيين الدور'
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'assignRole');
    }
}

    // ─── المحذوفات ──────────────────────────────────────────────────

    public function trashed(): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', User::class);
            $users = User::onlyTrashed()
                ->where('company_id', app(\App\Services\CompanyContextService::class)->get())
                ->with(['roles', 'gender'])
                ->paginate(20);
            return $this->successResponse(UserResource::collection($users));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'trashed');
        }
    }

    public function restore($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->restoreUser($userId);
            $this->authorizeAction('restore', $user);
            return $this->successResponse(new UserResource($user), 'تم استعادة المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'restore');
        }
    }

    public function forceDelete($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = User::withTrashed()->findOrFail($userId);
            $this->authorizeAction('forceDelete', $user);
            $this->userService->forceDeleteUser($userId);
            return $this->successResponse(null, 'تم حذف المستخدم نهائياً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'forceDelete');
        }
    }

    // ─── استعلامات ──────────────────────────────────────────────────

    public function byRole(Request $request): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $role = $request->get('role');
        if (!$role) return $this->errorResponse('الرجاء تحديد دور', 422);
        return $this->successResponse(UserResource::collection($this->userService->getByRole($role)));
    }

    public function active(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getActive()));
    }

    public function inactive(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getInactive()));
    }
}




// ===== ملف: UserPermissionsMethods.php =====
// ════════════════════════════════════════════════════════════════════════════
// أضف هذين الـ methods لـ UserController الموجود
// (أو أنشئ ملفاً منفصلاً إذا كان UserController كبيراً)
// ════════════════════════════════════════════════════════════════════════════

// في api.php، أضف هذين الـ routes داخل tenant group (⑤):
//
//   Route::get('me/permissions', [UserController::class, 'myPermissions']);
//   Route::get('me/roles',       [UserController::class, 'myRoles']);

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\RoleResource;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Methods to add to UserController
 *
 * GET /{company}/me/permissions → string[] أسماء الصلاحيات
 * GET /{company}/me/roles       → { roles: Role[], permissions: string[] }
 */
trait HasUserPermissionEndpoints
{
    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/permissions
    //
    // ✅ يُرجع قائمة أسماء الصلاحيات للمستخدم الحالي
    // (من دوره داخل الشركة الحالية)
    // ──────────────────────────────────────────────────────────────

    public function myPermissions(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // جلب الصلاحيات من خلال Spatie
            // ✅ getAllPermissions() تجمع صلاحيات كل الأدوار + المباشرة
            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse($permissions, 'صلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myPermissions');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // GET /{company}/me/roles
    //
    // ✅ يُرجع أدوار المستخدم + صلاحياته معاً
    // ──────────────────────────────────────────────────────────────

    public function myRoles(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // ✅ جلب أدوار الشركة الحالية فقط
            $companyId = app(\App\Services\CompanyContextService::class)->get();

            $roles = $user->roles()
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with('permissions')
                ->get();

            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->unique()
                ->values()
                ->toArray();

            return $this->successResponse([
                'roles'       => RoleResource::collection($roles),
                'permissions' => $permissions,
            ], 'أدوار وصلاحيات المستخدم الحالي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myRoles');
        }
    }
}




// ===== ملف: WarehouseController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\WarehouseResource;
use App\Services\WarehouseService;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;

/**
 * Warehouse Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class WarehouseController extends BaseApiController
{
    protected string $resourceName = 'warehouse';
    protected ?string $resourceClass = WarehouseResource::class;

    public function __construct(private WarehouseService $warehouseService)
    {
        parent::__construct();
    }

    protected function getService(): WarehouseService
    {
        return $this->warehouseService;
    }

    protected function getModelClass(): string
    {
        return Warehouse::class;
    }
}




// ===== ملف: WilayaController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\WilayaResource;
use App\Services\WilayaService;
use App\Models\Wilaya;

class WilayaController extends BaseApiController
{
    protected string $resourceName = 'wilaya';
    protected ?string $resourceClass = WilayaResource::class;

    public function __construct(private WilayaService $wilayaService)
    {
        parent::__construct();
    }

    protected function getService(): WilayaService
    {
        return $this->wilayaService;
    }

    protected function getModelClass(): string
    {
        return Wilaya::class;
    }
}



// ===== ملف: isn.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Core\Services\ApiListService;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoleController
 *
 * ══════════════════════════════════════════════════════════════════
 * المسارات (من api.php):
 *   GET    /{company}/roles              → index()
 *   GET    /{company}/roles/{role}       → show($id)
 *   POST   /{company}/roles              → store(Request)
 *   PUT    /{company}/roles/{role}       → update(Request, $id)
 *   DELETE /{company}/roles/{role}       → destroy($id)
 *
 * ✅ متوافق مع BaseApiController:
 *   - extractId() يتعامل مع route params تلقائياً
 *   - resolveRouteId() يبحث عن 'role' ثم 'id' في route params
 *   - getService() و getModelClass() مُعرَّفان
 *   - store() يستخدم StoreRoleRequest (FormRequest)
 *   - update() يستخدم UpdateRoleRequest (FormRequest)
 * ══════════════════════════════════════════════════════════════════
 */

class isn't autoloadable in this context.
    protected ?string $resourceClass = 'App\\Http\\Resources\\RoleResource';

    public function __construct(private readonly RoleService $roleService)
    {
        parent::__construct();
    }

    // ──────────────────────────────────────────────────────────────
    // index — GET /{company}/roles
    //
    // ✅ BaseApiController::index() يستدعي getListData() → HasApiList
    // HasApiList يبني query من getListConfig() في RoleService
    // getListConfig() يضع ->distinct() لمنع التكرار
    // ──────────────────────────────────────────────────────────────

    // نرث index() من BaseApiController — لا نحتاج override

    // ──────────────────────────────────────────────────────────────
    // show — GET /{company}/roles/{role}
    //
    // ✅ extractId() يستخرج 'role' من route params تلقائياً
    // لا نحتاج override إلا لإضافة RoleResource
    // ──────────────────────────────────────────────────────────────


    public function show($id): JsonResponse
{
    try {
        $resolvedId = $this->extractId($id);
        $user = $this->userService->findById($resolvedId, ['roles', 'company']);
        $this->authorizeAction('view', $user);

        // ✅ إذا كان مالك الشركة، أضف دوره
        $companyId = app(CompanyContextService::class)->get();
        if ($companyId && $user->company && $user->company->owner_id === $user->id) {
            // مالك الشركة — يمكن إضافة دور owner
            // أو تعديل response
        }

        return $this->successResponse(new UserResource($user));
    } catch (\Throwable $e) {
        return $this->handleError($e, 'show');
    }
}

    // ──────────────────────────────────────────────────────────────
    // store — POST /{company}/roles
    //
    // ✅ يستخدم StoreRoleRequest بدل Request عادي
    // BaseApiController::store() يستدعي getValidatedData() التي
    // تتحقق إذا كان الـ request FormRequest → تستدعي validated()
    // ──────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);
            $validatedData = $request instanceof StoreRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->create($validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم إنشاء الدور بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // update — PUT /{company}/roles/{role}
    //
    // ✅ يستخدم UpdateRoleRequest
    // extractId() يحل {role} من route params
    // ──────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('update', $role);
            $validatedData = $request instanceof UpdateRoleRequest
                ? $request->validated()
                : $request->all();
            $role = $this->roleService->update($role, $validatedData, $request);
            return $this->successResponse(
                new RoleResource($role),
                'تم تحديث الدور بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // destroy — DELETE /{company}/roles/{role}
    // ──────────────────────────────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $role       = $this->roleService->findById($resolvedId);
            $this->authorizeAction('delete', $role);

            // ✅ لا نسمح بحذف الأدوار الأساسية
            if (in_array($role->name, ['owner', 'admin', 'super-admin'], true)) {
                return $this->errorResponse(
                    'لا يمكن حذف الأدوار الأساسية للنظام',
                    409,
                    'BUSINESS_RULE_VIOLATION'
                );
            }

            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Abstract implementations
    // ──────────────────────────────────────────────────────────────

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ──────────────────────────────────────────────────────────────
    // ✅ resolveRouteId — يبحث عن 'role' في route params
    // ──────────────────────────────────────────────────────────────

    protected function resolveRouteId(string ...$paramNames): int|string
    {
        return parent::resolveRouteId('role', 'id');
    }
}


