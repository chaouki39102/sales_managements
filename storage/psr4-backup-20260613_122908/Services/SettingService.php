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
