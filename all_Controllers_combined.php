<?php

// دمج تلقائي لكل ملفات الـ Controllers



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

/**
 * Authentication Controller - Professional Version
 *
 * المتحكم يقوم بـ:
 * 1. استقبال الطلب والتحقق من صحته
 * 2. التحقق من الصلاحيات
 * 3. تفويض العملية للخدمة
 * 4. إرجاع الرد المُنسق
 *
 * المتحكم لا يقوم بـ:
 * ❌ معالجة البيانات
 * ❌ الاتصال بـ Database مباشرة
 * ❌ معالجة الأخطاء يدوياً (handleError يتولى ذلك)
 */
class AuthController extends BaseApiController
{
    protected string $resourceName = 'user';
    protected ?string $resourceClass = null;

    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        parent::__construct();
        $this->authService = $authService;
    }

    /**
     * تسجيل مستخدم جديد
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated());

            return $this->successResponse(
                [
                    'user' => new UserResource($user),
                    'token' => $user->createToken('auth_token')->plainTextToken,
                    'token_type' => 'Bearer',
                ],
                'تم التسجيل بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'register');
        }
    }

    /**
     * تسجيل دخول مستخدم
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->login($request->email, $request->password);

            return $this->successResponse(
                [
                    'user' => new UserResource($user),
                    'token' => $user->createToken('auth_token')->plainTextToken,
                    'token_type' => 'Bearer',
                ],
                'تم دخولك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'login');
        }
    }

    /**
     * الحصول على بيانات المستخدم الحالي
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles'); // ← تحميل الأدوار

        return $this->successResponse(
            new UserResource($request->user()),
            'تم استرجاع البيانات بنجاح'
        );
    }

    /**
     * تحديث بيانات المستخدم
     */
    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            ]);

            $user->update($data);

            return $this->successResponse(
                new UserResource($user),
                'تم التحديث بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    /**
     * تغيير كلمة المرور
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $this->authService->changePassword($user, $request->current_password, $request->new_password);

            return $this->successResponse(null, 'تم تغيير كلمة المرور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    /**
     * تسجيل خروج المستخدم
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
    }

    // === Abstract Methods (Required by BaseApiController) ===

    protected function getService(): AuthService
    {
        return $this->authService;
    }

    protected function getModelClass(): string
    {
        return User::class;
    }
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

    protected function getListConfig(): array
    {
        return [
            'search_fields' => Barcode::$searchableFields,
            'filters' => Barcode::$filterable,
            'sorts' => Barcode::$sortable,
            'relations' => Barcode::$allowedIncludes,
            'default_includes' => Barcode::$defaultWith,
            'default_sort' => Barcode::$defaultSort,
            'default_per_page' => Barcode::$defaultPerPage,
            'per_page_limit' => Barcode::$perPageLimit,
            'cache_ttl' => Barcode::$cacheTtl,
            'cache_tags' => Barcode::$cacheTags,
        ];
    }

    /**
     * GET /api/v1/products/{product}/barcodes
     * قائمة باركودات منتج معين
     */
    public function indexByProduct(Request $request, Product $product): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Barcode::class);
            // التأكد من وصول المستخدم للمنتج
            $this->authorizeAction('view', $product);

            $data = $this->apiListWithCallback(
                Barcode::class,
                fn($query) => $query->where('product_id', $product->id),
                $request,
                $this->getListConfig(),
            );

            return $this->successResponse($data, 'تم جلب باركودات المنتج');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'indexByProduct');
        }
    }

    /**
     * POST /api/v1/barcodes
     * إضافة باركود جديد
     */
    public function store(StoreBarcodeRequest $request): JsonResponse
    {
        try {
            $product = Product::findOrFail($request->product_id);
            $this->authorizeAction('create', [Barcode::class, $product]);

            $barcode = $this->barcodeService->create($request->validated(), $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم إنشاء الباركود بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    /**
     * PUT|PATCH /api/v1/barcodes/{barcode}
     */
    public function update(UpdateBarcodeRequest $request, Barcode $barcode): JsonResponse
    {
        try {
            $this->authorizeAction('update', $barcode);
            $barcode = $this->barcodeService->update($barcode, $request->validated(), $request);

            return $this->successResponse(
                new BarcodeResource($barcode->load('product')),
                'تم تحديث الباركود'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    /**
     * DELETE /api/v1/barcodes/{barcode}
     */
    public function destroy(Barcode $barcode): JsonResponse
    {
        try {
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
use App\Services\CommuneService;
use App\Models\Commune;
use Illuminate\Http\JsonResponse;

class CommuneController extends BaseApiController
{
    protected string $resourceName = 'commune';
    protected ?string $resourceClass = CommuneResource::class;

    public function __construct(private CommuneService $communeService)
    {
        parent::__construct();
    }

    protected function getService(): CommuneService
    {
        return $this->communeService;
    }

    protected function getModelClass(): string
    {
        return Commune::class;
    }
    /**
     * جلب جميع البلديات التابعة لولاية معينة
     */
    public function byWilaya(Request $request, int $wilayaId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Commune::class);

            $communes = Commune::where('wilaya_id', $wilayaId)
                ->orderBy('name')
                ->get();

            return $this->successResponse(
                CommuneResource::collection($communes),
                'تم جلب البلديات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byWilaya');
        }
    }
}




// ===== ملف: CompanyController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends BaseApiController
{
    protected string  $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(
        private readonly CompanyService        $companyService,
        private readonly CompanyContextService $context,
    ) {}

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }
    protected function getModelClass(): string
    {
        return Company::class;
    }

    // ─── مساعد: يقبل id رقمي أو slug نصي ──────────────────────
    private function resolveCompany(string|int $identifier): Company
    {
        return is_numeric($identifier)
            ? Company::findOrFail((int) $identifier)
            : Company::where('slug', $identifier)->firstOrFail();
    }

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
            'cache_ttl'        => Company::$cacheTtl,
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

            // إذا لم يكن Super Admin → شركاته فقط
            if (!$user->isSuperAdmin()) {
                $query->whereHas('users', fn($q) => $q->where('user_id', $user->id));
            }

            // فلاتر الحالة للـ Super Admin
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

            // بحث
            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                        ->orWhere('commercial_name', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%")
                        ->orWhere('nif', 'like', "%{$s}%")
                        ->orWhere('slug', 'like', "%{$s}%");
                });
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
    // ② store — إنشاء شركة جديدة
    // ═══════════════════════════════════════════════════════════


    public function store(Request $request): JsonResponse
    {
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
            'is_active'       => 'nullable|boolean',
            // حقول Super Admin
            'plan'            => 'nullable|string|in:free,starter,professional,enterprise',
            'max_users'       => 'nullable|integer|min:1',
            'max_warehouses'  => 'nullable|integer|min:1',
            'max_products'    => 'nullable|integer|min:1',
            'notes'           => 'nullable|string|max:5000',
        ]);

        // السماح لـ Super Admin فقط بتمرير حقول إضافية
        if (!auth()->user()->isSuperAdmin()) {
            unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
        }

        try {
            $this->authorizeAction('create', Company::class);
            $company = $this->companyService->create($data, $request);
            return $this->successResponse(new CompanyResource($company->load('owner:id,name,email')), 'تم إنشاء الشركة', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $company = $this->resolveCompany($id);
        $this->authorizeAction('update', $company);

        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',
            'nif'             => "nullable|string|max:50|unique:companies,nif,{$company->id}",
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'activity'        => 'nullable|string|max:500',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'is_active'       => 'nullable|boolean',
            'plan'            => 'nullable|string|in:free,starter,professional,enterprise',
            'max_users'       => 'nullable|integer|min:1',
            'max_warehouses'  => 'nullable|integer|min:1',
            'max_products'    => 'nullable|integer|min:1',
            'notes'           => 'nullable|string|max:5000',
        ]);

        if (!auth()->user()->isSuperAdmin()) {
            unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
        }

        try {
            $company = $this->companyService->update($company, $data, $request);
            return $this->successResponse(new CompanyResource($company->load('owner:id,name,email')), 'تم تحديث الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }
    // ═══════════════════════════════════════════════════════════
    // ③ show — عرض شركة واحدة
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
    // ④ update — تحديث شركة (مالك أو Super Admin)
    // ═══════════════════════════════════════════════════════════


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
    // ⑥ Super Admin actions
    // ═══════════════════════════════════════════════════════════

    public function suspend(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('suspend', $company);
            $data = $request->validate(['reason' => 'nullable|string|max:500']);
            $company->suspend($data['reason'] ?? 'قرار إداري', auth()->id());
            return $this->successResponse(new CompanyResource($company), 'تم تعليق الشركة مؤقتاً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('suspend', $company);
            $company->unsuspend();
            return $this->successResponse(new CompanyResource($company), 'تم رفع التعليق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function verify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('verify', $company);
            $company->verify(auth()->id());
            return $this->successResponse(new CompanyResource($company), 'تم توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('verify', $company);
            $company->unverify();
            return $this->successResponse(new CompanyResource($company), 'تم إلغاء التوثيق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function upgradePlan(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('upgrade', $company);
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
            return $this->successResponse(new CompanyResource($company), 'تم تحديث الخطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'upgradePlan');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑦ Company context & members (بدون تغيير)
    // ═══════════════════════════════════════════════════════════

    public function myCompanies(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);
            $companies = auth()->user()->companies()->with('owner:id,name')->get();
            return $this->successResponse(CompanyResource::collection($companies), 'شركاتك');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myCompanies');
        }
    }

    public function current(): JsonResponse
    {
        try {
            $companyId = $this->context->get();
            if (!$companyId) return $this->errorResponse('لا توجد شركة نشطة', 404, 'NO_ACTIVE_COMPANY');
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
            abort_if($company->is_suspended, 403, "الشركة معلّقة: {$company->suspension_reason}");
            abort_unless($company->is_active, 403, 'الشركة غير نشطة');
            $this->companyService->switchContext(auth()->user(), $company);
            return $this->successResponse(new CompanyResource($company), "تم التبديل إلى: {$company->name}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    public function members(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            return $this->successResponse($this->companyService->getMembers($company), 'أعضاء الشركة');
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
            $data = $request->validate(['role' => ['required', 'string', Rule::in(Company::MEMBER_ROLES)]]);
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
            return $this->successResponse(null, 'تم إعادة تفعيل العضو');
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
            return $this->successResponse(new CompanyResource($company->fresh(['owner:id,name,email'])), 'تم نقل الملكية');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'transferOwnership');
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

            $customers = $this->partyService->getCustomers();

            return $this->successResponse(
                PartyResource::collection($customers),
                'تم جلب قائمة العملاء بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'customers');
        }
    }

    /**
     * Get suppliers only
     */
    public function suppliers(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Party::class);

            $suppliers = $this->partyService->getSuppliers();

            return $this->successResponse(
                PartyResource::collection($suppliers),
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

class PermissionController extends BaseApiController
{
    protected string $resourceName = 'permission';
    protected ?string $resourceClass = PermissionResource::class;

    public function __construct(private PermissionService $permissionService)
    {
        parent::__construct();
    }

    public function byGroup(Request $request): JsonResponse
    {
        try {
            $group = $request->get('group');
            $permissions = $this->permissionService->getByGroup($group);
            return $this->successResponse(
                PermissionResource::collection($permissions),
                'تم جلب قائمة الأذونات حسب المجموعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    protected function getService(): PermissionService
    {
        return $this->permissionService;
    }

    protected function getModelClass(): string
    {
        return Permission::class;
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

    protected function getListConfig(): array
    {
        return [
            'search_fields' => ProductVariant::$searchableFields,
            'filters' => ProductVariant::$filterable,
            'sorts' => ProductVariant::$sortable,
            'relations' => ProductVariant::$allowedIncludes,
            'default_includes' => ProductVariant::$defaultWith,
            'default_sort' => ProductVariant::$defaultSort,
            'default_per_page' => ProductVariant::$defaultPerPage,
            'per_page_limit' => ProductVariant::$perPageLimit,
            'cache_ttl' => ProductVariant::$cacheTtl,
            'cache_tags' => ProductVariant::$cacheTags,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', ProductVariant::class);
            $data = $this->getListData($request);
            return $this->successResponse($data, 'تم جلب قائمة المتغيرات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('view', $variant);
            return $this->successResponse(new ProductVariantResource($variant->load('product', 'barcodes')));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(StoreProductVariantRequest $request): JsonResponse
    {
        try {
            $variant = $this->service->create($request->validated(), $request);
            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم إنشاء المتغير بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(UpdateProductVariantRequest $request, $id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('update', $variant);
            $variant = $this->service->update($variant, $request->validated(), $request);
            return $this->successResponse(
                new ProductVariantResource($variant->load('product')),
                'تم تحديث المتغير'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $variant = $this->service->findById($id);
            $this->authorizeAction('delete', $variant);
            $this->service->delete($variant);
            return $this->successResponse(null, 'تم حذف المتغير');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // إضافي: جلب متغيرات منتج معين
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
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends BaseApiController
{
    protected string $resourceName = 'role';
    protected ?string $resourceClass = RoleResource::class;

    public function __construct(private RoleService $roleService)
    {
        parent::__construct();
    }

    protected function getService(): RoleService
    {
        return $this->roleService;
    }

    protected function getModelClass(): string
    {
        return Role::class;
    }

    // ══════════════════════════════════════════
    // نفس مشكلة UserController: /{company}/{role}
    // Laravel يمرر {company} كـ $id بدل {role}
    // الحل: قراءة {role} من الـ route بالاسم
    // ══════════════════════════════════════════

    public function show($id): JsonResponse
    {
        try {
            $roleId = request()->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('view', $role);
            return $this->successResponse(new RoleResource($role));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Role::class);

            $data = $request->validate([
                'name'             => 'required|string|max:100|unique:roles,name',
                'display_name'     => 'nullable|string|max:150',
                'description'      => 'nullable|string|max:500',
                'guard_name'       => 'nullable|string|max:50',
                'permission_ids'   => 'nullable|array',
                'permission_ids.*' => 'integer|exists:permissions,id',
            ]);

            $role = $this->roleService->create($data);
            return $this->successResponse(new RoleResource($role), 'تم إنشاء الدور بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            // الإصلاح: نقرأ {role} بالاسم بدل الاعتماد على الترتيب
            $roleId = $request->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('update', $role);

            $data = $request->validate([
                'display_name'     => 'nullable|string|max:150',
                'description'      => 'nullable|string|max:500',
                'permission_ids'   => 'nullable|array',
                'permission_ids.*' => 'integer|exists:permissions,id',
            ]);

            $role = $this->roleService->update($role, $data);
            return $this->successResponse(new RoleResource($role), 'تم تحديث الدور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            // الإصلاح: request() helper بدل $request parameter
            $roleId = request()->route('role') ?? $id;
            $role = $this->roleService->findById($roleId);
            $this->authorizeAction('delete', $role);
            $this->roleService->delete($role);
            return $this->successResponse(null, 'تم حذف الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }
}




// ===== ملف: SettingController.php =====
namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\SettingResource;
use App\Services\SettingService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends BaseApiController
{
    protected string $resourceName = 'setting';
    protected ?string $resourceClass = SettingResource::class;

    public function __construct(private SettingService $settingService)
    {
        parent::__construct();
    }

    /**
     * تجاوز store() لاستخدام updateOrCreate بدلاً من create
     * ويتجاوز الـ Policy لأن إعداد المؤسسة مسموح لأي مستخدم مسجّل دخوله
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'key'   => 'required|string|max:150',
                'group' => 'nullable|string|max:100',
                'value' => 'nullable',
            ]);

            $setting = Setting::updateOrCreate(
                ['key' => $request->key],
                [
                    'value' => $request->value,
                    'group' => $request->group ?? 'general',
                ]
            );

            return $this->successResponse(
                new SettingResource($setting),
                'تم حفظ الإعداد بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    /**
     * جلب الإعدادات حسب المجموعة
     */
    public function byGroup(Request $request, string $group): JsonResponse
    {
        try {
            $settings = $this->settingService->getByGroup($group);
            return $this->successResponse(
                SettingResource::collection($settings),
                'تم جلب الإعدادات حسب المجموعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    /**
     * جلب قيمة إعداد بواسطة المفتاح
     * إذا لم يوجد المفتاح يُرجع null بدلاً من 500
     */
    public function getValue(Request $request, string $key): JsonResponse
    {
        try {
            $setting = Setting::where('key', $key)->first();

            // ← إرجاع مباشر بدون Resource
            return $this->successResponse([
                'key'   => $key,
                'value' => $setting?->value,
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'getValue');
        }
    }

    protected function getService(): SettingService
    {
        return $this->settingService;
    }

    protected function getModelClass(): string
    {
        return Setting::class;
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
            $user = $request->user()->load(['gender', 'commune', 'wilaya', 'roles']);
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
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $data = $request->validate(['role' => 'required|string|exists:roles,name']);
            $user->syncRoles([$data['role']]);
            return $this->successResponse(new UserResource($user->load('roles')), 'تم تعيين الدور');
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

