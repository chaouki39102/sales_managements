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
