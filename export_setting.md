# Module Export: setting
Generated at: 2026-05-26 10:42:44

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Setting.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Setting extends Model
{
    use HasCompany, HasStandardizedConfiguration;

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

    public function scopeByGroup(Builder $query, string $group): Builder { return $query->where('group', $group); }
    public function scopePublic(Builder $query): Builder { return $query->where('is_public', true); }
    public function scopeEditable(Builder $query): Builder { return $query->where('is_editable', true); }

    public static function get(string $key, $default = null)
    {
        return Cache::tags(['settings'])->remember("setting:{$key}", now()->addHours(24), function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->getTypedValue() : $default;
        });
    }

    public static function set(string $key, $value): bool
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || !$setting->is_editable) return false;
        $setting->value = $value;
        $result = $setting->save();
        if ($result) Cache::tags(['settings'])->forget("setting:{$key}");
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
        static::saved(fn($s) => Cache::tags(['settings'])->forget("setting:{$s->key}"));
        static::deleted(fn($s) => Cache::tags(['settings'])->forget("setting:{$s->key}"));
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\Admin\AdminSystemSettingsController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\SettingController.php
```php
<?php

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

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\SettingService.php
```php
<?php

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

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\SettingRequest.php
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

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\SettingPolicy.php
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

