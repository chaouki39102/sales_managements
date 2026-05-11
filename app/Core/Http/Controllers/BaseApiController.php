<?php

namespace App\Core\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\Model;

use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Core\Http\Controllers\Traits\HasApiList;
use App\Http\Controllers\Controller;
use App\Core\Exceptions\BusinessRuleException;

/**
 * BaseApiController — Multi-Tenancy Safe Version
 *
 * ══════════════════════════════════════════════════════════════════
 * المشكلة التي كانت موجودة في النسخة السابقة:
 * ══════════════════════════════════════════════════════════════════
 *
 * النسخة السابقة غيّرت signature الدوال إلى:
 *   show(Request $request, $companyOrId = null, $id = null)
 *
 * هذا النهج خاطئ لأسباب:
 *
 * 1. يكسر Route Model Binding:
 *    Laravel يعتمد على TYPE HINT لمعرفة أي معامل يجب resolve كـ Model.
 *    عندما تكتب show($companyOrId, $id) بدون type hint، Laravel يُمرر
 *    قيمة raw string/int للـ company بدلاً من Company model — وبالتالي
 *    SubstituteBindings لا يعمل وستحصل على string بدل Model.
 *
 * 2. يكسر AuthController وكل Controller يرث BaseApiController:
 *    AuthController::login() لا يعرف getService() ولا getModelClass()
 *    → PHP Fatal Error إذا استُدعي index() من BaseApiController.
 *
 * 3. غير ضروري تماماً:
 *    SetCompanyContext Middleware يضع الشركة في $request->_company
 *    والـ ID يصل عبر request()->route('id') أو route model binding.
 *    BaseApiController لا يحتاج أن يعرف بوجود {company} في الـ route.
 *
 * ══════════════════════════════════════════════════════════════════
 * الحل الصحيح:
 * ══════════════════════════════════════════════════════════════════
 *
 * 1. نُبقي signatures الأصلية كما هي ($id فقط).
 * 2. الـ ID يُستخرج بذكاء من الـ route بأي اسم كان.
 * 3. نضيف resolveRouteId() للكنترولرات الفرعية إذا احتاجت ID مرنة.
 * 4. نجعل getService() و getModelClass() nullable — للكنترولرات
 *    التي لا تحتاجهما (AuthController مثلاً).
 */
abstract class BaseApiController extends Controller
{
    use ApiResponders, HasApiList;

    protected string  $resourceName  = 'item';
    protected ?string $resourceClass = null;
    protected bool    $autoTransform = true;
    
    public function __construct()
    {
        // يمكن أن يظل فارغًا أو تضع فيه الإعدادات التي تحتاجها
    }
    // ══════════════════════════════════════════════════════════════
    // Authorization
    // ══════════════════════════════════════════════════════════════

    protected function authorizeAction(string $ability, $modelOrClass = null): void
    {
        $this->authorize($ability, $modelOrClass);
    }

    // ══════════════════════════════════════════════════════════════
    // CRUD — Signatures أصلية (لا تغيير)
    //
    // Multi-tenancy يعمل لأن:
    // - SetCompanyContext يضع الشركة في Context قبل وصول الطلب هنا
    // - الـ ID يُستخرج من route params بأي اسم عبر resolveRouteId()
    // - BaseService يعمل scoped تلقائياً عبر CompanyContextService
    // ══════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $data = $this->getListData($request);
            return $this->successResponse($data, "تم جلب قائمة {$this->resourceName} بنجاح");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    /**
     * show($id) — الـ $id يأتي من Route Model Binding أو raw value.
     *
     * مثال tenant route: /{company}/units/{unit}
     * Laravel يُمرر: show(Company $company, Unit $unit) للكنترولر الفرعي.
     * لكن BaseApiController::show يستقبل $id فقط، وهذا يعمل لأن:
     * - الكنترولر الفرعي يمكنه override show() إذا احتاج Company
     * - أو يستخدم resolveRouteId() لجلب الـ ID من route params
     */
    public function show($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item = $this->getService()->findById($resolvedId);
            $this->authorizeAction('view', $item);
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
            $item = $this->getService()->findById($resolvedId);
            $this->authorizeAction('update', $item);
            $data = $this->getValidatedData($request, $resolvedId);
            $item = $this->getService()->update($item, $data, $request);
            return $this->successResponse(
                $this->transformItem($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item = $this->getService()->findById($resolvedId);
            $this->authorizeAction('delete', $item);
            $this->getService()->delete($item);
            return $this->successResponse(null, "تم حذف {$this->resourceName} بنجاح");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function restore($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $item = $this->getService()->findTrashedById($resolvedId);
            $this->authorizeAction('restore', $item);
            $item = $this->getService()->restore($item);
            return $this->successResponse(
                $this->transformItem($item),
                "تم استعادة {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'restore');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // ID Resolution
    //
    // extractId() يتعامل مع كل الحالات:
    // 1. $id هو Model مباشرة (Route Model Binding) → يُعيد $id->getKey()
    // 2. $id هو int/string عادي → يُعيده مباشرة
    // 3. $id هو null → يبحث في route params
    // ══════════════════════════════════════════════════════════════

    /**
     * استخراج الـ ID من أي مصدر بأمان.
     */
    protected function extractId(mixed $id): int|string
    {
        // حالة Route Model Binding: وصل Model كامل
        if ($id instanceof Model) {
            return $id->getKey();
        }

        // حالة عادية: int أو string
        if ($id !== null) {
            return $id;
        }

        // حالة fallback: ابحث في route params
        return $this->resolveRouteId();
    }

    /**
     * يبحث عن ID في route params بأسماء شائعة.
     * يمكن للكنترولر الفرعي تجاوزها لتحديد اسم المعامل.
     *
     * مثال:
     *   Route: /{company}/invoices/{invoice}
     *   → يبحث عن 'invoice' أو 'id'
     */
    protected function resolveRouteId(string ...$paramNames): int|string
    {
        // إذا لم تُحدد أسماء، استخدم الاسم المشتق من اسم المورد + 'id'
        if (empty($paramNames)) {
            $paramNames = [
                $this->resourceName,          // 'invoice'
                str_singular($this->resourceName), // 'invoice' من 'invoices'
                'id',                          // fallback
            ];
        }

        $route = request()->route();

        foreach ($paramNames as $name) {
            $value = $route?->parameter($name);
            if ($value !== null) {
                return $value instanceof Model ? $value->getKey() : $value;
            }
        }

        // آخر محاولة: أخذ آخر parameter في الـ route
        $params = $route?->parameters() ?? [];
        if (!empty($params)) {
            $last = end($params);
            return $last instanceof Model ? $last->getKey() : $last;
        }

        throw new \RuntimeException("Could not resolve ID from route for resource: {$this->resourceName}");
    }

    // ══════════════════════════════════════════════════════════════
    // Abstract Methods — nullable لدعم AuthController وغيره
    // ══════════════════════════════════════════════════════════════

    /**
     * يجب تعريفه في الكنترولر الفرعي إذا استُخدم index/show/store/update/destroy.
     * AuthController لا يحتاجه لأنه يعرّف كل method بنفسه.
     */
    protected function getService(): mixed
    {
        throw new \LogicException(
            static::class . ' يجب أن يعرّف getService() أو يتجاوز الدوال التي تستخدمه.'
        );
    }

    /**
     * يجب تعريفه في الكنترولر الفرعي إذا استُخدمت store/authorize.
     */
    protected function getModelClass(): string
    {
        throw new \LogicException(
            static::class . ' يجب أن يعرّف getModelClass() أو يتجاوز الدوال التي تستخدمه.'
        );
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    protected function getValidatedData(Request $request, $id = null): array
    {
        return $request instanceof FormRequest
            ? $request->validated()
            : $request->all();
    }

    protected function getListData(Request $request): mixed
    {
        return $this->apiListWithConfig(
            $this->getModelClass(),
            $this->getListConfig(),
            $request
        );
    }

    protected function getListConfig(): array
    {
        return ['cache_tags' => ['api', $this->resourceName]];
    }

    protected function transformItem(mixed $item): mixed
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

    protected function clearModelCache(): void
    {
        try {
            \Illuminate\Support\Facades\Cache::tags(['api', $this->resourceName])->flush();
        } catch (\Throwable $e) {
            Log::warning("clearModelCache failed for {$this->resourceName}", ['error' => $e->getMessage()]);
        }
    }

    protected function logOperation(string $operation, mixed $item, array $context = []): void
    {
        Log::info("Controller bulk operation: {$operation}", array_merge([
            'resource' => $this->resourceName,
            'model'    => is_object($item) ? get_class($item) : $item,
            'id'       => is_object($item) ? ($item->id ?? null) : null,
            'user_id'  => auth()->id() ?? null,
        ], $context));
    }

    // ══════════════════════════════════════════════════════════════
    // Error Handling
    // ══════════════════════════════════════════════════════════════

    protected function handleError(\Throwable $e, string $operation): JsonResponse
    {
        $errorType = $this->determineErrorType($e);

        $context = [
            'operation'     => $operation,
            'resource'      => $this->resourceName,
            'error_message' => $e->getMessage(),
            'user_id'       => auth()->id() ?? null,
            'url'           => request()->fullUrl(),
            'method'        => request()->method(),
            'ip'            => request()->ip(),
        ];

        if ($errorType === 'server_error') {
            $context['trace'] = array_slice($e->getTrace(), 0, 5);
        }

        match ($this->getLogLevel($errorType)) {
            'info'    => Log::info("API {$operation}: {$errorType}", $context),
            'warning' => Log::warning("API {$operation}: {$errorType}", $context),
            'error'   => Log::error("API {$operation}: {$errorType}", $context),
        };

        return $this->buildErrorResponse($e, $errorType);
    }

    protected function getLogLevel(string $errorType): string
    {
        return match ($errorType) {
            'business_rule' => 'info',
            'validation'    => 'info',
            'not_found'     => 'info',
            'authorization' => 'warning',
            default         => 'error',
        };
    }

    protected function determineErrorType(\Throwable $e): string
    {
        return match (true) {
            $e instanceof ModelNotFoundException                                                      => 'not_found',
            $e instanceof BusinessRuleException                                                       => 'business_rule',
            $e instanceof AuthorizationException                                                      => 'authorization',
            $e instanceof \App\Core\Exceptions\UnauthorizedException                                 => 'authorization',
            $e instanceof ValidationException                                                         => 'validation',
            $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException
                && $e->getStatusCode() < 500                                                         => 'client_error',
            default                                                                                   => 'server_error',
        };
    }

    protected function buildErrorResponse(\Throwable $e, string $errorType): JsonResponse
    {
        return match ($errorType) {
            'not_found' => $this->errorResponse(
                "{$this->resourceName} غير موجود", 404, 'NOT_FOUND'
            ),
            'business_rule' => $this->errorResponse(
                $e->getMessage(), $e->getCode() ?: 409, 'BUSINESS_RULE_VIOLATION'
            ),
            'authorization' => $this->errorResponse(
                $e->getMessage() ?: 'ليس لديك الصلاحية',
                $e instanceof \App\Core\Exceptions\UnauthorizedException ? 401 : 403,
                'AUTHORIZATION_ERROR'
            ),
            'validation' => $this->errorResponse(
                'خطأ في البيانات المدخلة', 422, 'VALIDATION_ERROR',
                $e instanceof ValidationException ? $e->errors() : []
            ),
            'client_error' => $this->errorResponse(
                $e->getMessage() ?: 'طلب غير صالح',
                $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException
                    ? $e->getStatusCode() : 400,
                'CLIENT_ERROR'
            ),
            default => $this->errorResponse(
                config('app.debug') ? $e->getMessage() : 'حدث خطأ غير متوقع في الخادم',
                500, 'SERVER_ERROR'
            ),
        };
    }
}
