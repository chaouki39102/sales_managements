<?php

namespace App\Core\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

// Traits
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Core\Http\Controllers\Traits\HasApiList;

use App\Http\Controllers\Controller;
use App\Core\Exceptions\BusinessRuleException;

/**
 * Base API Controller - Thin Version (The Gatekeeper)
 *
 * 🚪 المتحكم الأساسي النحيف - البوّاب (النسخة النهائية المحسّنة)
 *
 * ** الفلسفة المطبقة في الكونترولر:**
 * المتحكم هو "بوّاب" فقط. مسؤوليته الوحيدة:
 * 1. استقبال الطلب (Request)
 * 2. التحقق من الصلاحيات (Authorization)
 * 3. تفويض المنطق إلى الـ Service
 * 4. إرجاع الرد المُنسق (Response)
 *
 * ✅ التحسين الرئيسي:
 * - الاعتماد الكلي على دالة `handleError` الذكية.
 * - إزالة كتل `catch` المكررة من دوال CRUD.
 *
 * @package App\Core\Http\Controllers
 */
abstract class BaseApiController extends Controller
{
    use ApiResponders, HasApiList;
    // === الخصائص الأساسية ===

    /** @var string اسم المورد (للرسائل) */
    protected string $resourceName = 'item';

    /** @var string|null API Resource Class للتحويل */
    protected ?string $resourceClass = null;

    /** @var bool تمكين التحويل التلقائي */
    protected bool $autoTransform = true;

    // === Constructor ===

    public function __construct()
    {
        $rateLimit = config('api.rate_limit.requests', 60);
        $this->middleware("throttle:{$rateLimit},1")->except(['index', 'show']);
    }

    // === Authorization (المسؤولية الوحيدة للكنترولر) ===

    /**
     * التحقق من الصلاحيات
     * @throws AuthorizationException
     */
    protected function authorizeAction(string $ability, $modelOrClass = null): void
    {
        $this->authorize($ability, $modelOrClass);
    }

    // === CRUD Operations (البوّاب فقط) ===

    /**
     * عرض قائمة الموارد
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحيات
          //  $this->authorizeAction('viewAny', $this->getModelClass());

            // 2. تفويض جلب البيانات إلى Trait
            $data = $this->getListData($request);

            // 3. إرجاع الرد المُنسق
            return $this->successResponse(
                $data,
                "تم جلب قائمة {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // handleError سيعالج أي خطأ
            return $this->handleError($e, 'index');
        }
    }

    /**
     * عرض مورد واحد
     */
    public function show($id): JsonResponse
    {
        try {
            // 1. جلب العنصر (عبر Service)
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('view', $item);

            // 3. تحويل ورد
            return $this->successResponse(
                $this->transformItem($item)
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيتعرف على ModelNotFoundException ويعيد 404
            return $this->handleError($e, 'show');
        }
    }

    /**
     * تخزين مورد جديد
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // 1. التحقق من الصلاحيات
            $this->authorizeAction('create', $this->getModelClass());

            // 2. استخراج البيانات المُتحقق منها (من Form Request)
            $data = $this->getValidatedData($request);

            // 3. تفويض إنشاء العنصر إلى Service
            $item = $this->getService()->create($data, $request);

            // 4. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم إنشاء {$this->resourceName} بنجاح",
                201
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيتعرف على ValidationException ويعيد 422
            return $this->handleError($e, 'store');
        }
    }

    /**
     * تحديث مورد موجود
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            // 1. جلب العنصر (عبر Service)
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('update', $item);

            // 3. استخراج البيانات المُتحقق منها
            $data = $this->getValidatedData($request, $id);

            // 4. تفويض التحديث إلى Service
            $item = $this->getService()->update($item, $data, $request);

            // 5. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 422, 403, 500)
            return $this->handleError($e, 'update');
        }
    }

    /**
     * حذف مورد
     */
    public function destroy($id): JsonResponse
    {
        try {
            // 1. جلب العنصر
            $item = $this->getService()->findById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('delete', $item);

            // 3. تفويض الحذف إلى Service
            $this->getService()->delete($item);

            // 4. إرجاع الرد
            return $this->successResponse(
                null,
                "تم حذف {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 403, 500)
            return $this->handleError($e, 'destroy');
        }
    }

    /**
     * استعادة عنصر محذوف
     */
    public function restore($id): JsonResponse
    {
        try {
            // 1. جلب العنصر المحذوف
            $item = $this->getService()->findTrashedById($id);

            // 2. التحقق من الصلاحيات
            $this->authorizeAction('restore', $item);

            // 3. تفويض الاستعادة
            $item = $this->getService()->restore($item);

            // 4. إرجاع الرد
            return $this->successResponse(
                $this->transformItem($item),
                "تم استعادة {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            // ✅ handleError سيعالج (404, 403, 500)
            return $this->handleError($e, 'restore');
        }
    }

    // === Helper Methods (مساعدات بسيطة فقط) ===

    /**
     * الحصول على Service Class
     * يجب على الكنترولر الفرعي تعريفه
     * @return mixed
     */
    abstract protected function getService();

    /**
     * الحصول على Model Class
     * @return string
     */
    abstract protected function getModelClass(): string;

    /**
     * استخراج البيانات المُتحقق منها
     */
    protected function getValidatedData(Request $request, $id = null): array
    {
        if ($request instanceof FormRequest) {
            return $request->validated();
        }
        return $request->all();
    }

    /**
     * الحصول على بيانات القائمة (تفويض لـ Trait)
     */
    protected function getListData(Request $request)
    {
        return $this->apiListWithConfig(
            $this->getModelClass(),
            $this->getListConfig(),
            $request
        );
    }

    /**
     * إعدادات القائمة (يمكن تجاوزها)
     */
    protected function getListConfig(): array
    {
        return [
            'cache_tags' => ['api', $this->resourceName],
        ];
    }

    /**
     * تحويل العنصر باستخدام Resource
     */
    protected function transformItem($item)
    {
        if (!$this->autoTransform || !$this->resourceClass) {
            return $item;
        }

        if (!class_exists($this->resourceClass)) {
            Log::warning("Resource class not found: {$this->resourceClass}");
            return $item;
        }

        return new $this->resourceClass($item);
    }

    /**
     * مسح كاش الموديل
     * تُستخدم من HandlesBulkOperations — يمكن تجاوزها في الكنترولر الفرعي
     */
    protected function clearModelCache(): void
    {
        try {
            \Illuminate\Support\Facades\Cache::tags(['api', $this->resourceName])->flush();
        } catch (\Throwable $e) {
            Log::warning("clearModelCache failed for {$this->resourceName}", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * تسجيل عملية للـ Audit
     * تُستخدم من HandlesBulkOperations — يمكن تجاوزها في الكنترولر الفرعي
     */
    protected function logOperation(string $operation, $item, array $context = []): void
    {
        Log::info("Controller bulk operation: {$operation}", array_merge([
            'resource'  => $this->resourceName,
            'model'     => is_object($item) ? get_class($item) : $item,
            'id'        => is_object($item) ? ($item->id ?? null) : null,
            'user_id'   => auth()->id() ?? null,
        ], $context));
    }

    // =======================================================
    // ⭐ معالجة الأخطاء الموحدة (النسخة الذكية)
    // =======================================================

    /**
     * معالجة الأخطاء الموحدة
     */
    protected function handleError(\Throwable $e, string $operation): JsonResponse
    {
        $errorType = $this->determineErrorType($e);
        $logLevel = $this->getLogLevel($errorType);

        $context = [
            'operation' => $operation,
            'resource' => $this->resourceName,
            'error_message' => $e->getMessage(),
            'user_id' => auth()->id() ?? null,
            'url' => request()->fullUrl(),
            'method' => request()->method(),
            'ip' => request()->ip(),
        ];

        // ⚠️ Stack Trace فقط للأخطاء الحقيقية (5xx)
        if ($errorType === 'server_error') {
            // نجعل الـ trace أقصر وأوضح
            $context['trace'] = array_slice($e->getTrace(), 0, 5);
        }

        // تسجيل حسب المستوى
        match ($logLevel) {
            'info' => Log::info("API {$operation}: {$errorType}", $context),
            'warning' => Log::warning("API {$operation}: {$errorType}", $context),
            'error' => Log::error("API {$operation}: {$errorType}", $context),
        };

        return $this->buildErrorResponse($e, $errorType);
    }

    /**
     * تحديد مستوى التسجيل بناءً على نوع الخطأ
     */
    protected function getLogLevel(string $errorType): string
    {
        return match ($errorType) {
            'business_rule' => 'info',     // ✅ سلوك طبيعي
            'validation' => 'info',        // ✅ بيانات خاطئة
            'not_found' => 'info',         // ✅ عنصر غير موجود
            'authorization' => 'warning',  // ⚠️ محاولة غير مصرح بها
            'server_error' => 'error',     // 🔴 خطأ حقيقي (يحتاج تحقيق)
        };
    }

    /**
     * تحديد نوع الخطأ بناءً على Exception
     */
    protected function determineErrorType(\Throwable $e): string
    {
        if ($e instanceof ModelNotFoundException) {
            return 'not_found';
        }
        if ($e instanceof BusinessRuleException) {
            return 'business_rule';
        }
        if ($e instanceof AuthorizationException) {
            return 'authorization';
        }
        if ($e instanceof \App\Core\Exceptions\UnauthorizedException) {
            return 'authorization';
        }
        if ($e instanceof ValidationException) {
            return 'validation';
        }

        // إذا كان خطأ 4xx آخر (مثل 405 Method Not Allowed)
        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException && $e->getStatusCode() < 500) {
             return 'authorization'; // أو 'client_error'
        }

        return 'server_error';
    }

    /**
     * بناء الرد المناسب لنوع الخطأ
     */
    protected function buildErrorResponse(\Throwable $e, string $errorType): JsonResponse
    {
        switch ($errorType) {
            case 'not_found':
                return $this->errorResponse(
                    "{$this->resourceName} غير موجود", 404, 'NOT_FOUND'
                );

            case 'business_rule':
                return $this->errorResponse(
                    $e->getMessage(), $e->getCode() ?: 409, 'BUSINESS_RULE_VIOLATION'
                );

            case 'authorization':
                // للـ UnauthorizedException استخدم 401، للـ AuthorizationException استخدم 403
                $statusCode = $e instanceof \App\Core\Exceptions\UnauthorizedException ? 401 : 403;
                return $this->errorResponse(
                    $e->getMessage() ?: 'ليس لديك الصلاحية', $statusCode, 'AUTHORIZATION_ERROR'
                );
            case 'validation':
                return $this->errorResponse(
                    'خطأ في البيانات المدخلة', 422, 'VALIDATION_ERROR',
                    $e instanceof ValidationException ? $e->errors() : []
                );

            case 'server_error':
            default:
                return $this->errorResponse(
                    config('app.debug') ? $e->getMessage() : 'حدث خطأ غير متوقع في الخادم',
                    500,
                    'SERVER_ERROR'
                );
        }
    }
}
