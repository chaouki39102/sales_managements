# Module Export: Setting
Generated at: 2026-06-20 19:17:12

## Models

### 📁 C:\xampp\htdocs\sales_managements\app\Models\Setting.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use App\Models\Traits\HasCompany;

/**
 * ════════════════════════════════════════════════════════════════════
 * Setting Model — النسخة المُصلحة
 *
 * الإصلاحات الجوهرية:
 * ① حذف Cache::tags() من boot() — يُسبب 500 مع file/database cache driver
 *    "This cache store does not support tagging"
 *
 * ② حذف cast 'value' => 'array' من $casts
 *    المشكلة: هذا الـ cast يحوّل "My App" إلى ["My App"] عند القراءة
 *    الحل: نتعامل مع القيمة يدوياً في SettingService::castValue()
 *
 * ③ إضافة دالة clearCacheForKey() آمنة تعمل مع كل drivers
 * ════════════════════════════════════════════════════════════════════
 */
class Setting extends Model
{
    use HasCompany;

    protected $table = 'settings';

    protected $fillable = [
        'company_id',
        'key',
        'group',
        'value',
        'type',
        'description',
        'is_public',
        'is_editable',
        'display_order',
    ];

    // ✅ لا 'value' => 'array' هنا — يُسبب bugs مع strings العادية
    protected $casts = [
        'is_public'     => 'boolean',
        'is_editable'   => 'boolean',
        'display_order' => 'integer',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];

    // ─── Scopes ──────────────────────────────────────────────────────

    public function scopeByGroup(Builder $query, string $group): Builder
    {
        return $query->where('group', $group);
    }

    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', true);
    }

    public function scopeEditable(Builder $query): Builder
    {
        return $query->where('is_editable', true);
    }

    // ─── Static Helpers ───────────────────────────────────────────────

    /**
     * جلب قيمة إعداد واحد بأمان (بدون Cache::tags)
     */
    public static function getSetting(string $key, $default = null, ?int $companyId = null)
    {
        $cacheKey = "setting:{$companyId}:{$key}";

        // ✅ Cache::remember بدون tags — يعمل مع كل drivers
        return Cache::remember($cacheKey, now()->addHours(24), function () use ($key, $default, $companyId) {
            $query = static::where('key', $key);

            if ($companyId !== null) {
                $query->where('company_id', $companyId);
            } else {
                $query->whereNull('company_id');
            }

            $setting = $query->first();

            if (!$setting) {
                return $default;
            }

            return $setting->getTypedValue();
        });
    }

    /**
     * تعيين قيمة إعداد
     */
    public static function setSetting(string $key, $value, ?int $companyId = null): bool
    {
        $query = static::where('key', $key);

        if ($companyId !== null) {
            $query->where('company_id', $companyId);
        } else {
            $query->whereNull('company_id');
        }

        $setting = $query->first();

        if (!$setting || !$setting->is_editable) {
            return false;
        }

        $setting->value = $value;
        $result = $setting->save();

        if ($result) {
            static::clearCacheForKey($key, $companyId);
        }

        return $result;
    }

    /**
     * ✅ مسح cache بأمان بدون tags
     */
    public static function clearCacheForKey(string $key, ?int $companyId = null): void
    {
        Cache::forget("setting:{$companyId}:{$key}");
    }

    /**
     * ✅ مسح كل cache للشركة بدون tags
     */
    public static function clearAllCacheForCompany(?int $companyId): void
    {
        // لا يمكن مسح كل keys بدون قائمة — نستخدم cache prefix
        // الحل الأفضل: استخدام Redis tags أو store قائمة الـ keys
        // للـ file/database driver نكتفي بـ forget لكل key معروف
        $knownGroups = ['invoice', 'fiscal', 'inventory', 'alerts', 'general'];

        foreach ($knownGroups as $group) {
            Cache::forget("settings:{$companyId}:{$group}");
        }

        Cache::forget("settings:{$companyId}:all");
    }

    // ─── Value Helpers ────────────────────────────────────────────────

    /**
     * إرجاع القيمة المحوَّلة حسب النوع
     * يعمل مع القيمة الخام (text) من الـ DB
     */
    public function getTypedValue(): mixed
    {
        $raw  = $this->getRawOriginal('value') ?? $this->attributes['value'] ?? null;
        $type = $this->type ?? 'string';

        if ($raw === null || $raw === '') {
            return match ($type) {
                'boolean', 'bool' => false,
                'integer', 'int'  => 0,
                'float', 'double' => 0.0,
                'json', 'array'   => [],
                default           => '',
            };
        }

        // محاولة JSON decode
        $decoded = json_decode($raw, true);

        return match ($type) {
            'boolean', 'bool' => filter_var($decoded ?? $raw, FILTER_VALIDATE_BOOLEAN),
            'integer', 'int'  => (int) ($decoded ?? $raw),
            'float', 'double' => (float) ($decoded ?? $raw),
            'json', 'array'   => is_array($decoded) ? $decoded : (json_decode($raw, true) ?? []),
            default           => is_string($decoded) ? $decoded : (is_scalar($decoded) ? (string) $decoded : $raw),
        };
    }

    // ─── Boot ─────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        // ✅ مسح cache بعد الحفظ/الحذف — بدون Cache::tags()
        static::saved(function (self $setting) {
            static::clearCacheForKey($setting->key, $setting->company_id);
            static::clearAllCacheForCompany($setting->company_id);
        });

        static::deleted(function (self $setting) {
            static::clearCacheForKey($setting->key, $setting->company_id);
        });
    }
}

```

## Controllers

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\Admin\AdminSystemSettingsController.php
```php
<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSystemSettingsController extends Controller
{
    protected string $cacheKey = 'system_settings';

    public function index(): JsonResponse
    {
        $settings = Cache::remember($this->cacheKey, 3600, function () {
            return DB::table('settings')
                ->whereNull('company_id')
                ->pluck('value', 'key')
                ->toArray();
        });

        return response()->json([
            'data' => $settings
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string'
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['settings'] as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key, 'company_id' => null],
                    [
                        'value'      => $value,
                        'group'      => 'system',
                        'type'       => 'string',
                        'is_public'  => false,
                        'is_editable'=> true,
                        'updated_at' => now(),
                    ]
                );
            }
        });

        Cache::forget($this->cacheKey);
        return response()->json(['message' => 'تم تحديث الإعدادات']);
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\SettingController.php
```php
<?php

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

            // documents
            'default_warehouse_id', 'default_currency_id', 'default_price_level_id',
            'default_payment_mode_id', 'default_treasury_account_id',
            'default_apply_stamp', 'default_is_proforma', 'default_fiscal_year_behavior',
            'documents_default_line_mode', 'documents_default_visible_cols',

            // inventory (expansion)
            'allow_negative_stock_on_sale', 'auto_create_lot_on_purchase',

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

```

## Services

### 📁 C:\xampp\htdocs\sales_managements\app\Services\SettingService.php
```php
<?php

namespace App\Services;

use App\Models\Setting;
use App\Core\Services\BaseService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ════════════════════════════════════════════════════════════════════
 * SettingService — النسخة المُصلحة
 *
 * الإصلاحات:
 * ① clearCache() بدون tags — يعمل مع file/database/redis drivers
 * ② upsertSettings() — updateOrCreate مباشر، لا يمر بـ BaseService
 * ③ castValue() — تحويل صحيح للقيم (string/boolean/integer/json)
 * ④ beforeCreate() يُعيد company_id بعد أن يحذفه BaseService
 * ════════════════════════════════════════════════════════════════════
 */
class SettingService extends BaseService
{
    protected string $model        = Setting::class;
    protected string $resourceName = 'setting';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'setting';
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ clearCache — بدون Cache::tags()
    // ═══════════════════════════════════════════════════════════════

    protected function clearCache(): void
    {
        $companyId = $this->getCurrentCompanyId();

        // مسح cache groups المعروفة
        foreach (['invoice', 'fiscal', 'inventory', 'alerts', 'general', 'company'] as $group) {
            Cache::forget("settings:{$companyId}:{$group}");
        }

        Cache::forget("settings:{$companyId}:all");

        // ✅ لا Cache::tags() — يُسبب: "This cache store does not support tagging"
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ beforeCreate — يُعيد company_id بعد أن يحذفه BaseService
    // ═══════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $companyId = $data['company_id'] ?? $this->getCurrentCompanyId();
        $data = parent::beforeCreate($data, $request);
        if ($companyId) {
            $data['company_id'] = $companyId;
        }
        return $data;
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ upsertSettings — الدالة الرئيسية لتحديث الإعدادات
    //
    // تستقبل: ['invoice_design' => 'modern', 'price_mode' => 'ht', ...]
    // تُرجع: Collection<Setting>
    // ═══════════════════════════════════════════════════════════════

    public function upsertSettings(array $settingsDict): Collection
    {
        $companyId = $this->getCurrentCompanyId();
        $upserted  = new Collection();
        $now       = now();

        DB::transaction(function () use ($settingsDict, $companyId, $now, &$upserted) {
            foreach ($settingsDict as $key => $value) {

                // ① تحقق من is_editable قبل أي تعديل
                $existing = Setting::where('key', $key)
                    ->when(
                        $companyId,
                        fn($q) => $q->where('company_id', $companyId),
                        fn($q) => $q->whereNull('company_id')
                    )
                    ->first();

                if ($existing && !$existing->is_editable) {
                    continue; // تخطّى الإعدادات المحمية
                }

                $storedValue = $this->prepareValueForStorage($value);
                $updateData  = ['value' => $storedValue, 'updated_at' => $now];

                if ($companyId) {
                    // ② المسار الطبيعي — tenant
                    DB::table('settings')->updateOrInsert(
                        ['key' => $key, 'company_id' => $companyId],
                        array_merge($updateData, $existing ? [] : [
                            'key'           => $key,
                            'company_id'    => $companyId,
                            'group'         => $this->guessGroup($key),
                            'type'          => $this->guessType($value),
                            'is_editable'   => true,
                            'is_public'     => false,
                            'display_order' => 0,
                            'created_at'    => $now,
                        ])
                    );
                } else {
                    // ③ company_id IS NULL — updateOrInsert لا يفهم null كـ IS NULL
                    if ($existing) {
                        DB::table('settings')
                            ->where('key', $key)
                            ->whereNull('company_id')
                            ->update($updateData);
                    } else {
                        DB::table('settings')->insert(array_merge($updateData, [
                            'key'           => $key,
                            'company_id'    => null,
                            'group'         => $this->guessGroup($key),
                            'type'          => $this->guessType($value),
                            'is_editable'   => true,
                            'is_public'     => false,
                            'display_order' => 0,
                            'created_at'    => $now,
                        ]));
                    }
                }

                // ④ جلب السجل المحدَّث — $existing قد يكون stale بعد الـ update
                $fresh = Setting::where('key', $key)
                    ->when(
                        $companyId,
                        fn($q) => $q->where('company_id', $companyId),
                        fn($q) => $q->whereNull('company_id')
                    )
                    ->first();

                if ($fresh) {
                    $upserted->push($fresh);
                }
            }
        });

        $this->clearCache();

        return $upserted;
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ getAllAsDict — dictionary للـ index endpoint
    //
    // الصيغة: { "invoice_design": { value, group, type, is_editable } }
    // ═══════════════════════════════════════════════════════════════

    public function getAllAsDict(): array
    {
        $companyId = $this->getCurrentCompanyId();
        $cacheKey  = "settings:{$companyId}:all";

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($companyId) {
            $query = Setting::query();

            if ($companyId) {
                $query->where('company_id', $companyId);
            } else {
                $query->whereNull('company_id');
            }

            $settings = $query->orderBy('display_order')->get();
            $dict     = [];

            foreach ($settings as $setting) {
                $dict[$setting->key] = [
                    'value'       => $this->castValue($setting),
                    'group'       => $setting->group,
                    'type'        => $setting->type ?? 'string',
                    'is_editable' => $setting->is_editable ?? true,
                ];
            }

            return $dict;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ getGroupAsArray — array من objects للـ frontend hook
    //
    // الصيغة: [{ key, value, group, type, is_editable, updated_at }]
    // هذا ما يتوقعه: useSettingsByGroup() → makeGs(rawSettings)
    // ═══════════════════════════════════════════════════════════════

    public function getGroupAsArray(string $group): array
    {
        $companyId = $this->getCurrentCompanyId();
        $cacheKey  = "settings:{$companyId}:{$group}";

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($group, $companyId) {
            $query = Setting::query()->where('group', $group);

            if ($companyId) {
                $query->where('company_id', $companyId);
            } else {
                $query->whereNull('company_id');
            }

            return $query
                ->orderBy('display_order')
                ->get()
                ->map(fn(Setting $s) => [
                    'key'         => $s->key,
                    'value'       => $this->castValue($s),
                    'group'       => $s->group,
                    'type'        => $s->type ?? 'string',
                    'is_editable' => $s->is_editable ?? true,
                    'updated_at'  => $s->updated_at?->toIso8601String(),
                ])
                ->values()
                ->toArray();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // findByKey — جلب إعداد واحد
    // ═══════════════════════════════════════════════════════════════

    public function findByKey(string $key): ?Setting
    {
        $companyId = $this->getCurrentCompanyId();

        $query = Setting::where('key', $key);

        if ($companyId) {
            $query->where('company_id', $companyId);
        } else {
            $query->whereNull('company_id');
        }

        return $query->first();
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers الداخلية
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ castValue — تحويل القيمة من DB حسب النوع
     *
     * المشكلة: Setting::$casts كان يحوّل 'value' => 'array'
     * هذا يُسبب: "My App" → ["My App"] (array بدل string)
     *
     * الحل: نقرأ القيمة الخام ونحوّلها يدوياً
     */
    public function castValue(Setting $setting): mixed
    {
        // ✅ getRawOriginal يُرجع القيمة كما هي في DB (بدون cast)
        $raw  = $setting->getRawOriginal('value');
        $type = $setting->type ?? 'string';

        if ($raw === null || $raw === '') {
            return match ($type) {
                'boolean', 'bool' => false,
                'integer', 'int'  => 0,
                'float', 'double' => 0.0,
                'json', 'array'   => [],
                default           => '',
            };
        }

        // محاولة JSON decode
        $decoded = json_decode($raw, true);
        $jsonOk  = json_last_error() === JSON_ERROR_NONE;

        return match ($type) {
            'boolean', 'bool' => filter_var($jsonOk ? $decoded : $raw, FILTER_VALIDATE_BOOLEAN),
            'integer', 'int'  => (int) ($jsonOk ? $decoded : $raw),
            'float', 'double' => (float) ($jsonOk ? $decoded : $raw),
            'json', 'array'   => $jsonOk && is_array($decoded) ? $decoded : [],
            default           => // string
            $jsonOk && is_string($decoded) ? $decoded
                : ($jsonOk && is_scalar($decoded) ? (string) $decoded
                    : $raw),
        };
    }

    /**
     * تحضير القيمة للتخزين في DB (كـ text)
     */
    private function prepareValueForStorage(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        return (string) $value;
    }

    /**
     * تخمين المجموعة من اسم المفتاح
     */
    private function guessGroup(string $key): string
    {
        $prefixes = [
            'invoice_' => 'invoice',
            'price_mode' => 'invoice',
            'tax_'     => 'fiscal',
            'fiscal_'  => 'fiscal',
            'ifu_'     => 'fiscal',
            'default_tva' => 'fiscal',
            'year_reg' => 'fiscal',
            'entity_'  => 'fiscal',
            'default_currency' => 'fiscal',
            'allow_neg'   => 'inventory',
            'manage_'     => 'inventory',
            'default_val' => 'inventory',
            'low_stock_d' => 'inventory',
            'auto_adj'    => 'inventory',
            'alert_'   => 'alerts',
            'notif_'   => 'alerts',
            'email_not' => 'alerts',
            'debt_'    => 'alerts',
            'g50_'     => 'alerts',
            'draft_'   => 'alerts',
        ];

        foreach ($prefixes as $prefix => $group) {
            if (str_starts_with($key, $prefix)) {
                return $group;
            }
        }

        return 'general';
    }

    /**
     * تخمين النوع من القيمة
     */
    private function guessType(mixed $value): string
    {
        if (is_bool($value)) return 'boolean';
        if (is_int($value))  return 'integer';
        if (is_float($value)) return 'float';
        if (is_array($value)) return 'json';
        return 'string';
    }
}

```

## Requests

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\SettingRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'required|string|max:150|unique:settings,key',
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'sometimes|string|max:150|unique:settings,key,' . $this->route('setting'),
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreSettingRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'required|string|max:150|unique:settings,key',
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}


```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateSettingRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;


class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'sometimes|string|max:150|unique:settings,key,' . $this->route('setting'),
            'group' => 'nullable|string|max:100',
            'value' => 'nullable',
            'type' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
            'is_editable' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ];
    }
}
```

## Policies

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\SettingPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_setting');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_setting');
    }

    public function create(User $user): bool
    {
        return $user->can('create_setting');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_setting');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_setting');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_setting');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_setting');
    }
}
```

## Migrations

### 📁 C:\xampp\htdocs\sales_managements\database\migrations/2025_10_15_094145_create_settings_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate()->comment('NULL = إعداد عام للنظام');
            $table->string('key', 100);
            $table->string('group', 50)->default('general')->index();
            $table->json('value')->nullable();
            $table->string('type', 50)->default('string')->comment('string, integer, boolean, json');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_editable')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'key'], 'settings_company_key_unique');
            $table->index(['group', 'key']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('settings');
    }
};

```

