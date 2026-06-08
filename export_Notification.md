# Module Export: Notification
Generated at: 2026-06-08 10:56:22

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\Notification.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class Notification extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'notifications';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'company_id',
        'type',
        'notifiable_type',
        'notifiable_id',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['type'];
    public static array $filterable = ['notifiable_type', 'notifiable_id', 'type'];
    public static array $sortable = ['created_at', 'read_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['notifiable'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['notifications'];

    public function notifiable()
    {
        return $this->morphTo();
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeRead(Builder $query): Builder
    {
        return $query->whereNotNull('read_at');
    }

    public function markAsRead(): bool
    {
        if ($this->read_at) return false;
        return $this->forceFill(['read_at' => now()])->save();
    }

    public function markAsUnread(): bool
    {
        if (!$this->read_at) return false;
        return $this->forceFill(['read_at' => null])->save();
    }

    public function isUnread(): bool
    {
        return is_null($this->read_at);
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\NotificationController.php
```php
<?php

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

```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\NotificationService.php
```php
<?php

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

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\NotificationPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NotificationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_notification');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_notification');
    }

    public function create(User $user): bool
    {
        return $user->can('create_notification');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_notification');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_notification');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_notification');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_notification');
    }
}
```

## Migrations

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_094149_create_notifications_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['company_id', 'notifiable_type', 'notifiable_id'], 'notifications_company_notifiable_idx');
            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('notifications');
    }
};

```

