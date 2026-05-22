<?php

// دمج تلقائي لكل ملفات الـ Services



// ===== ملف: AttachmentService.php =====
namespace App\Services;

use App\Models\Attachment;
use Illuminate\Http\Request;

class AttachmentService extends \App\Core\Services\BaseService
{
    protected string $model = Attachment::class;
    protected string $resourceName = 'attachment';
    protected array $defaultWith = ['uploadedBy'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getFilePath(Attachment $attachment): string
    {
        return $attachment->file_path;
    }
}




// ===== ملف: AuditService.php =====
namespace App\Services;

use App\Models\Audit;
use Illuminate\Http\Request;

class AuditService extends \App\Core\Services\BaseService
{
    protected string $model = Audit::class;
    protected string $resourceName = 'audit';
    protected array $defaultWith = ['user'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getByUser(int $userId)
    {
        return $this->model::forUser($userId)->get();
    }

    public function getByEvent(string $event)
    {
        return $this->model::forEvent($event)->get();
    }
}




// ===== ملف: AuthService.php =====
namespace App\Services;

use App\Models\User;
use App\Models\LoginAttempt;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string
    {
        return 'user';
    }
    protected string $model = User::class;
    protected string $resourceName = 'user';

    protected int $maxLoginAttempts = 5;
    protected int $lockoutMinutes = 15;

    public function register(array $data): User
    {
        if (User::where('email', $data['email'])->exists()) {
            throw new BusinessRuleException('هذا البريد الإلكتروني مسجل بالفعل', 422);
        }

        return $this->create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => $data['password'],
        ]);
    }

    public function login(string $email, string $password): User
    {
        if (LoginAttempt::isLockedOut($email, $this->maxLoginAttempts, $this->lockoutMinutes)) {
            throw new BusinessRuleException(
                'تم قفل الحساب مؤقتاً بسبب محاولات دخول فاشلة متعددة. يرجى المحاولة لاحقاً',
                423
            );
        }

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            LoginAttempt::record($email, false);
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }

        LoginAttempt::record($email, true);

        // ✅ تسجيل وقت وعنوان آخر دخول
        $user->updateLastLogin();

        return $user;
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
        }
        DB::transaction(function () use ($user, $newPassword) {
            $user->update(['password' => $newPassword]);
            $user->tokens()->delete();
        });
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: إرسال بريد ترحيب
    }
}




// ===== ملف: BarcodeService.php =====
declare(strict_types=1);

namespace App\Services;

use App\Models\Barcode;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BarcodeService extends \App\Core\Services\BaseService
{
    protected string $model        = Barcode::class;
    protected string $resourceName = 'barcode';
    protected function getResourceName(): string { return $this->resourceName; }


    // barcodes.company_id  → companies        (cascadeOnDelete)
    // barcodes.product_id  → products         (cascadeOnDelete)
    // barcodes.variant_id  → product_variants (nullable, cascadeOnDelete)
    // barcodes.created_by  → users            (nullable)
    // الأنواع: primary | unit | box | supplier | etc.
    protected array $defaultWith = ['product', 'variant'];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data['company_id'] ??= $this->getCurrentCompanyId();
        $data['created_by'] ??= auth()->id();

        // منتج واحد لا يمكن أن يكون له أكثر من باركود primary
        if ($data['is_primary'] ?? false) {
            $this->ensureNoPrimaryExists(
                productId: $data['product_id'],
                variantId: $data['variant_id'] ?? null,
            );
        }

        // الباركود الأول للمنتج/variant يصبح primary تلقائياً
        if (!isset($data['is_primary'])) {
            $data['is_primary'] = !$this->productHasAnyBarcode(
                productId: $data['product_id'],
                variantId: $data['variant_id'] ?? null,
            );
        }

        return $data;
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // product_id و company_id لا يتغيران أبداً بعد الإنشاء
        if (isset($data['product_id']) && (int) $data['product_id'] !== (int) $item->product_id) {
            throw new BusinessRuleException('لا يمكن تغيير المنتج المرتبط بالباركود بعد الإنشاء.', 422);
        }

        if (isset($data['company_id']) && (int) $data['company_id'] !== (int) $item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالباركود.', 422);
        }

        // إذا أراد المستخدم إزالة is_primary عن هذا الباركود
        // يجب أن يكون هناك باركود primary آخر وإلا نرفض
        if (isset($data['is_primary']) && !$data['is_primary'] && $item->is_primary) {
            $otherPrimaryExists = $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('id', '!=',    $item->id)
                ->where('is_primary',  true)
                ->exists();

            if (!$otherPrimaryExists) {
                throw new BusinessRuleException(
                    'لا يمكن إلغاء الباركود الرئيسي دون تعيين باركود رئيسي آخر.',
                    422
                );
            }
        }

        // إذا أراد المستخدم تعيين هذا الباركود primary
        // نتحقق مسبقاً قبل الدخول في Transaction
        if (($data['is_primary'] ?? false) && !$item->is_primary) {
            $this->ensureNoPrimaryExists(
                productId: $item->product_id,
                variantId: $item->variant_id,
                exceptId:  $item->id,
            );
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // نمنع تمرير هذين الحقلين إلى update() نهائياً
        unset($data['product_id'], $data['company_id']);

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // إذا أصبح هذا الباركود primary → نزيل is_primary عن البقية (داخل نفس Transaction)
        if ($item->is_primary) {
            $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('id', '!=',    $item->id)
                ->where('is_primary',  true)
                ->update(['is_primary' => false]);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // لا يمكن حذف الباركود الرئيسي إذا كان هناك باركودات أخرى للمنتج
        if ($item->is_primary) {
            $othersExist = $this->model::where('company_id', $item->company_id)
                ->where('product_id', $item->product_id)
                ->where('id', '!=',   $item->id)
                ->exists();

            if ($othersExist) {
                throw new BusinessRuleException(
                    'لا يمكن حذف الباركود الرئيسي. عيّن باركوداً آخر كرئيسي أولاً.',
                    422
                );
            }
        }
    }

    protected function afterDelete(Model $item): void
    {
        // إذا حُذف الباركود الرئيسي (حالة: كان الوحيد ثم حُذف)
        // نُعيّن أقدم باركود تلقائياً كـ primary إن وُجد
        if ($item->is_primary) {
            $this->model::where('company_id', $item->company_id)
                ->where('product_id', $item->product_id)
                ->oldest()
                ->first()
                ?->update(['is_primary' => true]);
        }
    }

    // =========================================================
    // Custom Queries
    // =========================================================

    /**
     * البحث بالباركود داخل نطاق الشركة الحالية
     */
    public function findByBarcode(string $barcode): ?Model
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('barcode', $barcode)
            ->with($this->defaultWith)
            ->first();
    }

    /**
     * جميع باركودات منتج معين مرتبة (primary أولاً)
     */
    public function forProduct(int $productId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId)
            ->with($this->defaultWith)
            ->orderByDesc('is_primary')
            ->get();
    }

    /**
     * جميع باركودات variant معين مرتبة (primary أولاً)
     */
    public function forVariant(int $variantId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('variant_id', $variantId)
            ->with($this->defaultWith)
            ->orderByDesc('is_primary')
            ->get();
    }

    /**
     * تعيين باركود معين كـ primary بشكل atomic
     * (بديل أنظف من تمرير is_primary عبر update())
     */
    public function makePrimary(Model $item): Model
    {
        if ($item->is_primary) {
            return $item;
        }

        DB::transaction(function () use ($item) {
            $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('is_primary',  true)
                ->update(['is_primary' => false]);

            $item->update(['is_primary' => true]);
        });

        $this->performPostCommitOperations($item, [], request(), 'update');

        return $item->fresh($this->defaultWith);
    }

    // =========================================================
    // Private Helpers
    // =========================================================

    /**
     * يتحقق أنه لا يوجد باركود primary آخر لنفس المنتج/variant
     */
    private function ensureNoPrimaryExists(int $productId, ?int $variantId, ?int $exceptId = null): void
    {
        $query = $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId)
            ->where('is_primary',  true);

        if ($variantId !== null) {
            $query->where('variant_id', $variantId);
        } else {
            $query->whereNull('variant_id');
        }

        if ($exceptId !== null) {
            $query->where('id', '!=', $exceptId);
        }

        if ($query->exists()) {
            throw new BusinessRuleException(
                'يوجد بالفعل باركود رئيسي لهذا المنتج. قم بإلغائه أولاً أو استخدم makePrimary().',
                422
            );
        }
    }

    /**
     * هل للمنتج/variant باركود واحد على الأقل؟
     */
    private function productHasAnyBarcode(int $productId, ?int $variantId): bool
    {
        $query = $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId);

        if ($variantId !== null) {
            $query->where('variant_id', $variantId);
        } else {
            $query->whereNull('variant_id');
        }

        return $query->exists();
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->getCurrentCompanyId();
    }
}




// ===== ملف: BrandService.php =====
namespace App\Services;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BrandService extends \App\Core\Services\BaseService
{
    protected string $model        = Brand::class;
    protected string $resourceName = 'brand';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    protected function beforeCreate(array $data, $request): array
    {
        $data['company_id'] = $data['company_id'] ?? auth()->user()?->company_id;
        return $data;
    }

    // ─────────────────────────────────────────────────────────────
    // التحكم الصارم في البيانات المرسلة للاستعلام لمنع تزمت SQLite
    // ─────────────────────────────────────────────────────────────
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // 1. استدعاء الأب لتصفية company_id وحقن updated_by
        $data = parent::prepareDataForUpdate($item, $data, $request);

        // 2. إذا تم إرسال الاسم في طلب التحديث
        if (isset($data['name'])) {
            // نتحقق من الـ slug المتوقع عبر الدالة الساكنة المحدثة
            $proposedSlug = Brand::uniqueSlug($data['name'], $item->company_id, $item->id);

            if ($proposedSlug === $item->slug) {
                // منع التحديث المتكرر لنفس القيم الحالية لتفادي حرج القيود في SQLite
                unset($data['slug'], $data['name']);
            } else {
                // إذا كان هناك اسم جديد ينتج عنه slug مختلف فعلياً
                $data['slug'] = $proposedSlug;
            }
        } else {
            // في حال لم يرسل حقل الاسم، نتأكد من عدم العبث بالـ slug
            unset($data['slug']);
        }

        return $data;
    }
}




// ===== ملف: CheckService.php =====
namespace App\Services;

use App\Models\Check;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CheckService extends \App\Core\Services\BaseService
{
    protected string $model = Check::class;
    protected string $resourceName = 'check';
    protected array $defaultWith = ['party', 'payments'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getPending()
    {
        return $this->model::pending()->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->get();
    }

    public function markAsCleared(Model $item): Model
    {
        $item->markAsCleared();
        return $item->fresh();
    }

    public function markAsBounced(Model $item, string $reason): Model
    {
        $item->markAsBounced($reason);
        return $item->fresh();
    }
}




// ===== ملف: CommercialDocumentLineService.php =====
namespace App\Services;

use App\Models\CommercialDocumentLine;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected function getResourceName(): string { return $this->resourceName; }

}




// ===== ملف: CommercialDocumentService.php =====
namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\FiscalYear;
use App\Models\NumberingSeries;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType',
        'party',
        'warehouse',
        'currency',
        'documentStatus',
        'lines.product',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════
    // Hooks — الترتيب الصحيح مع parent::beforeCreate()
    // ═══════════════════════════════════════════════════════════════

    /**
     * ⚠️ ملاحظة معمارية مهمة:
     *
     * BaseService::beforeCreate() يحذف company_id من $data تطبيقاً
     * لحماية Mass Assignment (الطبقة 4). لذا يجب أن:
     *   1. نعيّن company_id محلياً للاستخدام في هذا الدالة
     *   2. نستدعي parent::beforeCreate() الذي يحذفه من $data
     *   3. نُعيده بعد parent::beforeCreate() ليصل إلى Model::create()
     *
     * HasCompany trait يضيف company_id تلقائياً عبر creating() Observer،
     * لكننا نحتاجه هنا لـ: توليد رقم الوثيقة، validateTenantRelations،
     * resolveNumberingSeries — قبل أن يُنشأ الـ Model.
     */
    protected function beforeCreate(array $data, $request): array
    {
        // ══ الخطوة 1: تحديد company_id للاستخدام الداخلي ══════════
        // نجلبه من السياق أو من $data (قبل أن يحذفه parent)
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        // ══ الخطوة 2: استدعاء parent (يفلتر الأعمدة، يحذف company_id) ══
        $data = parent::beforeCreate($data, $request);

        // ══ الخطوة 3: إعادة company_id — ضروري لإنشاء الوثيقة ══════
        // HasCompany trait يمكنه تعيينه أيضاً، لكننا نضمن القيمة هنا
        $data['company_id'] = $companyId;

        // ══ الخطوة 4: user_id من المستخدم المسجّل ══════════════════
        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        // ══ الخطوة 5: إعداد بيانات الوثيقة (issued_at، exchange_rate) ══
        $data = $this->prepareDocumentData($data);

        // ══ الخطوة 6: التحقق من نوع الوثيقة ════════════════════════
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        // ══ الخطوة 7: التحقق من party_id حسب نوع الوثيقة ══════════
        // بعض الأنواع (مثل Bon de transfert) لا تتطلب طرفاً
        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        // ══ الخطوة 8: سلسلة الترقيم ══════════════════════════════
        if (empty($data['numbering_series_id'])) {
            $series = $this->resolveNumberingSeries($documentType->id, $companyId);
            $data['numbering_series_id'] = $series->id;
        }

        // ══ الخطوة 9: توليد رقم الوثيقة (داخل transaction مستقلة) ══
        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($documentType, $companyId);
        }

        // ══ الخطوة 10: السنة المالية ═══════════════════════════════
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId);
            if (!$data['fiscal_year_id']) {
                throw new BusinessRuleException('لا توجد سنة مالية مفتوحة. يرجى إنشاء سنة مالية أولاً.', 422);
            }
        }

        // ══ الخطوة 11: الحالة الافتراضية (draft) ═══════════════════
        if (empty($data['document_status_id'])) {
            $data['document_status_id'] = $this->getDefaultStatusId($companyId);
        }

        // ══ الخطوة 12: أمان Cross-Tenant ════════════════════════════
        // نتحقق فقط من الحقول الموجودة والغير فارغة
        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    /**
     * بعد إنشاء الوثيقة: إنشاء الأسطر وحساب الإجماليات
     *
     * ✅ LineObserver يحسب إجماليات كل سطر في saving()
     * ✅ calculateTotals() يستخدم updateQuietly() لتجنب إعادة تشغيل Observer
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        // حساب إجماليات الوثيقة من الأسطر المحسوبة
        $this->calculateTotals($item);
    }

    /**
     * بعد commit الكامل: إنشاء حركات المخزون
     *
     * ✅ بعد commit لضمان عدم rollback جزئي في حالة فشل حركة المخزون
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // نُعيد تحميل documentType لأن $item قد يكون محملاً قبل commit
        $item->load('documentType', 'lines.product');

        // حركات المخزون فقط للوثائق التي تؤثر على المخزون
        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }
    }

    /**
     * ✅ تحقق من null قبل استدعاء cannot()
     * ✅ نستخدم $request?->user() بدل auth() للسماح بـ programmatic calls
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // استدعاء parent أولاً (يمنع تغيير company_id)
        parent::beforeUpdate($item, $data, $request);

        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        if ($item->validated_at && $request?->user()?->cannot('force_edit_document')) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة معتمدة. تواصل مع المدير لتجاوز هذا القيد.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مقفلة.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // تحقق من وجود مدفوعات مرتبطة
        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مرتبطة بمدفوعات.', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════

    private function prepareDocumentData(array $data): array
    {
        // إذا لم يُرسَل exchange_rate، نجلبه تلقائياً
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        // issued_at = document_date إذا لم يُرسَل
        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        // document_date الافتراضي = اليوم
        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    /**
     * جلب سلسلة ترقيم نشطة أو إنشاء واحدة تلقائياً.
     */
    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        $series = NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first();

        if ($series) {
            return $series;
        }

        // fallback: إنشاء سلسلة افتراضية
        $prefix = $this->getPrefixForDocumentType($documentTypeId);

        return NumberingSeries::create([
            'company_id'       => $companyId,
            'document_type_id' => $documentTypeId,
            'name'             => $prefix . '-' . date('Y'),
            'prefix'           => $prefix,
            'current_number'   => 0,
            'is_locked'        => false,
        ]);
    }

    /**
     * ✅ استخدام الـ code من DocumentType بدل hardcoded match
     * — يتوافق مع DocumentTypeSeeder الذي يُعرّف: DEV, BCC, BL, FV, AV, DDP, BCF, BR, FA, AA, BT
     */
    private function getPrefixForDocumentType(int $documentTypeId): string
    {
        $code = DocumentType::where('id', $documentTypeId)->value('code');
        return $code ?? 'DOC';
    }

    /**
     * توليد رقم وثيقة فريد scoped بالشركة.
     *
     * ✅ يلفّ بـ DB::transaction() لضمان عمل lockForUpdate حتى لو
     *    استُدعيت خارج transaction خارجية (savepoints في MySQL/PostgreSQL).
     * ✅ يستخدم code من DocumentType مباشرة (لا hardcoded IDs).
     */
    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        return DB::transaction(function () use ($documentType, $companyId) {
            $prefix = $documentType->code;
            $year   = date('Y');
            $key    = $prefix . '-' . $year . '-%';

            // lockForUpdate يمنع race condition في الإنشاء المتزامن
            $last = CommercialDocument::where('company_id', $companyId)
                ->where('document_number', 'like', $key)
                ->orderByDesc('id') // أسرع من orderByDesc('document_number')
                ->lockForUpdate()
                ->first();

            if ($last) {
                $parts = explode('-', $last->document_number);
                $seq   = (int) end($parts) + 1;
            } else {
                $seq = 1;
            }

            return sprintf('%s-%s-%06d', $prefix, $year, $seq);
        });
    }

    /**
     * جلب السنة المالية الحالية scoped بالشركة.
     */
    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    /**
     * جلب الحالة الافتراضية (draft) scoped بالشركة.
     */
    private function getDefaultStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'draft')
            ->value('id');
    }

    /**
     * جلب حالة "ملغي" scoped بالشركة.
     */
    private function getCancelledStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'cancelled')
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        // العملة الأساسية (DZD افتراضياً id=1) — لا حاجة لاستعلام
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate');

        return $rate ?? 1.0;
    }

    /**
     * إنشاء أسطر الوثيقة.
     *
     * ✅ لا نستدعي calculateLineTotals() هنا —
     *    CommercialDocumentLineObserver::saving() يحسبها تلقائياً.
     * ✅ نحذف packaging_id إذا لم يكن في migration بعد (أو نتركه إن كان موجوداً).
     */
    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        // التحقق من أن جميع products تنتمي لنفس الشركة (Cross-Tenant)
        $productIds = array_filter(array_column($lines, 'product_id'));
        if (!empty($productIds)) {
            $this->validateTenantRelationsMany(
                array_map('intval', $productIds),
                'products',
                $document->company_id
            );
        }

        $lineOrder = 1;

        foreach ($lines as $lineData) {
            // الحقول الإلزامية للسطر
            $lineData['commercial_document_id'] = $document->id;
            $lineData['company_id']             = $document->company_id;
            $lineData['line_order']             = $lineOrder++;

            // ✅ لا نحسب الإجماليات هنا — LineObserver يتولى ذلك في saving()
            // ✅ LineObserver يعمل فقط إذا تغيرت القيم الأساسية (isDirty check)

            $document->lines()->create($lineData);
        }
    }

    /**
     * حساب إجماليات الوثيقة من الأسطر.
     *
     * ✅ يستخدم updateQuietly() لتجنب إعادة تشغيل CommercialDocumentObserver::saving()
     *    الذي يحتاج lines محملة — مما يؤدي إلى حلقة إذا استُخدم update() العادي.
     * ✅ نحمّل الأسطر من قاعدة البيانات بعد إنشائها (قيم Observer المحسوبة).
     */
    private function calculateTotals(CommercialDocument $document): void
    {
        // تحميل الأسطر المحسوبة من DB (بعد تشغيل LineObserver)
        $document->load('lines');

        $lines         = $document->lines;
        $totalHt       = $lines->sum('total_ht');
        $totalTva      = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        // حساب الطابع الجبائي
        $totalStamp = app(FiscalStampCalculator::class)->calculate($document);

        // حساب TAP إن وجدت
        $totalTap = 0.0;
        if (class_exists(\App\Services\Tax\TAPCalculator::class)) {
            $totalTap = app(\App\Services\Tax\TAPCalculator::class)->calculate($document);
        }

        $netToPay = $totalTtc + $totalStamp + $totalTap;

        // ✅ updateQuietly() — لا يشغّل Observers ولا Events
        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,      4),
            'total_discount'   => round($totalDiscount, 4),
            'total_stamp'      => round($totalStamp,    4),
            'total_tap'        => round($totalTap,      4),
            'total_ttc'        => round($totalTtc,      4),
            'net_to_pay'       => round($netToPay,      4),
            'remaining_amount' => round($netToPay,      4), // paid_amount = 0 عند الإنشاء
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Actions
    // ═══════════════════════════════════════════════════════════════

    /**
     * اعتماد الوثيقة وإنشاء حركات المخزون.
     *
     * ✅ idempotent: إذا كانت validated_at موجودة نتجاهل الطلب
     */
    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return; // بالفعل معتمدة
        }

        // ✅ updateQuietly لتجنب تشغيل Observer::saving() مع lines غير محملة
        $document->updateQuietly([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id ?? auth()->id(),
        ]);

        // تحديث الحالة إلى "validated"
        $validatedStatusId = DocumentStatus::where('company_id', $document->company_id)
            ->where('name', 'validated')
            ->value('id');

        if ($validatedStatusId && $document->document_status_id !== $validatedStatusId) {
            $document->updateQuietly(['document_status_id' => $validatedStatusId]);
        }

        // إنشاء حركات المخزون إذا كان النوع يؤثر على المخزون
        $document->load('documentType', 'lines.product');
        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($document);
        }
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة.', 409);
        }

        if ($document->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مرتبطة بمدفوعات.', 409);
        }

        $cancelledStatusId = $this->getCancelledStatusId($document->company_id);

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $cancelledStatusId,
        ]);
    }

    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════
    // Stock Movements
    // ═══════════════════════════════════════════════════════════════

    /**
     * إنشاء حركات المخزون من أسطر الوثيقة.
     *
     * ✅ يتحقق من أن الـ documentType موجود ويؤثر على المخزون
     * ✅ يتحقق من أن المنتج موجود في كل سطر
     * ✅ direction مستخرج من DocumentType (وليس hardcoded)
     */
    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        if (!$documentType) {
            return;
        }

        $direction = $documentType->affects_stock_direction;
        if ($direction === 0) {
            return; // الوثيقة لا تؤثر على المخزون (DEV، BCC، DDP، BCF)
        }

        if (!$document->warehouse_id) {
            Log::warning("CommercialDocumentService: لا يوجد مستودع للوثيقة #{$document->id} — لن تُنشأ حركات مخزون.");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);
        $stockMovementTypeId = $this->getStockMovementTypeId($direction);

        foreach ($document->lines as $line) {
            if (!$line->product) {
                continue;
            }

            // حساب سعر التكلفة حسب اتجاه الحركة
            if ($direction < 0) {
                // خروج (مبيعات): نستخدم سعر التكلفة الحالي من المخزون
                $costPrice = $valuationService->getCostPriceForSale(
                    $line->product,
                    $document->warehouse_id,
                    $line->quantity
                );
            } else {
                // دخول (مشتريات): سعر التكلفة = سعر الشراء
                $costPrice = (float) $line->unit_price_ht;
            }

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $line->quantity,
                'unit_price'                  => $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round($line->quantity * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        // direction > 0 = إدخال (شراء/إرجاع بيع)
        // direction < 0 = إخراج (بيع/إرجاع شراء)
        return match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };
    }
}




// ===== ملف: CommuneService.php =====
namespace App\Services;

use App\Models\Commune;

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = Commune::class;
    protected string $resourceName = 'commune';
    protected array $defaultWith = ['wilaya'];
    protected function getResourceName(): string { return $this->resourceName; }

}




// ===== ملف: CompanyContextService.php =====
// app/Services/CompanyContextService.php
namespace App\Services;

class CompanyContextService
{
    private ?int $companyId = null;

    public function set(int $id): void
    {
        $this->companyId = $id;
    }

    public function get(): ?int
    {
        return $this->companyId;
    }

    public function has(): bool
    {
        return $this->companyId !== null;
    }

    public function clear(): void
    {
        $this->companyId = null;
    }

    /**
     * تنفيذ كود ضمن سياق شركة مؤقت — مفيد للـ Jobs والـ Artisan Commands
     */
    public function runAs(int $companyId, callable $callback): mixed
    {
        $previous = $this->companyId;
        $this->companyId = $companyId;

        try {
            return $callback();
        } finally {
            $this->companyId = $previous;
        }
    }
}




// ===== ملف: CompanyRoleService.php =====
namespace App\Services;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CompanyRoleService
 * ══════════════════════════════════════════════════════════════════
 * خدمة إنشاء وإدارة الأدوار والصلاحيات لكل شركة في نظام Multi-Tenancy.
 *
 * تُستدعى في:
 *  1. CompanyObserver::created()  ← تلقائياً عند إنشاء شركة جديدة
 *  2. RolesAndPermissionsSeeder   ← عند التهيئة الأولى للنظام
 *  3. Console command: php artisan company:seed-roles {company_id}
 * ══════════════════════════════════════════════════════════════════
 */
class CompanyRoleService
{
    // ─────────────────────────────────────────────────────────────
    // نقطة الدخول الرئيسية
    // ─────────────────────────────────────────────────────────────

    /**
     * إنشاء أدوار الشركة الجديدة وتعيين صلاحياتها.
     * آمنة للاستدعاء المتعدد (idempotent).
     */
    public function seedRoles(int $companyId): void
    {
        DB::transaction(function () use ($companyId) {

            $this->createCompanyRoles($companyId);
            $this->assignPermissionsToRoles($companyId);

            // مسح الكاش بعد أي تعديل على الأدوار/الصلاحيات
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            Log::info("✅ [CompanyRoleService] تم إنشاء أدوار الشركة #{$companyId}");
        });
    }

    /**
     * تعيين دور معيّن لمستخدم داخل شركة.
     */
    public function assignRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->firstOrFail();

        // Spatie يسمح بأدوار متعددة — نُحدّد دور الشركة الواحدة فقط
        $user->assignRole($role);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * إزالة دور مستخدم داخل شركة معيّنة.
     */
    public function removeRole(User $user, string $roleName, int $companyId): void
    {
        $role = Role::where('name', $roleName)
            ->where('company_id', $companyId)
            ->where('guard_name', 'web')
            ->first();

        if ($role) {
            $user->removeRole($role);
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * جلب الدور الحالي للمستخدم داخل شركة.
     */
    public function getUserRole(User $user, int $companyId): ?Role
    {
        return $user->roles()
            ->where('company_id', $companyId)
            ->first();
    }

    /**
     * التحقق من أن المستخدم يملك دوراً محدداً في شركة.
     */
    public function hasRole(User $user, string $roleName, int $companyId): bool
    {
        return $user->roles()
            ->where('name', $roleName)
            ->where('company_id', $companyId)
            ->exists();
    }

    // ─────────────────────────────────────────────────────────────
    // إنشاء الأدوار
    // ─────────────────────────────────────────────────────────────

    private function createCompanyRoles(int $companyId): void
    {
        foreach ($this->getRolesDefinition() as $roleData) {
            Role::firstOrCreate(
                [
                    'name'       => $roleData['name'],
                    'guard_name' => 'web',
                    'company_id' => $companyId,
                ],
                [
                    'display_name' => $roleData['display_name'],
                    'description'  => $roleData['description'] ?? '',
                ]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعيين الصلاحيات للأدوار
    // ─────────────────────────────────────────────────────────────

    private function assignPermissionsToRoles(int $companyId): void
    {
        $globalPerms = Permission::whereNull('company_id')->get()->keyBy('name');

        foreach ($this->getRolePermissionsMap() as $roleName => $permNames) {

            $role = Role::where('name', $roleName)
                ->where('company_id', $companyId)
                ->where('guard_name', 'web')
                ->first();

            if (! $role) {
                Log::warning("[CompanyRoleService] الدور '{$roleName}' غير موجود للشركة #{$companyId}");
                continue;
            }

            $perms = $globalPerms->only($permNames)->values();
            $role->syncPermissions($perms);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // تعريف الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolesDefinition(): array
    {
        return [
            [
                'name'         => 'admin',
                'display_name' => 'مدير الشركة',
                'description'  => 'إدارة كاملة لجميع بيانات وموارد الشركة',
            ],
            [
                'name'         => 'manager',
                'display_name' => 'مدير العمليات',
                'description'  => 'إدارة المبيعات والمشتريات والمخزون والتقارير',
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'محاسب',
                'description'  => 'إدارة المدفوعات والشيكات والمصروفات والتقارير المالية',
            ],
            [
                'name'         => 'salesperson',
                'display_name' => 'بائع',
                'description'  => 'إنشاء مستندات البيع وإدارة العملاء',
            ],
            [
                'name'         => 'warehouse',
                'display_name' => 'أمين المخزن',
                'description'  => 'إدارة المخزون وحركاته',
            ],
            [
                'name'         => 'viewer',
                'display_name' => 'مشاهد',
                'description'  => 'قراءة فقط بدون أي صلاحيات كتابة',
            ],
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // خريطة صلاحيات الأدوار
    // ─────────────────────────────────────────────────────────────

    public function getRolePermissionsMap(): array
    {
        return [

            // ══════════════════════════════════════════════════════
            // مدير الشركة — صلاحيات كاملة على موارد الشركة
            // ══════════════════════════════════════════════════════
            'admin' => [
                // المستخدمون
                'view_any_user', 'view_user', 'create_user', 'update_user', 'delete_user',
                'restore_user', 'force_delete_user', 'toggle_active_user',
                'change_password_user', 'assign_role_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party',
                'delete_party', 'restore_party', 'force_delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'restore_product', 'manage_product_prices',
                'manage_product_variants', 'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'create_warehouse',
                'update_warehouse', 'delete_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                'manage_numbering_series',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                'delete_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'delete_stock_movement', 'view_any_product_lot', 'manage_product_lot',
                'manage_opening_balances',
                // الموظفون
                'view_any_employee', 'view_employee', 'create_employee',
                'update_employee', 'delete_employee', 'manage_employment_contracts',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية
                'view_any_fiscal_year', 'manage_fiscal_year',
                // الإعدادات
                'manage_settings', 'manage_lookups', 'manage_attachments', 'view_audit_log',
                // الأدوار
                'view_roles', 'manage_roles',
                // الشركة
                'view_company', 'update_company', 'manage_company_members', 'transfer_ownership',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث — عملات وتقييم وما إلى ذلك
                'view_any_currency',  'create_currency',  'update_currency',  'delete_currency',
                'view_any_tva',       'create_tva',       'update_tva',       'delete_tva',
                'view_any_unit',      'create_unit',      'update_unit',      'delete_unit',
                'view_any_family',    'create_family',    'update_family',    'delete_family',
                'view_any_brand',     'create_brand',     'update_brand',     'delete_brand',
                'view_any_price_level',  'create_price_level',  'update_price_level',  'delete_price_level',
                'view_any_payment_mode', 'create_payment_mode', 'update_payment_mode', 'delete_payment_mode',
                'view_any_expense_category', 'create_expense_category', 'update_expense_category', 'delete_expense_category',
                'view_any_exchange_rate',    'create_exchange_rate',    'update_exchange_rate',    'delete_exchange_rate',
                'view_any_document_type',    'create_document_type',    'update_document_type',    'delete_document_type',
                'view_any_document_status',  'create_document_status',  'update_document_status',  'delete_document_status',
                'view_any_gender',      'create_gender',      'update_gender',      'delete_gender',
                'view_any_legal_form',  'create_legal_form',  'update_legal_form',  'delete_legal_form',
                'view_any_party_type',  'create_party_type',  'update_party_type',  'delete_party_type',
                'view_any_product_type','create_product_type','update_product_type','delete_product_type',
                'view_any_treasury_account_type',  'create_treasury_account_type',  'update_treasury_account_type',  'delete_treasury_account_type',
                'view_any_stock_movement_type',    'create_stock_movement_type',    'update_stock_movement_type',    'delete_stock_movement_type',
                'view_any_inventory_valuation_method', 'create_inventory_valuation_method', 'update_inventory_valuation_method', 'delete_inventory_valuation_method',
            ],

            // ══════════════════════════════════════════════════════
            // مدير العمليات — عمليات يومية شاملة بدون إعدادات حساسة
            // ══════════════════════════════════════════════════════
            'manager' => [
                // المستخدمون (قراءة فقط)
                'view_any_user', 'view_user',
                // الأطراف
                'view_any_party', 'view_party', 'create_party', 'update_party', 'delete_party',
                // المنتجات
                'view_any_product', 'view_product', 'create_product', 'update_product',
                'delete_product', 'manage_product_prices', 'manage_product_variants',
                'manage_barcodes', 'manage_quantity_discounts',
                // المستودعات
                'view_any_warehouse', 'view_warehouse', 'update_warehouse',
                // المستندات التجارية
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'create_purchase_document',
                'update_commercial_document', 'delete_commercial_document',
                'validate_commercial_document', 'lock_commercial_document',
                'cancel_commercial_document', 'duplicate_commercial_document',
                // المدفوعات
                'view_any_payment', 'view_payment', 'create_payment', 'update_payment',
                // الشيكات
                'view_any_check', 'view_check', 'create_check', 'update_check', 'manage_check_status',
                // المصروفات
                'view_any_expense', 'view_expense', 'create_expense', 'update_expense',
                // الخزينة (قراءة فقط)
                'view_any_treasury_account', 'view_treasury_account',
                // المخزون
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // الموظفون (قراءة فقط)
                'view_any_employee', 'view_employee',
                // التقارير (كاملة)
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_lookups', 'manage_attachments', 'view_roles', 'view_company',
                // التنبيهات
                'view_any_notification', 'manage_notifications',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_tva', 'view_any_unit', 'view_any_family',
                'view_any_brand', 'view_any_price_level', 'view_any_payment_mode',
                'view_any_expense_category', 'view_any_exchange_rate',
                'view_any_document_type', 'view_any_document_status',
            ],

            // ══════════════════════════════════════════════════════
            // المحاسب — مالية وتقارير بدون تعديل بيانات تجارية
            // ══════════════════════════════════════════════════════
            'accountant' => [
                // الأطراف (قراءة)
                'view_any_party', 'view_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (تأكيد فقط)
                'view_any_commercial_document', 'view_commercial_document',
                'validate_commercial_document',
                // المدفوعات (كاملة)
                'view_any_payment', 'view_payment', 'create_payment',
                'update_payment', 'delete_payment',
                // الشيكات (كاملة)
                'view_any_check', 'view_check', 'create_check', 'update_check',
                'delete_check', 'manage_check_status',
                // المصروفات (كاملة)
                'view_any_expense', 'view_expense', 'create_expense',
                'update_expense', 'delete_expense',
                // الخزينة (إدارة)
                'view_any_treasury_account', 'view_treasury_account',
                'create_treasury_account', 'update_treasury_account',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                // التقارير
                'view_sales_report', 'view_purchase_report', 'view_financial_report',
                'view_party_report', 'view_dashboard',
                // السنوات المالية (قراءة)
                'view_any_fiscal_year',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_currency', 'view_any_payment_mode', 'view_any_expense_category',
                'view_any_exchange_rate', 'view_any_treasury_account_type',
            ],

            // ══════════════════════════════════════════════════════
            // البائع — مبيعات وعملاء فقط
            // ══════════════════════════════════════════════════════
            'salesperson' => [
                // الأطراف (إنشاء وتعديل)
                'view_any_party', 'view_party', 'create_party', 'update_party',
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // مستندات البيع فقط
                'view_any_commercial_document', 'view_commercial_document',
                'create_sales_document', 'update_commercial_document',
                'duplicate_commercial_document',
                // المدفوعات (قراءة + إنشاء)
                'view_any_payment', 'view_payment', 'create_payment',
                // المخزون (قراءة)
                'view_any_stock_movement', 'view_stock_movement',
                // التقارير المتعلقة بالمبيعات
                'view_sales_report', 'view_party_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_price_level', 'view_any_payment_mode', 'view_any_tva',
                'view_any_unit', 'view_any_family', 'view_any_brand',
            ],

            // ══════════════════════════════════════════════════════
            // أمين المخزن — مخزون فقط
            // ══════════════════════════════════════════════════════
            'warehouse' => [
                // المنتجات (قراءة)
                'view_any_product', 'view_product',
                // المستودعات (قراءة)
                'view_any_warehouse', 'view_warehouse',
                // المستندات (قراءة فقط)
                'view_any_commercial_document', 'view_commercial_document',
                // المخزون (كامل)
                'view_any_stock_movement', 'view_stock_movement', 'create_stock_movement',
                'view_any_product_lot', 'manage_product_lot',
                // التقارير
                'view_inventory_report', 'view_dashboard',
                // متفرقات
                'manage_attachments', 'view_company',
                // التنبيهات
                'view_any_notification',
                // جداول البحث (قراءة)
                'view_any_unit', 'view_any_family', 'view_any_brand',
                'view_any_stock_movement_type', 'view_any_inventory_valuation_method',
            ],

            // ══════════════════════════════════════════════════════
            // المشاهد — قراءة فقط بلا استثناء
            // ══════════════════════════════════════════════════════
            'viewer' => [
                'view_any_party', 'view_party',
                'view_any_product', 'view_product',
                'view_any_warehouse', 'view_warehouse',
                'view_any_commercial_document', 'view_commercial_document',
                'view_any_payment', 'view_payment',
                'view_any_check', 'view_check',
                'view_any_expense', 'view_expense',
                'view_any_treasury_account', 'view_treasury_account',
                'view_any_stock_movement', 'view_stock_movement', 'view_any_product_lot',
                'view_any_employee', 'view_employee',
                'view_sales_report', 'view_purchase_report', 'view_inventory_report',
                'view_financial_report', 'view_party_report', 'view_dashboard',
                'view_any_fiscal_year', 'view_roles', 'view_company',
                'view_any_notification',
            ],
        ];
    }
}




// ===== ملف: CompanyService.php =====
namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\Log;

class CompanyService extends \App\Core\Services\BaseService
{
    protected string $model        = Company::class;
    protected string $resourceName = 'company';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'company';
    }

    public function __construct(private ?CompanyContextService $context = null) {}

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
        }
        $data['owner_id']  = auth()->id();
        $data['active'] = $data['active'] ?? true;
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // ربط المالك بالشركة في الجدول الوسيط
        $ownerId = $data['owner_id'] ?? auth()->id();

        DB::table('company_user')->insertOrIgnore([
            'user_id'    => $ownerId,
            'company_id' => $item->id,
            'role'       => 'owner',
            'active'     => true,
            'is_default' => true,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // باقي المهام (بذر الأدوار وتعيين دور admin للمالك) يتولاها CompanyObserver تلقائياً
        Log::info("Company created: {$item->name}, owner: {$ownerId}");
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        Log::info("New company created: {$item->name} by User#" . auth()->id());
    }

    // ═══════════════════════════════════════════
    // تبديل السياق — switchContext
    // ═══════════════════════════════════════════

    public function switchContext(User $user, Company $company): void
    {
        // ① super-admin يتجاوز كل التحقق — لديه صلاحية الوصول لأي شركة
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            $this->applyContext($user, $company);
            return;
        }

        // ② التحقق من العضوية النشطة للمستخدمين العاديين
        $membership = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->first();

        if (!$membership) {
            throw new BusinessRuleException(
                'أنت لست عضواً في هذه الشركة.',
                403
            );
        }

        if (!$membership->active) {
            throw new BusinessRuleException(
                'حسابك معطّل داخل هذه الشركة. تواصل مع المسؤول.',
                403
            );
        }

        if (!$company->active) {
            throw new BusinessRuleException(
                'هذه الشركة غير مفعّلة حالياً.',
                403
            );
        }

        $this->applyContext($user, $company);
    }

    /**
     * تطبيق السياق فعلياً بعد التحقق
     */
    private function applyContext(User $user, Company $company): void
    {
        // ضبط CompanyContextService
        if (!$this->context) {
            $this->context = app(CompanyContextService::class);
        }
        $this->context->set($company->id);

        // تحديث is_default في الـ pivot (إن كان المستخدم عضواً)
        $isMember = DB::table('company_user')
            ->where('user_id',    $user->id)
            ->where('company_id', $company->id)
            ->exists();

        if ($isMember) {
            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', $company->id)
                ->update(['is_default' => true]);

            DB::table('company_user')
                ->where('user_id', $user->id)
                ->where('company_id', '!=', $company->id)
                ->update(['is_default' => false]);
        }

        // تحديث company_id في جدول users
        $user->update(['company_id' => $company->id]);
    }

    // ═══════════════════════════════════════════
    // دوال مساعدة
    // ═══════════════════════════════════════════

    public function getUserCompanies()
    {
        return auth()->user()->companies()->get();
    }

    public function getMembers(Company $company)
    {
        return $company->users()
            ->withPivot(['role', 'active', 'joined_at'])
            ->get();
    }

    public function getStats(): array
    {
        return [
            'total_companies'     => Company::count(),
            'active_companies'    => Company::active()->count(),
            'suspended_companies' => Company::suspended()->count(),
            'verified_companies'  => Company::verified()->count(),
            'on_trial_companies'  => Company::onTrial()->count(),
            'plans_distribution'  => Company::select('plan', DB::raw('COUNT(*) as total'))
                ->groupBy('plan')
                ->pluck('total', 'plan')
                ->toArray(),
        ];
    }
}




// ===== ملف: CurrencyService.php =====
namespace App\Services;

use App\Models\Currency;

/**
 * Currency Service
 *
 * @package App\Services
 */
class CurrencyService extends \App\Core\Services\BaseService
{
    protected string $model = Currency::class;
    protected string $resourceName = 'currency';
    protected function getResourceName(): string { return $this->resourceName; }

}




// ===== ملف: DashboardService.php =====
namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getSummary(): array
    {
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        $salesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->sum('total_ttc');

        $purchasesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'))
            ->sum('total_ttc');

        $customersCount = Party::where('party_type_id', 1)->count();
        $suppliersCount = Party::where('party_type_id', 2)->count();
        $productsCount = Product::count();

        $unpaidInvoices = CommercialDocument::where('remaining_amount', '>', 0)
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->count();

        $overdueInvoices = CommercialDocument::where('due_date', '<', Carbon::now())
            ->where('remaining_amount', '>', 0)
            ->count();

        return [
            'sales_this_month' => round($salesTotal, 2),
            'purchases_this_month' => round($purchasesTotal, 2),
            'customers_count' => $customersCount,
            'suppliers_count' => $suppliersCount,
            'products_count' => $productsCount,
            'unpaid_invoices' => $unpaidInvoices,
            'overdue_invoices' => $overdueInvoices,
        ];
    }

    public function getSalesChart(string $period = 'month'): array
    {
        $data = [];

        if ($period === 'year') {
            for ($month = 1; $month <= 12; $month++) {
                $total = CommercialDocument::whereYear('document_date', Carbon::now()->year)
                    ->whereMonth('document_date', $month)
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc');
                $data[] = [
                    'month' => $month,
                    'label' => Carbon::create(null, $month)->format('M'),
                    'total' => round($total, 2),
                ];
            }
        } else {
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::now()->subDays($i);
                $total = CommercialDocument::whereDate('document_date', $date)
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc');
                $data[] = [
                    'date' => $date->format('Y-m-d'),
                    'label' => $date->format('d M'),
                    'total' => round($total, 2),
                ];
            }
        }

        return $data;
    }

    public function getTopProducts(int $limit = 10): array
    {
        return CommercialDocumentLine::select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total) as total_amount'))
            ->whereHas('commercialDocument', fn($q) => $q->whereHas('documentType', fn($q) => $q->where('code', 'invoice')))
            ->groupBy('product_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'total_quantity' => $item->total_qty,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getTopCustomers(int $limit = 10): array
    {
        return CommercialDocument::select('party_id', DB::raw('SUM(total_ttc) as total_amount'))
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->whereYear('document_date', Carbon::now()->year)
            ->groupBy('party_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'party_id' => $item->party_id,
                'party_name' => $item->party?->name,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getRecentTransactions(int $limit = 10): array
    {
        return CommercialDocument::with(['documentType', 'party'])
            ->whereYear('document_date', Carbon::now()->year)
            ->orderByDesc('document_date')
            ->limit($limit)
            ->get()
            ->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'document_type' => $doc->documentType?->name,
                'party_name' => $doc->party?->name,
                'total' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
                'date' => $doc->document_date?->format('Y-m-d'),
            ])
            ->toArray();
    }

    public function getInventorySummary(): array
    {
        $totalProducts = Product::count();
        $lowStockProducts = Product::whereColumn('current_stock', '<=', 'min_stock_alert')->count();
        $stockIn = StockMovement::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->where('movement_type_id', 1)
            ->sum('quantity');

        $stockOut = StockMovement::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->where('movement_type_id', 2)
            ->sum('quantity');

        return [
            'total_products' => $totalProducts,
            'low_stock_count' => $lowStockProducts,
            'stock_in_this_month' => $stockIn ?? 0,
            'stock_out_this_month' => $stockOut ?? 0,
        ];
    }
}




// ===== ملف: DocumentBaseOperationService.php =====
namespace App\Services;

use App\Models\DocumentBaseOperation;

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected function getResourceName(): string { return $this->resourceName; }

}




// ===== ملف: DocumentServices.php =====
namespace App\Services;

use App\Models\DocumentType;
use App\Models\CommercialDocumentLine;
use App\Models\Expense;
use App\Models\ProductLot;
use App\Models\FiscalYear;
use App\Models\Payment;
use App\Models\StockMovement;
use App\Models\Gender;
use App\Models\InventoryValuationMethod;
use App\Models\TreasuryAccountType;
use App\Models\FiscalStamp;
use App\Models\DocumentBaseOperation;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
    protected array $defaultWith = ['documentBaseOperation', 'numberingSeries'];
    protected function getResourceName(): string { return $this->resourceName; }

}

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected array $defaultWith = ['commercialDocument', 'product', 'stockLot']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
}

// تم حذف ProductVariantService بالكامل (لأن ProductVariant لم يعد موجوداً)

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected array $defaultWith = ['expenseCategory', 'paymentMode', 'treasuryAccount'];

    public function getPaid() { return $this->model::paid()->get(); }
    public function getUnpaid() { return $this->model::unpaid()->get(); }
    protected function getResourceName(): string { return $this->resourceName; }

}

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected array $defaultWith = ['product', 'warehouse']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }

    public function getAvailable() { return $this->model::available()->get(); }
    public function getExpiringSoon(int $days = 30) { return $this->model::expiringSoon($days)->get(); }
}

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
    protected array $defaultWith = ['closedBy'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getCurrent() { return $this->model::current()->first(); }
    public function getOpen() { return $this->model::open()->get(); }
    public function close(\Illuminate\Database\Eloquent\Model $item, int $userId, ?string $notes = null) { $item->close($userId, $notes); return $item->fresh(); }
}

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected array $defaultWith = ['currency', 'paymentMode', 'treasuryAccount', 'party'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getConfirmed() { return $this->model::confirmed()->get(); }
    public function getPending() { return $this->model::pending()->get(); }
}

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected array $defaultWith = ['product', 'warehouse', 'stockMovementType']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
    public function getIncoming() { return $this->model::incoming()->get(); }
    public function getOutgoing() { return $this->model::outgoing()->get(); }
}

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
    protected function getResourceName(): string { return $this->resourceName; }

}

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected array $defaultWith = ['products']; // ✅ تم التعديل (كان productVariants)
    protected function getResourceName(): string { return $this->resourceName; }
}

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected array $defaultWith = ['treasuryAccounts'];
    protected function getResourceName(): string { return $this->resourceName; }
}

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
    protected function getResourceName(): string { return $this->resourceName; }
}

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected array $defaultWith = ['documentTypes'];
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: DocumentStatusService.php =====
namespace App\Services;

use App\Models\DocumentStatus;
use Illuminate\Http\Request;

class DocumentStatusService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentStatus::class;
    protected string $resourceName = 'document_status';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: DocumentTypeService.php =====
namespace App\Services;

use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Collection;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * إعادة جميع أنواع المستندات مرتبةً حسب display_order
     */
    public function getAllOrdered(array $filters = []): Collection
    {
        return DocumentType::query()
            ->when(isset($filters['active']), fn($q) => $q->where('active', $filters['active']))
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
    }
}




// ===== ملف: EmployeeService.php =====
namespace App\Services;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeService extends \App\Core\Services\BaseService
{
    protected string $model = Employee::class;
    protected string $resourceName = 'employee';
    protected array $defaultWith = ['user', 'gender', 'contracts'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getActiveEmployees()
    {
        return $this->model::active()->get();
    }
}




// ===== ملف: EmploymentContractService.php =====
namespace App\Services;

use App\Models\EmploymentContract;
use Illuminate\Http\Request;

class EmploymentContractService extends \App\Core\Services\BaseService
{
    protected string $model = EmploymentContract::class;
    protected string $resourceName = 'employment_contract';
    protected array $defaultWith = ['employee'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getActiveContract(int $employeeId)
    {
        return $this->model::where('employee_id', $employeeId)->active()->first();
    }
}




// ===== ملف: ExchangeRateService.php =====
namespace App\Services;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class ExchangeRateService extends \App\Core\Services\BaseService
{
    protected string $model = ExchangeRate::class;
    protected string $resourceName = 'exchange_rate';
    protected array $defaultWith = ['fromCurrency', 'toCurrency'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getLatest()
    {
        return $this->model::latest()->get();
    }
}




// ===== ملف: ExpenseCategoryService.php =====
namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryService extends \App\Core\Services\BaseService
{
    protected string $model = ExpenseCategory::class;
    protected string $resourceName = 'expense_category';
    protected array $defaultWith = ['parent', 'children'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getRoots()
    {
        return $this->model::roots()->get();
    }
}




// ===== ملف: ExpenseService.php =====
namespace App\Services;

use App\Models\Expense;

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: FamilyService.php =====
namespace App\Services;

use App\Models\Family;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Family Service
 *
 * @package App\Services
 */
class FamilyService extends \App\Core\Services\BaseService
{
    protected string $model = Family::class;
    protected string $resourceName = 'family';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, $request): array
    {
        // 💡 تم حذف سطر توليد الـ slug يدوياً هنا؛ لأن الموديل سيتولى توليده تلقائياً
        // داخل حدث الـ creating الخاص بالـ Eloquent بعد أن يقوم تريت HasCompany بحقن معرف الشركة بأمان.

        return $data;
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        $data = parent::prepareDataForUpdate($item, $data, $request);

        if (isset($data['name'])) {
            $modelClass = $this->model;
            $proposedSlug = $modelClass::uniqueSlug($data['name'], $item->company_id, $item->id);

            if ($proposedSlug === $item->slug) {
                unset($data['slug'], $data['name']);
            } else {
                $data['slug'] = $proposedSlug;
            }
        } else {
            unset($data['slug']);
        }

        return $data;
    }
}




// ===== ملف: FiscalStampService.php =====
// app/Services/FiscalStampService.php

namespace App\Services;

use App\Models\FiscalStamp;
use App\Models\CommercialDocument;
use Carbon\Carbon;

class FiscalStampService
{
    /**
     * حساب الطابع الجبائي المنطبق على مستند تجاري
     */
    public function calculateStamp(CommercialDocument $document): array
    {
        $baseAmount = $document->total_ttc; // الأساس هو المبلغ شامل الضريبة

        $stamp = FiscalStamp::where('active', true)
            ->where('valid_from', '<=', $document->document_date)
            ->where(function ($q) use ($document) {
                $q->whereNull('valid_to')->orWhere('valid_to', '>=', $document->document_date);
            })
            ->where('min_amount', '<=', $baseAmount)
            ->where(function ($q) use ($baseAmount) {
                $q->whereNull('max_amount')->orWhere('max_amount', '>=', $baseAmount);
            })
            ->first();

        if (!$stamp) {
            return ['amount' => 0.0, 'stamp_id' => null];
        }

        $amount = $stamp->type === 'percentage'
            ? round($baseAmount * ($stamp->stamp_value / 100), 4)
            : $stamp->stamp_value;

        return ['amount' => $amount, 'stamp_id' => $stamp->id];
    }

    /**
     * تطبيق الطابع على المستند وإعادة حساب net_to_pay
     */
    public function applyStampToDocument(CommercialDocument $document): CommercialDocument
    {
        $stampData = $this->calculateStamp($document);

        $document->stamp_amount = $stampData['amount'];
        $document->fiscal_stamp_id = $stampData['stamp_id'];
        $document->net_to_pay = $document->total_ttc + $document->stamp_amount - $document->paid_amount;

        return $document;
    }
}




// ===== ملف: FiscalYearService.php =====
namespace App\Services;

use App\Models\FiscalYear;
use App\Services\Accounting\FiscalYearClosureService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ✅ إصلاح نهائي لـ FiscalYearService
 *
 * المشاكل السابقة:
 * 1. FiscalYear::refreshClosedYearsCache() → method غير موجودة على Model
 * 2. الـ close() لا يستخدم FiscalYearClosureService مما يتسبب في 500
 */
class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model      = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';

    public function __construct(
        private FiscalYearClosureService $closureService
    ) {}

        protected function getResourceName(): string
    {
        return 'fiscal_year';
    }


    public function getCurrent(): ?FiscalYear
    {
        return FiscalYear::where('is_current', true)->first();
    }

    public function getOpen()
    {
        return FiscalYear::where('is_closed', false)->get();
    }

    /**
     * ✅ إصلاح: استخدام FiscalYearClosureService بدل year->close() مباشرة
     *    FiscalYearClosureService يتولى:
     *      - التحقق من القيود غير المتوازنة
     *      - إنشاء السنة الجديدة
     *      - نقل الأرصدة
     *      - الإقفال الفعلي
     *
     * @throws \Exception إذا فشل التحقق
     */
    public function close(FiscalYear $year, int $userId, ?string $notes = null): FiscalYear
    {
        // ✅ تحديث closing_notes قبل استدعاء الـ Service
        if ($notes) {
            $year->update(['closing_notes' => $notes]);
            $year->refresh();
        }

        // ✅ استخدام الـ Closure Service الكامل الذي يتولى كل الخطوات
        $newYear = $this->closureService->closeYear($year, $userId);

        // ✅ مسح الكاش بأمان بدون استدعاء method غير موجودة
        $this->clearFiscalYearCache();

        return $newYear;
    }

    /**
     * مسح كاش السنوات المالية — آمن لجميع cache drivers
     */
    private function clearFiscalYearCache(): void
    {
        try {
            $driver = config('cache.default', 'file');

            if (in_array($driver, ['redis', 'memcached', 'dynamodb'])) {
                Cache::tags(['fiscal_years'])->flush();
            } else {
                // file / database cache لا تدعم tags
                foreach (['fiscal_years_closed', 'fiscal_years_current', 'fiscal_years_all', 'current_fiscal_year'] as $key) {
                    Cache::forget($key);
                }
            }
        } catch (\Throwable $e) {
            // لا تُفشل العملية بسبب مشكلة في الكاش
            Log::warning("فشل مسح كاش السنوات المالية: {$e->getMessage()}");
        }
    }
}




// ===== ملف: GenderService.php =====
namespace App\Services;

use App\Models\Gender;

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: InventoryReportService.php =====
// app/Services/InventoryReportService.php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class InventoryReportService
{
    /**
     * تقرير حركات المخزون مع Pivot حسب العائلات والعلامات التجارية
     */
    public function getMovementsPivotReport(string $fromDate, string $toDate, ?array $familyIds = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->leftJoin('brands as b', 'b.id', '=', 'p.brand_id')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'f.name as family_name',
                'b.name as brand_name',
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.quantity ELSE 0 END) as total_in_qty"),
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.total_price ELSE 0 END) as total_in_value"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.quantity ELSE 0 END) as total_out_qty"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.total_price ELSE 0 END) as total_out_value"),
                DB::raw('COUNT(DISTINCT sm.product_id) as unique_products')
            );

        if ($familyIds) {
            $query->whereIn('p.family_id', $familyIds);
        }

        return $query->groupBy('f.name', 'b.name')
            ->orderBy('family_name')
            ->orderBy('brand_name')
            ->get()
            ->map(function ($item) {
                $item->total_in_qty = (float) $item->total_in_qty;
                $item->total_out_qty = (float) $item->total_out_qty;
                $item->total_in_value = (float) $item->total_in_value;
                $item->total_out_value = (float) $item->total_out_value;
                return $item;
            });
    }

    /**
     * تقرير تفصيلي لحركات منتج معين
     */
    public function getProductMovementsDetail(int $productId, int $warehouseId, string $fromDate, string $toDate): Collection
    {
        return DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->leftJoin('commercial_document_lines as cdl', 'cdl.id', '=', 'sm.commercial_document_line_id')
            ->leftJoin('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->where('sm.product_id', $productId)
            ->where('sm.warehouse_id', $warehouseId)
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'sm.movement_date',
                'smt.label as movement_type',
                'smt.direction',
                'sm.quantity',
                'sm.unit_price',
                'sm.total_price',
                'sm.lot_number',
                'cd.document_number',
                'cd.document_date'
            )
            ->orderBy('sm.movement_date')
            ->get();
    }

    /**
     * تقرير المخزون الحالي مع Pivot حسب العائلات
     */
    public function getCurrentStockPivotReport(?int $warehouseId = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->where('sm.is_validated', true);

        if ($warehouseId) {
            $query->where('sm.warehouse_id', $warehouseId);
        }

        // الحصول على آخر رصيد لكل منتج
        $subQuery = DB::table('stock_movements as sm2')
            ->select('sm2.product_id', 'sm2.warehouse_id', 'sm2.stock_balance_after')
            ->whereIn('sm2.id', function ($q) {
                $q->select(DB::raw('MAX(id)'))
                    ->from('stock_movements')
                    ->groupBy('product_id', 'warehouse_id');
            });

        return DB::query()
            ->fromSub($subQuery, 'last_movements')
            ->join('products as p', 'p.id', '=', 'last_movements.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->select(
                'f.name as family_name',
                DB::raw('COUNT(DISTINCT p.id) as products_count'),
                DB::raw('SUM(last_movements.stock_balance_after) as total_quantity'),
                DB::raw('SUM(last_movements.stock_balance_after * p.current_cost_price) as total_value')
            )
            ->groupBy('f.name')
            ->orderBy('family_name')
            ->get();
    }
}




// ===== ملف: InventoryValuationMethodService.php =====
namespace App\Services;

use App\Models\InventoryValuationMethod;

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: InventoryValuationService.php =====
// app/Services/InventoryValuationService.php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\ProductLot;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;

class InventoryValuationService
{
    /**
     * تحديث تكلفة المخزون بعد حركة شراء (إدخال)
     */
    public function updateCostAfterPurchase(StockMovement $movement): void
    {
        $product = $movement->product;

        if (!$product->valuationMethod) {
            return; // لا توجد طريقة تقييم محددة
        }

        if ($product->valuationMethod->method === 'weighted_average') {
            $this->updateWeightedAverage($product, $movement->warehouse_id);
        }
        // FIFO لا يحتاج تحديث تلقائي
    }

    /**
     * تحديث المتوسط المرجح (PMP) للمنتج في مستودع معين
     */
    private function updateWeightedAverage(Product $product, int $warehouseId): void
    {
        $result = DB::table('stock_movements')
            ->join('stock_movement_types', 'stock_movement_types.id', '=', 'stock_movements.stock_movement_type_id')
            ->where('stock_movements.product_id', $product->id)
            ->where('stock_movements.warehouse_id', $warehouseId)
            ->where('stock_movements.is_validated', true)
            ->selectRaw('
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity * unit_price ELSE 0 END) as total_value_in,
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity ELSE 0 END) as total_qty_in,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity * cost_price ELSE 0 END) as total_value_out,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity ELSE 0 END) as total_qty_out
            ')
            ->first();

        if ($result && $result->total_qty_in > 0) {
            $currentStockQty = $result->total_qty_in - ($result->total_qty_out ?? 0);
            $currentStockValue = $result->total_value_in - ($result->total_value_out ?? 0);

            if ($currentStockQty > 0) {
                $pmp = $currentStockValue / $currentStockQty;
                $product->update(['current_cost_price' => round($pmp, 4)]);
            }
        }
    }

    /**
     * حساب تكلفة حركة خروج (مبيعات) بناءً على طريقة التقييم
     */
    public function getCostPriceForSale(Product $product, int $warehouseId, float $quantity): float
    {
        if (!$product->valuationMethod) {
            return (float) $product->purchase_price_ht;
        }

        switch ($product->valuationMethod->method) {
            case 'weighted_average':
                return $product->current_cost_price ?? (float) $product->purchase_price_ht;

            case 'fifo':
                return $this->getFIFOCost($product, $warehouseId, $quantity);

            case 'lifo':
                return $this->getLIFOCost($product, $warehouseId, $quantity);

            default:
                return (float) $product->purchase_price_ht;
        }
    }

    /**
     * حساب تكلفة FIFO (First In, First Out)
     */
    private function getFIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;
        $usedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;

            $usedLots[] = [
                'lot' => $lot,
                'quantity' => $qtyFromLot
            ];
        }

        if ($remainingQty > 0) {
            // الكمية المطلوبة أكبر من المخزون المتاح
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * حساب تكلفة LIFO (Last In, First Out)
     */
    private function getLIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;
        }

        if ($remainingQty > 0) {
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * تحديث أرصدة الدفعات بعد حركة خروج (FIFO/LIFO)
     */
    public function updateLotBalancesAfterSale(Product $product, int $warehouseId, float $quantity, string $method = 'fifo'): array
    {
        $orderDirection = $method === 'fifo' ? 'asc' : 'desc';

        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', $orderDirection)
            ->orderBy('id', $orderDirection)
            ->get();

        $remainingQty = $quantity;
        $updatedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $newRemaining = $lot->remaining_quantity - $qtyFromLot;

            $lot->update([
                'remaining_quantity' => $newRemaining,
                'is_depleted' => $newRemaining <= 0
            ]);

            $updatedLots[] = [
                'lot_id' => $lot->id,
                'quantity_used' => $qtyFromLot,
                'remaining' => $newRemaining
            ];

            $remainingQty -= $qtyFromLot;
        }

        return $updatedLots;
    }
}




// ===== ملف: LegalFormService.php =====
namespace App\Services;

use App\Models\LegalForm;

class LegalFormService extends \App\Core\Services\BaseService
{
    protected string $model = LegalForm::class;
    protected string $resourceName = 'legal_form';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: LookupServices.php =====
namespace App\Services;

use App\Models\Wilaya;
use Illuminate\Http\Request;

class WilayaService extends \App\Core\Services\BaseService
{
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
    protected function getResourceName(): string { return $this->resourceName; }
}

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\Commune::class;
    protected string $resourceName = 'commune';
    protected function getResourceName(): string { return $this->resourceName; }
    protected array $defaultWith = ['wilaya'];
}

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
    protected function getResourceName(): string { return $this->resourceName; }
    protected array $defaultWith = ['stockMovements'];
}

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\ProductType::class;
    protected string $resourceName = 'product_type';
    protected function getResourceName(): string { return $this->resourceName; }
    protected array $defaultWith = ['products'];
}

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\PartyType::class;
    protected string $resourceName = 'party_type';
    protected function getResourceName(): string { return $this->resourceName; }
    protected array $defaultWith = ['parties'];
}




// ===== ملف: NotificationService.php =====
namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NotificationService extends \App\Core\Services\BaseService
{
    protected string $model = Notification::class;
    protected string $resourceName = 'notification';
    protected function getResourceName(): string { return $this->resourceName; }

    public function getUnread()
    {
        $user = auth()->user();
        if (!$user) {
            return collect();
        }
        return $user->notifications()->unread()->get();
    }

    public function markAsRead(Model $notification): bool
    {
        $user = auth()->user();
        // التأكد أن هذا الإشعار يخص المستخدم الحالي
        if (
            $notification->notifiable_id != $user->id ||
            $notification->notifiable_type !== get_class($user)
        ) {
            throw new BusinessRuleException('لا يمكنك تعليم هذا الإشعار كمقروء', 403);
        }
        return $notification->markAsRead();
    }

    public function markAllAsRead(): void
    {
        $user = auth()->user();
        if ($user) {
            $user->notifications()->unread()->update(['read_at' => now()]);
        }
    }
}




// ===== ملف: NumberingSeriesService.php =====
namespace App\Services;

use App\Models\NumberingSeries;
use App\Models\CommercialDocument;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NumberingSeriesService extends \App\Core\Services\BaseService
{
    protected string $model = NumberingSeries::class;
    protected string $resourceName = 'numbering_series';
    protected array $defaultWith = ['documentType', 'warehouse'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function unlock(Model $item): Model
    {
        $item->update(['is_locked' => false]);
        return $item->fresh();
    }

    public function lock(Model $item): Model
    {
        $item->update(['is_locked' => true]);
        return $item->fresh();
    }

    /**
     * الحصول على الرقم التالي مع قفل الصف لمنع Race Condition
     */
    public function getNextNumberWithLock(int $seriesId): array
    {
        return DB::transaction(function () use ($seriesId) {
            $series = NumberingSeries::where('id', $seriesId)
                ->lockForUpdate()
                ->first();

            if (!$series) {
                abort(404, 'سلسلة الترقيم غير موجودة');
            }

            $nextNumber = $series->getNextNumber();
            $series->incrementNumber();

            return [
                'series_id' => $series->id,
                'next_number' => $nextNumber,
            ];
        });
    }

    /**
     * مزامنة الرقم الحالي مع أعلى رقم موجود فعلياً في المستندات من هذا النوع
     */
    public function syncWithActualDocuments(int $seriesId): Model
    {
        $series = $this->findById($seriesId);

        // استخراج أعلى رقم من المستندات الفعلية
        $maxLastNumber = CommercialDocument::where('document_type_id', $series->document_type_id)
            ->when($series->warehouse_id, function ($q) use ($series) {
                $q->where('warehouse_id', $series->warehouse_id);
            })
            ->whereNotNull('document_number')
            ->get()
            ->map(function ($doc) use ($series) {
                // استخراج الجزء الرقمي من الرقم المُنسَّق
                return $this->extractNumericPart($doc->document_number, $series);
            })
            ->max();

        $newLastNumber = max($maxLastNumber ?? ($series->start_number - 1), $series->start_number - 1);

        $series->update(['last_number' => $newLastNumber]);

        return $series->fresh();
    }

    /**
     * استخراج الجزء الرقمي من رقم مستند بناءً على صيغة السلسلة
     * (تحليل ذكي + آمن + performant)
     */
    private function extractNumericPart(string $documentNumber, NumberingSeries $series): ?int
    {
        static $compiledCache = [];

        $cacheKey = md5(
            $series->format . '|' .
                ($series->prefix ?? '') . '|' .
                ($series->suffix ?? '')
        );

        // ===============================
        // 1. بناء regex مرة واحدة فقط (Cache)
        // ===============================
        if (!isset($compiledCache[$cacheKey])) {

            $pattern = $series->format;

            // حماية prefix / suffix
            $prefix = $series->prefix ? preg_quote($series->prefix, '#') : '';
            $suffix = $series->suffix ? preg_quote($series->suffix, '#') : '';

            $pattern = str_replace('{PREFIX}', $prefix, $pattern);
            $pattern = str_replace('{SUFFIX}', $suffix, $pattern);

            // المتغيرات الزمنية
            $pattern = str_replace(
                ['{YYYY}', '{YY}', '{MM}', '{MONTH}'],
                ['\d{4}', '\d{2}', '\d{2}', '\d{2}'],
                $pattern
            );

            // {NUMBER} و {NUMBER:4}
            $pattern = preg_replace_callback('/\{NUMBER(?::(\d+))?\}/', function ($m) {
                if (isset($m[1])) {
                    return '(?P<number>\d{' . $m[1] . '})';
                }
                return '(?P<number>\d+)';
            }, $pattern);

            $compiledCache[$cacheKey] = '#^' . $pattern . '$#u';
        }

        $regex = $compiledCache[$cacheKey];

        // ===============================
        // 2. المحاولة الأساسية (مطابقة دقيقة)
        // ===============================
        if (preg_match($regex, $documentNumber, $matches)) {
            if (isset($matches['number']) && is_numeric($matches['number'])) {
                return (int) $matches['number'];
            }
        }

        // ===============================
        // 3. fallback (أكثر أمان)
        // آخر رقم فقط
        // ===============================
        if (preg_match('/(\d+)(?!.*\d)/', $documentNumber, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

}




// ===== ملف: OpeningBalancePartyService.php =====
namespace App\Services;

use App\Models\OpeningBalanceParty;
use Illuminate\Http\Request;

class OpeningBalancePartyService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceParty::class;
    protected string $resourceName = 'opening_balance_party';
    protected array $defaultWith = ['fiscalYear', 'party'];
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: OpeningBalanceStockService.php =====
namespace App\Services;

use App\Models\OpeningBalanceStock;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\FiscalYear;
use App\Models\StockMovement;
use App\Models\StockMovementType;
use Illuminate\Support\Facades\DB;

class OpeningBalanceStockService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceStock::class;
    protected string $resourceName = 'opening_balance_stock';
    protected array $defaultWith = ['fiscalYear', 'product', 'warehouse'];
    protected function getResourceName(): string { return $this->resourceName; }

      /**
     * إنشاء رصيد افتتاحي لمنتج (بدون دفعة)
     */
    public function createOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        float $quantity,
        float $unitPrice
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $quantity, $unitPrice) {
            // حفظ الرصيد الافتتاحي
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => null,
                'manufacturing_date' => null,
                'expiration_date' => null,
            ]);

            // إنشاء حركة مخزون افتتاحية
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }

    /**
     * إنشاء رصيد افتتاحي لدفعة محددة
     */
    public function createLotOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        array $lotData
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $lotData) {
            $quantity = $lotData['quantity'];
            $unitPrice = $lotData['unit_price'];

            // حفظ الرصيد الافتتاحي للدفعة
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => $lotData['lot_number'],
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
            ]);

            // إنشاء دفعة جديدة
            $lot = $product->lots()->create([
                'lot_number' => $lotData['lot_number'],
                'warehouse_id' => $warehouse->id,
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
                'purchase_date' => $fiscalYear->start_date,
                'purchase_price' => $unitPrice,
                'legal_selling_price' => $lotData['selling_price'] ?? 0,
                'original_quantity' => $quantity,
                'remaining_quantity' => $quantity,
                'active' => true,
            ]);

            // إنشاء حركة مخزون افتتاحية للدفعة
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'lot_number' => $lotData['lot_number'],
                'stock_lot_id' => $lot->id,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }
}




// ===== ملف: PartyService.php =====
namespace App\Services;

use App\Models\Party;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Party Service
 *
 * إدارة الأطراف (العملاء والموردين) مع المتطلبات الجزائرية:
 * - RC, NIF, NIS, AI
 * - التحقق من صحة البيانات
 * - إدارة الأرصدة والحدود الائتمانية
 *
 * @package App\Services
 */
class PartyService extends \App\Core\Services\BaseService
{
    protected string $model = Party::class;
    protected string $resourceName = 'party';
    protected array $defaultWith = ['partyType', 'legalForm', 'commune', 'wilaya'];
    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * Before creating - data preparation and validation
     */
    protected function beforeCreate(array $data, $request): array
    {
        // Generate unique code if not provided
        if (empty($data['code'])) {
            $data['code'] = $this->generatePartyCode($data['party_type_id']);
        }

        // Generate slug from name
        if (!isset($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateSlug($data['name']);
        }

        // Algerian-specific validations
        $this->validateAlgerianFields($data);

        return $data;
    }

    /**
     * After create - within transaction
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        // Any post-creation logic within transaction
        // e.g., create opening balance if needed
    }

    /**
     * After database commit - external operations
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send welcome notification if needed
        // Mail::send(new PartyCreatedNotification($item));
    }

    /**
     * Before update - business rules validation
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // Check if party is active before critical changes
        if ($item->active && isset($data['active']) && !$data['active']) {
            // Check if party has active commercial documents
            if ($item->commercialDocuments()->where('status', 'confirmed')->exists()) {
                throw new BusinessRuleException('لا يمكن إلغاء تفعيل متعامل لديه وثائق تجارية نشطة', 409);
            }
        }

        // Validate Algerian fields if changed
        $this->validateAlgerianFields($data, $item);
    }

    /**
     * After update committed
     */
    protected function afterUpdateCommitted(Model $item, array $data, $request): void
    {
        // Clear related caches if critical data changed
        if (isset($data['active']) || isset($data['credit_limit'])) {
            // Additional cache clearing if needed
        }
    }

    /**
     * Before delete - business rules
     */
    protected function beforeDelete(Model $item): void
    {
        // Check if party can be deleted
        if ($item->commercialDocuments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه وثائق تجارية', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه دفعات', 409);
        }
    }

    /**
     * Generate unique party code
     */
    private function generatePartyCode(int $partyTypeId): string
    {
        $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP'; // Assuming 1=customer, 2=supplier

        do {
            $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Party::where('code', $code)->exists());

        return $code;
    }

    /**
     * Generate slug from name
     */
    private function generateSlug(string $name): string
    {
        $slug = strtolower(str_replace([' ', '.', ','], '-', $name));
        $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
        $originalSlug = $slug;
        $counter = 1;

        while (Party::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Validate Algerian-specific fields
     */
    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
    {
        // NIF validation (Algerian tax number - 15-16 digits usually)
        if (isset($data['nif']) && !empty($data['nif'])) {
            if (!preg_match('/^\d{15,16}$/', $data['nif'])) {
                throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-16 رقم', 422);
            }

            // Check uniqueness except for current party
            $query = Party::where('nif', $data['nif']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
            }
        }

        // RC validation (Commercial Register)
        if (isset($data['rc']) && !empty($data['rc'])) {
            if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
                throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
            }
        }

        // NIS validation (Statistical number)
        if (isset($data['nis']) && !empty($data['nis'])) {
            if (!preg_match('/^\d{10,15}$/', $data['nis'])) {
                throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 10-15 رقم', 422);
            }
        }

        // Email uniqueness
        if (isset($data['email']) && !empty($data['email'])) {
            $query = Party::where('email', $data['email']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
            }
        }

        // Credit limit validation
        if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
            throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
        }
    }

    /**
     * Get customers only
     */
    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }

    public function getCustomers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ فلترة بـ party_type_id مباشرة — لا نعتمد على party_types table
            // party_type_id = 1 → زبون (كما يُرسله الـ Frontend)
            ->where('party_type_id', 1)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            // active يمكن أن يكون null أو true — نقبل كليهما
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }

    public function getSuppliers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ party_type_id = 2 → مورد
            ->where('party_type_id', 2)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }
}




// ===== ملف: PartyTypeService.php =====
namespace App\Services;

use App\Models\PartyType;

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = PartyType::class;
    protected string $resourceName = 'party_type';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: PaymentModeService.php =====
namespace App\Services;

use App\Models\PaymentMode;
use Illuminate\Http\Request;

class PaymentModeService extends \App\Core\Services\BaseService
{
    protected string $model = PaymentMode::class;
    protected string $resourceName = 'payment_mode';
    protected array $defaultWith = ['treasuryAccount'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getActive()
    {
        return $this->model::where('active', true)->get();
    }
}




// ===== ملف: PaymentService.php =====
namespace App\Services;

use App\Models\Payment;

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: PermissionService.php =====
namespace App\Services;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PermissionService extends \App\Core\Services\BaseService
{
    protected string $model = Permission::class;
    protected string $resourceName = 'permission';
    protected array $defaultWith = ['roles'];

       protected function getResourceName(): string
    {
        return 'permission';
    }



    public function getByGroup(?string $group = null)
    {
        if ($group) {
            return $this->model::byGroup($group)->get();
        }
        return $this->model::all();
    }
}




// ===== ملف: PriceLevelService.php =====
namespace App\Services;

use App\Models\PriceLevel;

class PriceLevelService extends \App\Core\Services\BaseService
{
    protected string $model = PriceLevel::class;
    protected string $resourceName = 'priceLevel';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: ProductLotService.php =====
namespace App\Services;

use App\Models\ProductLot;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: ProductService.php =====
namespace App\Services;

use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\ProductPrice;
use App\Models\QuantityDiscount;
use App\Core\Exceptions\BusinessRuleException;
use App\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ProductService extends \App\Core\Services\BaseService
{
    protected string $model        = Product::class;
    protected string $resourceName = 'product';
    protected function getResourceName(): string { return $this->resourceName; }

    protected array $defaultWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
    ];

    protected array $showWith = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
        'valuationMethod',
        'packagings',
        'prices.priceLevel',
        'quantityDiscounts.priceLevel',
    ];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, $request): array
    {
        $companyId = app(\App\Services\CompanyContextService::class)->get();
        $company = $companyId ? Company::find($companyId) : null;

        if ($company && $company->products()->count() >= $company->max_products) {
            throw new BusinessRuleException("وصلت الشركة للحد الأقصى من المنتجات ({$company->max_products})", 422);
        }

        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name']);
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['packagings'])) {
            $this->syncPackagings($item, $data['packagings']);
        }
        if (!empty($data['prices'])) {
            $this->syncPrices($item, $data['prices'], (float)($data['purchase_price_ht'] ?? 0));
        }
        if (isset($data['quantity_discounts'])) {
            $this->syncDiscounts($item, $data['quantity_discounts'], (bool)($data['manages_quantity_discounts'] ?? false));
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // التخفيف: لا نمنع تعطيل المنتج، فقط نسجل تحذيراً
        if (isset($data['active']) && !(bool)$data['active']) {
            if ($item->stockMovements()->where('is_validated', true)->exists()) {
                Log::warning('محاولة تعطيل منتج له حركات مخزون مؤكدة', [
                    'product_id' => $item->id,
                    'user_id' => auth()->id(),
                ]);
                // يمكنك اختيارياً إضافة رسالة إعلامية للمستخدم عبر session أو استثناء مخصص
                // throw new BusinessRuleException('لا يمكن تعطيل منتج له حركات مخزون مؤكدة', 409);
                // لكننا سنسمح بذلك مع تسجيل التحذير فقط.
            }
        }

        if (isset($data['name']) && $data['name'] !== $item->name && empty($data['slug'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, $request): array
    {
        unset($data['packagings'], $data['prices'], $data['quantity_discounts']);
        return $data;
    }

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $packagings = $request?->input('packagings');
        $prices     = $request?->input('prices');
        $discounts  = $request?->input('quantity_discounts');

        if (!is_null($packagings)) {
            $this->syncPackagings($item, $packagings);
        }

        if (!is_null($prices)) {
            $purchasePrice = (float)($request->input('purchase_price_ht') ?? $item->fresh()->purchase_price_ht);
            $this->syncPrices($item, $prices, $purchasePrice);
        }

        if (!is_null($discounts)) {
            $managesDiscounts = (bool)($request->input('manages_quantity_discounts') ?? $item->manages_quantity_discounts);
            $this->syncDiscounts($item, $discounts, $managesDiscounts);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // الحذف الفعلي ممنوع إذا كانت هناك سجلات مرتبطة (يبقى كما هو)
        if ($item->stockMovements()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له حركات مخزون', 409);
        }
        if ($item->lots()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له دفعات مخزون', 409);
        }
        if ($item->documentLines()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج مرتبط بمستندات تجارية', 409);
        }
        if ($item->openingBalances()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له أرصدة افتتاحية', 409);
        }
    }

    // =========================================================
    // Packagings Sync
    // =========================================================

    private function syncPackagings(Product $product, array $data): void
    {
        if (empty($data)) return;

        $incomingIds = collect($data)->pluck('id')->filter()->toArray();

        // حذف التعبئات الغائبة (هذا السلوك قد يكون مقصوداً، لكن يمكن تعديله لتعطيلها بدلاً من الحذف)
        $product->packagings()->whereNotIn('id', $incomingIds)->delete();

        $hasDefault = collect($data)->contains(fn($p) => !empty($p['is_default']));

        foreach ($data as $idx => $pData) {
            $attrs = [
                'code'          => strtoupper(trim($pData['code'])),
                'label'         => trim($pData['label']),
                'quantity'      => isset($pData['quantity']) ? max(0.0001, (float)$pData['quantity']) : 1,
                'barcode'       => $pData['barcode'] ?? null,
                'is_default'    => (bool)($pData['is_default'] ?? false),
                'active'        => (bool)($pData['active'] ?? true),
                'display_order' => (int)($pData['display_order'] ?? $idx),
            ];

            if (!empty($pData['id'])) {
                $product->packagings()->where('id', $pData['id'])->update($attrs);
            } else {
                $product->packagings()->create($attrs);
            }
        }

        if (!$hasDefault) {
            $smallest = $product->packagings()->orderBy('quantity')->first();
            $smallest?->update(['is_default' => true]);
        }
    }

    // =========================================================
    // Prices Sync
    // =========================================================

    private function syncPrices(Product $product, array $data, float $purchasePriceHt): void
    {
        if (empty($data)) return;

        foreach ($data as $pData) {
            if (empty($pData['price_level_id'])) continue;

            $method = $pData['pricing_method'] ?? 'fixed';

            $price  = $method === 'fixed'  ? ((float)($pData['price']  ?? 0)) : null;
            $rate   = $method === 'rate'   ? ((float)($pData['rate']   ?? 0)) : null;
            $margin = $method === 'margin' ? ((float)($pData['margin'] ?? 0)) : null;

            $product->prices()->updateOrCreate(
                ['price_level_id' => (int)$pData['price_level_id']],
                [
                    'pricing_method' => $method,
                    'price'          => $price,
                    'rate'           => $rate,
                    'margin'         => $margin,
                    'active'         => (bool)($pData['active'] ?? true),
                ]
            );
        }
    }

    // =========================================================
    // Discounts Sync — تعديل: لا نحذف، نعطل فقط
    // =========================================================

    private function syncDiscounts(Product $product, array $data, bool $managesDiscounts): void
    {
        if (!$managesDiscounts) {
            // بدلاً من delete()، نعطل الخصومات الحالية
            $product->quantityDiscounts()->update(['active' => false]);
            return;
        }

        // إذا كانت الخصومات مفعلة، نقوم بمزامنتها (ما زلنا نستخدم حذف وإعادة إنشاء للتبسيط)
        // لكن يمكن تحسينها لاحقاً.
        $product->quantityDiscounts()->delete();

        foreach ($data as $idx => $dData) {
            if (empty($dData['price_level_id'])) continue;
            if (!isset($dData['min_qty']) || $dData['min_qty'] === '') continue;
            if (empty($dData['discount_amount']) && empty($dData['discount_percentage'])) continue;

            $product->quantityDiscounts()->create([
                'price_level_id'      => (int)$dData['price_level_id'],
                'min_qty'             => (float)$dData['min_qty'],
                'max_qty'             => isset($dData['max_qty']) && $dData['max_qty'] !== '' ? (float)$dData['max_qty'] : null,
                'discount_amount'     => isset($dData['discount_amount']) && $dData['discount_amount'] !== '' ? (float)$dData['discount_amount'] : null,
                'discount_percentage' => isset($dData['discount_percentage']) && $dData['discount_percentage'] !== '' ? (float)$dData['discount_percentage'] : null,
                'tier_order'          => (int)($dData['tier_order'] ?? $idx + 1),
                'is_blocked'          => (bool)($dData['is_blocked'] ?? false),
                'active'              => (bool)($dData['active'] ?? true),
            ]);
        }
    }

    // =========================================================
    // Public Helpers
    // =========================================================

    public function findById($id, array $with = null): Model
    {
        return $this->model::with($with ?? $this->showWith)->findOrFail($id);
    }

    public function getActiveProducts()
    {
        return $this->model::where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByFamily(int $familyId)
    {
        return $this->model::where('family_id', $familyId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByBrand(int $brandId)
    {
        return $this->model::where('brand_id', $brandId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    // =========================================================
    // Slug Helper
    // =========================================================

    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug     = Str::slug($name);
        $query    = Product::where('slug', 'like', $slug . '%');
        if ($excludeId) $query->where('id', '!=', $excludeId);
        $existing = $query->pluck('slug');

        if (!$existing->contains($slug)) return $slug;

        $i = 1;
        while ($existing->contains("{$slug}-{$i}")) $i++;
        return "{$slug}-{$i}";
    }
}




// ===== ملف: ProductTypeService.php =====
namespace App\Services;

use App\Models\ProductType;

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = ProductType::class;
    protected string $resourceName = 'product_type';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: ProductVariantService.php =====
namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Barcode;
use App\Core\Services\BaseService;
use App\Services\CompanyContextService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductVariantService extends BaseService
{
    protected string $model = ProductVariant::class;

    protected function getResourceName(): string
    {
        return 'product_variant';
    }

    /**
     * تنفيذ منطق قبل الإنشاء
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        // استخدام parent إذا كنت تريد تنفيذ أي منطق عام مضاف في BaseService مستقبلاً
        $data = parent::beforeCreate($data, $request);

        if (!isset($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }

        if (!isset($data['created_by']) && auth()->check()) {
            $data['created_by'] = auth()->id();
        }

        return $data;
    }

    /**
     * تنفيذ منطق بعد الإنشاء (داخل الترانزاكشن)
     */
    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // إضافة الباركود إذا وجد
        if (!empty($data['barcode'])) {
            Barcode::create([
                'company_id' => $item->company_id,
                'product_id' => $item->product_id,
                'variant_id' => $item->id,
                'barcode'    => $data['barcode'],
                'is_primary' => true,
                'type'       => 'variant',
                'created_by' => auth()->id(),
            ]);
        }
    }

    /**
     * تصحيح توقيع الدالة لتتطابق مع BaseService
     */
    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // استدعاء الأب مهم جداً لأنه يحتوي على فحص عدم تغيير الـ company_id
        parent::beforeUpdate($item, $data, $request);

        // أي منطق إضافي قبل التحديث يوضع هنا
        // ملاحظة: لا حاجة لعمل unset لـ product_id هنا لأن دالة prepareDataForUpdate
        // في الكلاس الأب تقوم بتنظيف البيانات تلقائياً بناءً على الأعمدة.
    }
}




// ===== ملف: QRCodeService.php =====
namespace App\Services;

use App\Models\CommercialDocument;

class QRCodeService
{
    public function generateForDocument(CommercialDocument $document): string
    {
        $data = $this->buildQRData($document);
        
        $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(200)
            ->errorCorrection('M')
            ->generate($data);

        return base64_encode($qrCode);
    }

    public function getQRDataString(CommercialDocument $document): string
    {
        return $this->buildQRData($document);
    }

    private function buildQRData(CommercialDocument $document): string
    {
        $supplier = $document->party;
        
        $qrData = [
            'supplier' => [
                'name' => config('app.company_name', 'Company Name'),
                'address' => config('app.company_address', ''),
                'nif' => config('app.company_nif', ''),
                'nis' => config('app.company_nis', ''),
                'ai' => config('app.company_ai', ''),
            ],
            'invoice' => [
                'number' => $document->document_number,
                'date' => $document->document_date?->format('Y-m-d'),
                'type' => $document->documentType?->code,
            ],
            'customer' => [
                'name' => $supplier?->name ?? '',
                'nif' => $supplier?->nif ?? '',
            ],
            'amounts' => [
                'ht' => round($document->total_ht ?? 0, 2),
                'tva' => round($document->total_tva ?? 0, 2),
                'ttc' => round($document->total_ttc ?? 0, 2),
                'stamp' => round($document->total_stamp ?? 0, 2),
            ],
            'hash' => $this->generateHash($document),
        ];

        return json_encode($qrData, JSON_UNESCAPED_UNICODE);
    }

    private function generateHash(CommercialDocument $document): string
    {
        $data = 
            ($document->document_number ?? '') .
            ($document->document_date?->format('Ymd') ?? '') .
            round($document->total_ttc ?? 0, 2) .
            round($document->total_tva ?? 0, 2);

        return hash('sha256', $data);
    }

    public static function validateQRData(array $qrData): bool
    {
        return isset($qrData['invoice']['number'], $qrData['invoice']['date']);
    }
}



// ===== ملف: QuantityDiscountService.php =====
namespace App\Services;

use App\Models\QuantityDiscount;
use Illuminate\Http\Request;

class QuantityDiscountService extends \App\Core\Services\BaseService
{
    protected string $model = QuantityDiscount::class;
    protected string $resourceName = 'quantity_discount';
    protected array $defaultWith = ['product', 'priceLevel'];
    protected function getResourceName(): string { return $this->resourceName; }

}




// ===== ملف: ReportService.php =====
namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function salesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'paid_amount' => round($doc->paid_amount, 2),
                'remaining_amount' => round($doc->remaining_amount, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'total_paid' => round($documents->sum('paid_amount'), 2),
                'total_remaining' => round($documents->sum('remaining_amount'), 2),
                'count' => $documents->count(),
            ],
        ];
    }

    public function purchasesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'count' => $documents->count(),
            ],
        ];
    }

    public function customersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 1)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        return [
            'customers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'created_at' => $party->created_at?->format('Y-m-d'),
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_customers' => $parties->count(),
            ],
        ];
    }

    public function suppliersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 2)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        return [
            'suppliers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'nif' => $party->nif,
                'nis' => $party->nis,
                'ai' => $party->ai,
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_suppliers' => $parties->count(),
            ],
        ];
    }

    public function productsReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand', 'unit', 'tva']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        $products = $query->orderBy('name')->get();

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'unit' => $product->unit?->name,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'current_cost_price' => round($product->current_cost_price, 2),
                'tva_rate' => $product->tva?->rate,
                'stock_quantity' => $product->current_stock, // ✅ استخدام attribute المحسوب
                'min_stock_alert' => $product->min_stock_alert,
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_stock_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
            ],
        ];
    }

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand']);

        $products = $query->get();

        $lowStock = $products->filter(fn($p) => $p->current_stock <= $p->min_stock_alert);
        $outOfStock = $products->filter(fn($p) => $p->current_stock == 0);

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'stock_quantity' => $product->current_stock,
                'min_stock_alert' => $product->min_stock_alert,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'stock_value' => round($product->current_stock * $product->current_cost_price, 2),
                'status' => $product->current_stock == 0 ? 'out_of_stock' : ($product->current_stock <= $product->min_stock_alert ? 'low_stock' : 'in_stock'),
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_quantity' => $products->sum('current_stock'),
                'total_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
                'low_stock_count' => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
            ],
        ];
    }

    public function paymentsReport(array $filters = []): array
    {
        $query = Payment::with(['commercialDocument', 'paymentMode', 'treasuryAccount']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('payment_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('payment_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['payment_mode_id'])) {
            $query->where('payment_mode_id', $filters['payment_mode_id']);
        }

        $payments = $query->orderBy('payment_date', 'desc')->get();

        return [
            'payments' => $payments->map(fn($payment) => [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'amount' => round($payment->amount, 2),
                'document_number' => $payment->commercialDocument?->document_number,
                'payment_mode' => $payment->paymentMode?->name,
                'treasury_account' => $payment->treasuryAccount?->name,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
            ])->toArray(),
            'summary' => [
                'total_amount' => round($payments->sum('amount'), 2),
                'count' => $payments->count(),
            ],
        ];
    }

    public function taxesReport(array $filters = []): array
    {
        $query = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', ['invoice', 'purchase_invoice']));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $documents = $query->get();

        $salesInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'invoice');
        $purchaseInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'purchase_invoice');

        return [
            'sales' => [
                'total_ht' => round($salesInvoices->sum('total_ht'), 2),
                'total_tva' => round($salesInvoices->sum('total_tva'), 2),
                'total_stamp' => round($salesInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($salesInvoices->sum('total_ttc'), 2),
                'count' => $salesInvoices->count(),
            ],
            'purchases' => [
                'total_ht' => round($purchaseInvoices->sum('total_ht'), 2),
                'total_tva' => round($purchaseInvoices->sum('total_tva'), 2),
                'total_stamp' => round($purchaseInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($purchaseInvoices->sum('total_ttc'), 2),
                'count' => $purchaseInvoices->count(),
            ],
            'summary' => [
                'tva_collected' => round($salesInvoices->sum('total_tva'), 2),
                'tva_deductible' => round($purchaseInvoices->sum('total_tva'), 2),
                'tva_balance' => round($salesInvoices->sum('total_tva') - $purchaseInvoices->sum('total_tva'), 2),
            ],
        ];
    }
}




// ===== ملف: RoleService.php =====
namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RoleService extends \App\Core\Services\BaseService
{
    protected string $model        = Role::class;
    protected string $resourceName = 'role';
    protected array  $defaultWith  = ['permissions'];

    protected function getResourceName(): string
    {
        return 'role';
    }

    // ═══════════════════════════════════════════
    // تجاوز update() لحل مشكلة permission_ids
    // ═══════════════════════════════════════════
    // BaseService::update() يحذف permission_ids في prepareDataForUpdate
    // ثم يمرر $data بدونها لـ afterUpdate.
    // الحل: نستخرج permission_ids قبل parent::update() ونطبقها بعده.

    public function update(Model $item, array $data, Request $request = null): Model
    {
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null;

        $item = parent::update($item, $data, $request);

        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
        }

        return $item->fresh($this->defaultWith);
    }

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data['guard_name'] ??= 'web';
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['permission_ids']); // تُعالج في update() المُتجاوَز
        return parent::prepareDataForUpdate($item, $data, $request);
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // permission_ids تُعالج في update() المُتجاوَز — لا شيء هنا
        $item->load('permissions');
    }
}




// ===== ملف: SettingService.php =====
namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingService extends \App\Core\Services\BaseService
{
    protected string $model = Setting::class;
    protected string $resourceName = 'setting';
    protected function getResourceName(): string { return $this->resourceName; }

    public function getByGroup(string $group)
    {
        return $this->model::byGroup($group)->get();
    }

    public function getValue(string $key, $default = null)
    {
        return $this->model::get($key, $default);
    }
}




// ===== ملف: StockMovementService.php =====
namespace App\Services;

use App\Models\StockMovement;

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: StockMovementTypeService.php =====
namespace App\Services;

use App\Models\StockMovementType;

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: TreasuryAccountService.php =====
namespace App\Services;

use App\Models\TreasuryAccount;
use Illuminate\Http\Request;

class TreasuryAccountService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccount::class;
    protected string $resourceName = 'treasury_account';
    protected array $defaultWith = ['treasuryAccountType'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getBankAccounts() { return $this->model::bankAccounts()->get(); }
    public function getCashAccounts() { return $this->model::cashAccounts()->get(); }
    public function getDefault() { return $this->model::default()->first(); }
}




// ===== ملف: TreasuryAccountTypeService.php =====
namespace App\Services;

use App\Models\TreasuryAccountType;

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: TvaService.php =====
namespace App\Services;

use App\Models\Tva;

class TvaService extends \App\Core\Services\BaseService
{
    protected string $model = Tva::class;
    protected string $resourceName = 'tva';
    protected function getResourceName(): string { return $this->resourceName; }
}




// ===== ملف: UnitService.php =====
namespace App\Services;

use App\Models\Unit;

class UnitService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string { return $this->resourceName; }
    protected string $model = Unit::class;
    protected string $resourceName = 'unit';
}




// ===== ملف: UserService.php =====
namespace App\Services;

use App\Models\User;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UserService extends \App\Core\Services\BaseService
{
    protected string $model        = User::class;
    protected string $resourceName = 'user';
    protected array  $defaultWith  = ['roles', 'gender', 'commune', 'wilaya'];

    protected function getResourceName(): string
    {
        return 'user';
    }

    // ═══════════════════════════════════════════
    // تجاوز update() لحل مشكلة permission_ids
    // ═══════════════════════════════════════════
    // المشكلة: BaseService::update() يحذف permission_ids في prepareDataForUpdate
    // ثم يمرر $data بدونها لـ afterUpdate — فلا تُحفظ الصلاحيات أبداً.
    // الحل: نتجاوز update() ونعالج permission_ids قبل استدعاء الـ parent.

    public function update(Model $item, array $data, Request $request = null): Model
    {
        // نستخرج permission_ids قبل أن يأخذها BaseService ويفقدها
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null; // null = لم تُرسل (لا تغيير)

        // نستدعي الـ parent الذي يعالج باقي الحقول
        $item = parent::update($item, $data, $request);

        // نطبق الصلاحيات بعد الحفظ مباشرة
        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
        }

        return $item->fresh($this->defaultWith);
    }

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $companyId          = $this->getCurrentCompanyId();
        $data['company_id'] = $companyId;
        $data['created_by'] = auth()->id();
        $data['active']     ??= true;

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $this->validateUniqueEmail($data['email'], $companyId);

        if (!empty($data['username'])) {
            $this->validateUniqueUsername($data['username']);
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        $companyId = $this->getCurrentCompanyId();

        // 1. ربط المستخدم بالشركة الحالية عبر company_user
        $item->companies()->attach($companyId, [
            'role'       => $data['role'] ?? 'member',
            'is_default' => false,
            'joined_at'  => now(),
            'active'     => true,
        ]);

        // 2. تعيين الدور المحاسبي (Spatie) باستخدام CompanyRoleService
        if (!empty($data['role'])) {
            app(\App\Services\CompanyRoleService::class)
                ->assignRole($item, $data['role'], $companyId);
        }

        // 3. الصلاحيات المباشرة (إن وجدت)
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }

        // 4. رفع الصورة (إن وجدت)
        if (!empty($data['avatar_file'])) {
            $this->handleAvatarUpload($item, $data['avatar_file']);
        }

        Log::info('User created and attached to company', [
            'user_id'    => $item->id,
            'company_id' => $companyId,
        ]);
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['company_id']) && (int)$data['company_id'] !== (int)$item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالمستخدم.', 422);
        }

        if ($request && auth()->id() === $item->id && isset($data['role'])) {
            throw new BusinessRuleException('لا يمكنك تغيير دورك الخاص.', 422);
        }

        if (isset($data['email']) && $data['email'] !== $item->email) {
            $this->validateUniqueEmail($data['email'], $item->company_id, $item->id);
        }

        if (isset($data['username']) && $data['username'] !== $item->username) {
            $this->validateUniqueUsername($data['username'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['company_id']);
        unset($data['permission_ids']); // تُعالج في update() المُتجاوَز

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        unset($data['avatar_file']);

        $data['updated_by'] = auth()->id();

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // الدور
        if (isset($data['role']) && $data['role']) {
            $item->syncRoles([$data['role']]);
        }

        // permission_ids تُعالج في update() المُتجاوَز — لا شيء هنا

        if ($request && $request->hasFile('avatar_file')) {
            $this->handleAvatarUpload($item, $request->file('avatar_file'));
        }

        Log::info('User updated', ['user_id' => $item->id]);
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك حذف حسابك الخاص.', 422);
        }
    }

    protected function afterDelete(Model $item): void
    {
        $item->update(['deleted_by' => auth()->id()]);
        Log::info('User soft deleted', ['user_id' => $item->id]);
    }

    // ═══════════════════════════════════════════
    // العمليات المتقدمة
    // ═══════════════════════════════════════════

    public function changePassword(User $user, string $newPassword): void
    {
        $user->update([
            'password'   => Hash::make($newPassword),
            'updated_by' => auth()->id(),
        ]);
    }

    public function toggleActive(User $user): User
    {
        if ($user->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك تعطيل حسابك الخاص.', 422);
        }

        $user->active     = !$user->active;
        $user->updated_by = auth()->id();
        $user->save();

        return $user->fresh($this->defaultWith);
    }

    public function updateProfile(User $user, array $data): User
    {
        $allowed  = [
            'name',
            'username',
            'phone',
            'bio',
            'avatar',
            'birth_date',
            'gender_id',
            'address',
            'commune_id',
            'wilaya_id'
        ];
        $filtered = array_intersect_key($data, array_flip($allowed));

        if (isset($filtered['username']) && $filtered['username'] !== $user->username) {
            $this->validateUniqueUsername($filtered['username'], $user->id);
        }

        $user->update($filtered);

        return $user->fresh($this->defaultWith);
    }

    public function updateAvatar(User $user, $file): string
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
        return Storage::disk('public')->url($path);
    }

    public function updateLastLogin(User $user): void
    {
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function restoreUser(int $id): User
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->trashed()) {
            $user->restore();
            $user->update(['deleted_by' => null]);
            Log::info('User restored', ['user_id' => $id]);
        }
        return $user->fresh($this->defaultWith);
    }

    public function forceDeleteUser(int $id): void
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $user->forceDelete();
        Log::info('User permanently deleted', ['user_id' => $id]);
    }

    // ═══════════════════════════════════════════
    // دوال الاستعلام
    // ═══════════════════════════════════════════
    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));
        $companyId = $this->getCurrentCompanyId();

        return User::whereHas('companies', function ($q) use ($companyId) {
            $q->where('companies.id', $companyId);
        })
            ->with($relations)
            ->findOrFail($id);
    }
    public function getByRole(string $roleName)
    {
        return User::role($roleName)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getActive()
    {
        return User::where('active', true)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getInactive()
    {
        return User::where('active', false)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    // ═══════════════════════════════════════════
    // مساعدات
    // ═══════════════════════════════════════════

    private function validateUniqueEmail(string $email, int $companyId, ?int $excludeId = null): void
    {
        $query = User::where('company_id', $companyId)->where('email', $email);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('البريد الإلكتروني مستخدم بالفعل داخل هذه الشركة.', 422);
        }
    }

    private function validateUniqueUsername(string $username, ?int $excludeId = null): void
    {
        $query = User::where('username', $username);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('اسم المستخدم موجود مسبقاً.', 422);
        }
    }

    private function handleAvatarUpload(User $user, $file): void
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }
}




// ===== ملف: WarehouseService.php =====
namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;

/**
 * Warehouse Service
 *
 * @package App\Services
 */
class WarehouseService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string { return $this->resourceName; }
    protected string $model = Warehouse::class;
    protected string $resourceName = 'warehouse';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['code'])) {
            $data['code'] = $this->generateWarehouseCode();
        }
        return $data;
    }

    private function generateWarehouseCode(): string
    {
        $prefix = 'WH';
        $last = $this->model::orderByDesc('code')->first();

        if (!$last) {
            return $prefix . '001';
        }

        $num = (int) substr($last->code, 2) + 1;
        return $prefix . str_pad($num, 3, '0', STR_PAD_LEFT);
    }
}




// ===== ملف: WilayaService.php =====
namespace App\Services;

use App\Models\Wilaya;

class WilayaService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string { return $this->resourceName; }
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
}


