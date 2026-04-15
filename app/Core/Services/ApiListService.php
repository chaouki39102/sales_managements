<?php

namespace App\Core\Services;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\Exceptions\InvalidFilterQuery;
use Spatie\QueryBuilder\Exceptions\InvalidIncludeQuery;
use Spatie\QueryBuilder\Exceptions\InvalidSortQuery;
use Maatwebsite\Excel\Facades\Excel;
use App\Core\Exports\GenericExport;
use App\Core\Filters\RangeFilter;
use App\Core\Exceptions\ApiQueryBuilderException; // ✅ إضافة: استثناء مخصص لمعالجة أخطاء 400
use RuntimeException;

/**
 * خدمة مركزية لبناء قوائم API متقدمة.
 * تدعم الفلترة، الترتيب، البحث، التضمين، التصدير، والكاش.
 */
class ApiListService
{
    /**
     * جلب قائمة من البيانات مع الفلاتر، الكاش، والتصدير.
     *
     * @param string $modelClass The fully qualified class name of the Eloquent model.
     * @param array $config Configuration array for the query.
     * @param Request $request The current HTTP request.
     * @return LengthAwarePaginator|JsonResponse|\Illuminate\Http\Response|\Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public static function getList(string $modelClass, array $config, Request $request)
    {
        $cacheTtl      = $config['cache_ttl'] ?? null;
        $cacheTags     = $config['cache_tags'] ?? ['api', class_basename($modelClass)];
        $queryCallback = $config['query_callback'] ?? null;

        // إذا كان الكاش مفعّلاً، قم باستخدامه مع قفل لمنع التضارب (Cache Stampede)
        if ($cacheTtl && $cacheTtl > 0) {
            $cacheKey = self::generateCacheKey($modelClass, $request, $config);
            $lockKey  = $cacheKey . ':lock';

            // استخدام قفل ذري لضمان أن عملية بناء الكاش تتم مرة واحدة فقط عند الطلبات المتزامنة
            return Cache::lock($lockKey, 10)->get(function () use ($cacheKey, $cacheTtl, $cacheTags, $modelClass, $config, $request, $queryCallback) {
                $execute = fn() => self::executeQuery($modelClass, $config, $request, $queryCallback);

                if (method_exists(Cache::getStore(), 'tags')) {
                    return Cache::tags($cacheTags)->remember($cacheKey, $cacheTtl, $execute);
                }

                return Cache::remember($cacheKey, $cacheTtl, $execute);
            });
        }

        // إذا كان الكاش معطلاً، نفذ الاستعلام مباشرة
        return self::executeQuery($modelClass, $config, $request, $queryCallback);
    }

    /**
     * تنفيذ الاستعلام الأساسي، مع معالجة التصدير والـ Pagination.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @param callable|null $queryCallback
     * @return mixed
     * @throws ApiQueryBuilderException|\Throwable
     */
    protected static function executeQuery(string $modelClass, array $config, Request $request, ?callable $queryCallback = null)
    {
        try {
            $qb = self::buildQueryBuilder($modelClass, $config, $request);

            // تطبيق أي تعديلات مخصصة على الاستعلام عبر الـ Callback
            if ($queryCallback) {
                $qb = $queryCallback($qb, $request);
            }

            // معالجة طلبات التصدير
            if ($request->filled('export') && in_array($request->get('export'), ['csv', 'xlsx', 'json'])) {
                return self::applyExport($qb, $request->string('export'));
            }

            // تطبيق الـ Pagination
            $perPage = (int) $request->get('per_page', $config['default_per_page'] ?? 15);
            $perPage = min($perPage, $config['per_page_limit'] ?? 100);

            return $qb->paginate($perPage);

        } catch (InvalidFilterQuery | InvalidSortQuery | InvalidIncludeQuery $e) {
            // ✅ تحسين: معالجة أخطاء المستخدم (مثل فلتر غير صالح) كـ 400 Bad Request
            Log::warning('ApiListService: Invalid query parameter from user.', [
                'model' => $modelClass,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            // إعادة رمي الاستثناء كنوع مخصص يمكن معالجته في الـ Handler العام
            throw new ApiQueryBuilderException("Invalid query parameter: " . $e->getMessage(), 400, $e);

        } catch (\Throwable $e) {
            // معالجة الأخطاء غير المتوقعة كـ 500 Server Error
            Log::error('ApiListService.executeQuery unexpected error', [
                'model' => $modelClass,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e; // Re-throw for the global handler
        }
    }

    /**
     * دالة عامة (public) لبناء الاستعلام — تستخدمها Jobs والخدمات الخارجية.
     * واجهة للدالة المحمية buildQueryBuilder.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @return QueryBuilder
     */
    public static function buildQuery(string $modelClass, array $config, Request $request): QueryBuilder
    {
        return self::buildQueryBuilder($modelClass, $config, $request);
    }

    /**
     * بناء كائن QueryBuilder مع تطبيق الفلاتر، الترتيب، والعلاقات المسموح بها.
     *
     * @param string $modelClass
     * @param array $config
     * @param Request $request
     * @return QueryBuilder
     */
    protected static function buildQueryBuilder(string $modelClass, array $config, Request $request): QueryBuilder
    {
        // ✅ تحسين: دعم ?search= للتحويل التلقائي إلى ?filter[search]= لتسهيل الاستخدام
        if ($request->has('search') && !$request->has('filter.search')) {
            $request->merge([
                'filter' => array_merge($request->get('filter', []), ['search' => $request->get('search')])
            ]);
        }

        $allowedFilters   = self::prepareAllowedFilters($config, $request);
        $allowedSorts     = $config['sorts'] ?? [];
        $allowedIncludes  = $config['relations'] ?? $config['allowed_includes'] ?? [];
        $defaultIncludes  = $config['default_includes'] ?? [];
        $defaultSort      = $config['default_sort'] ?? 'id';
        $defaultDirection = $config['default_sort_direction'] ?? 'asc';

        $qb = QueryBuilder::for($modelClass);

        // دعم SoftDeletes إذا كان مفعّلاً في الإعدادات والموديل يدعمه
        if (($config['enable_soft_deletes'] ?? false) && method_exists($modelClass, 'withTrashed')) {
            $qb->withTrashed();
        }

        $qb->with($defaultIncludes)
           ->allowedFilters($allowedFilters)
           ->allowedSorts($allowedSorts)
           ->allowedIncludes($allowedIncludes);

        // تطبيق الترتيب الافتراضي فقط إذا لم يحدده المستخدم
        if (!$request->has('sort')) {
            $qb->orderBy($defaultSort, $defaultDirection);
        }

        // تطبيق Scopes محددة في الإعدادات
        foreach ($config['scopes'] ?? [] as $scopeName) {
            if (method_exists($modelClass, 'scope' . ucfirst($scopeName))) {
                $qb->{$scopeName}();
            }
        }

        return $qb;
    }

    /**
     * تجهيز مصفوفة الفلاتر المسموح بها لـ Spatie Query Builder.
     *
     * @param array $config
     * @param Request $request
     * @return array
     */
    protected static function prepareAllowedFilters(array $config, Request $request): array
    {
        $allowed = [];
        $filters = array_merge($config['filters'] ?? [], $config['custom_filters'] ?? []);

        foreach ($filters as $key => $definition) {
            $name   = is_string($key) ? $key : $definition;
            $type   = is_array($definition) ? ($definition['type'] ?? 'partial') : 'partial';
            $column = is_array($definition) ? ($definition['column'] ?? $name) : $name;

            $allowed[] = match ($type) {
                'exact'         => AllowedFilter::exact($name, $column),
                'range',
                'date_range'    => AllowedFilter::custom($name, new RangeFilter(), $column),
                'boolean'       => AllowedFilter::callback($name, fn(Builder $q, $v) => $q->where($column, filter_var($v, FILTER_VALIDATE_BOOLEAN))),
                'json_contains' => AllowedFilter::callback($name, fn(Builder $q, $v) => $q->whereJsonContains($column, $v)),
                'regex'         => self::createRegexFilter($name, $column),
                default         => AllowedFilter::partial($name, $column),
            };
        }

        // إضافة الفلاتر المتقدمة
        foreach ($config['advanced_filters'] ?? [] as $advancedFilter) {
            $allowed[] = $advancedFilter;
        }

        // إضافة فلتر البحث العام
        $searchFields = $config['search_fields'] ?? [];
        if (!empty($searchFields)) {
            $allowed[] = self::createGlobalSearchFilter($searchFields);
        }

        return $allowed;
    }

    /**
     * توليد مفتاح كاش فريد للطلب الحالي لضمان عدم تداخل البيانات.
     *
     * @param string $modelClass
     * @param Request $request
     * @param array $config
     * @return string
     */
    protected static function generateCacheKey(string $modelClass, Request $request, array $config): string
    {
        $uid    = auth()->id() ?? 'guest';
        $tenant = config('app.tenant_id') ?? 'default';

        $relevantParams = $request->only(['filter', 'sort', 'include', 'page', 'per_page', 'search']);

        if ($config['enable_soft_deletes'] ?? false) {
            $relevantParams['soft_deleted'] = 1;
        }

        // ✅ هام: ترتيب المعاملات لضمان أن الطلبات المتطابقة لها نفس مفتاح الكاش
        ksort($relevantParams);
        array_walk_recursive($relevantParams, function (&$item) {
            if (is_array($item)) ksort($item);
        });

        $hash = md5(json_encode($relevantParams));
        return "api-list:{$tenant}:" . class_basename($modelClass) . ":{$uid}:{$hash}";
    }

    /**
     * تنفيذ عملية التصدير إلى الصيغة المطلوبة.
     *
     * @param \Spatie\QueryBuilder\QueryBuilder $queryBuilder
     * @param string $format
     * @param int $chunkSize
     * @return JsonResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    protected static function applyExport(\Spatie\QueryBuilder\QueryBuilder $queryBuilder, string $format, int $chunkSize = 1000)
    {
        if ($format === 'json') {
            return response()->json($queryBuilder->get());
        }

        if (in_array($format, ['csv', 'xlsx'])) {
            // ✅ تحسين: التأكد من وجود حزمة Excel قبل محاولة استخدامها
            if (!class_exists(Excel::class)) {
                throw new RuntimeException('Maatwebsite/excel package is required for exports. Please run "composer require maatwebsite/excel".');
            }
            $fileName = strtolower(Str::plural(class_basename($queryBuilder->getModel()))) . '_' . now()->format('Y-m-d');
            return Excel::download(
                new GenericExport($queryBuilder, $chunkSize),
                "{$fileName}.{$format}",
                ($format === 'xlsx') ? \Maatwebsite\Excel\Excel::XLSX : \Maatwebsite\Excel\Excel::CSV
            );
        }

        return response()->json(['error' => 'Unsupported export format'], 400);
    }

    /**
     * إنشاء فلتر البحث العام.
     */
    private static function createGlobalSearchFilter(array $searchFields): AllowedFilter
    {
        return AllowedFilter::callback('search', function (Builder $query, $value) use ($searchFields) {
            $query->where(function (Builder $q) use ($searchFields, $value) {
                foreach ($searchFields as $field) {
                    if (Str::contains($field, '.')) {
                        [$relation, $column] = explode('.', $field, 2);
                        $q->orWhereHas($relation, fn(Builder $qr) => $qr->where($column, 'like', "%{$value}%"));
                    } else {
                        $q->orWhere($field, 'like', "%{$value}%");
                    }
                }
            });
        });
    }

    /**
     * إنشاء فلتر Regex آمن.
     */
    private static function createRegexFilter(string $name, string $column): AllowedFilter
    {
        return AllowedFilter::callback($name, function (Builder $q, $value) use ($column) {
            // حماية ضد Regular Expression Denial of Service (ReDoS)
            if (!is_string($value) || strlen($value) > 50) return;
            if (preg_match('/(?:\(\?R\)|(.)\1{10,})/', $value)) return; // Reject complex patterns

            try {
                // @ suppresses warning on invalid patterns
                if (@preg_match("/$value/", '') !== false) {
                    $q->where($column, 'REGEXP', $value);
                }
            } catch (\Exception $e) {
                Log::warning('Invalid regex filter pattern provided by user.', ['pattern' => $value]);
            }
        });
    }
}
