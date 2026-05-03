<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * Setting Model
 *
 * Table: settings
 * System-wide configuration settings
 */
#[Cacheable]
class Setting extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'settings';

    protected $fillable = [
        'key',
        'group',
        'value',
        'type',
        'description',
        'is_public',
        'is_editable',
        'display_order',
    ];

    protected $casts = [
        'value' => 'array',
        'is_public' => 'boolean',
        'is_editable' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['key', 'description'];
    public static array $filterable = ['group', 'is_public', 'is_editable'];
    public static array $sortable = ['id', 'key', 'group', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 7200;
    public static array $cacheTags = ['settings'];

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

    public static function get(string $key, $default = null)
    {
        return Cache::tags(['settings'])->remember(
            "setting:{$key}",
            now()->addHours(24),
            function () use ($key, $default) {
                $setting = static::where('key', $key)->first();
                return $setting ? $setting->getTypedValue() : $default;
            }
        );
    }

    public static function set(string $key, $value): bool
    {
        $setting = static::where('key', $key)->first();

        if (!$setting) {
            return false;
        }

        if (!$setting->is_editable) {
            return false;
        }

        $setting->value = $value;
        $result = $setting->save();

        if ($result) {
            Cache::tags(['settings'])->forget("setting:{$key}");
        }

        return $result;
    }

    public function getTypedValue()
    {
        $value = $this->value;

        return match ($this->type) {
            'integer', 'int' => is_array($value) ? (int)($value[0] ?? 0) : (int)$value,
            'float', 'double' => is_array($value) ? (float)($value[0] ?? 0) : (float)$value,
            'boolean', 'bool' => is_array($value) ? (bool)($value[0] ?? false) : (bool)$value,
            'json', 'array' => is_array($value) ? $value : json_decode($value, true),
            default => is_array($value) ? ($value[0] ?? '') : $value,
        };
    }

    protected static function boot()
    {
        parent::boot();

        static::saved(function ($setting) {
            Cache::tags(['settings'])->forget("setting:{$setting->key}");
        });

        static::deleted(function ($setting) {
            Cache::tags(['settings'])->forget("setting:{$setting->key}");
        });
    }
}

