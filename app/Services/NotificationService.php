<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\BaseService;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class NotificationService extends BaseService
{
    protected string $model        = Notification::class;
    protected string $resourceName = 'notification';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    public function getUnread(): Collection
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return collect();
        }

        return $this->baseQuery($user, $companyId)
            ->unread()
            ->latest()
            ->get();
    }

    public function getPaginated(array $filters = []): LengthAwarePaginator
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return new \Illuminate\Pagination\LengthAwarePaginator(
                items: [],
                total: 0,
                perPage: $filters['per_page'] ?? 20,
                currentPage: 1,
            );
        }

        $query = $this->baseQuery($user, $companyId);

        if (! empty($filters['type'])) {
            $query->where('data->type', $filters['type']);
        }

        if (array_key_exists('is_read', $filters) && $filters['is_read'] !== null) {
            $filters['is_read'] ? $query->read() : $query->unread();
        }

        return $query
            ->latest()
            ->paginate($filters['per_page'] ?? 20);
    }

    public function markAsRead(Model $notification): bool
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        $this->assertOwnership($notification, $user, $companyId);

        return $notification->markAsRead();
    }

    public function markAllAsRead(): int
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return 0;
        }

        return $this->baseQuery($user, $companyId)
            ->unread()
            ->update(['read_at' => now()]);
    }

    public function deleteOne(Model $notification): bool
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        $this->assertOwnership($notification, $user, $companyId);

        return $notification->delete();
    }

    public function deleteMultiple(array $ids): int
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId || empty($ids)) {
            return 0;
        }

        $ownedIds = $this->baseQuery($user, $companyId)
            ->whereIn('id', $ids)
            ->pluck('id');

        if ($ownedIds->isEmpty()) {
            return 0;
        }

        return Notification::query()
            ->whereIn('id', $ownedIds)
            ->delete();
    }

    public function sendToUser(
        User $user,
        string $type,
        string $title,
        ?string $message   = null,
        ?string $actionUrl = null,
    ): Notification {
        $companyId = $user->current_company_id ?? $user->company_id
            ?? throw new BusinessRuleException('لا يمكن تحديد الشركة للمستخدم المُستهدَف', 422);

        return Notification::create([
            'company_id'      => $companyId,
            'type'            => Notification::class,
            'notifiable_type' => get_class($user),
            'notifiable_id'   => $user->id,
            'data'            => [
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'action_url' => $actionUrl,
            ],
        ]);
    }

    public function notify(
        string $type,
        string $title,
        ?string $message   = null,
        ?string $actionUrl = null,
    ): ?Notification {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            return null;
        }

        return Notification::create([
            'company_id'      => $companyId,
            'type'            => Notification::class,
            'notifiable_type' => get_class($user),
            'notifiable_id'   => $user->id,
            'data'            => [
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'action_url' => $actionUrl,
            ],
        ]);
    }

    public function success(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('success', $title, $message, $actionUrl);
    }

    public function error(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('error', $title, $message, $actionUrl);
    }

    public function warning(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('warning', $title, $message, $actionUrl);
    }

    public function info(string $title, ?string $message = null, ?string $actionUrl = null): ?Notification
    {
        return $this->notify('info', $title, $message, $actionUrl);
    }

    private function baseQuery(User $user, int $companyId): Builder
    {
        return Notification::query()
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id',   $user->id)
            ->where('company_id',      $companyId);
    }

    private function resolveCurrentCompanyId(): ?int
    {
        $user = auth()->user();

        return $user?->current_company_id ?? $user?->company_id;
    }

    private function assertOwnership(Model $notification, ?User $user, ?int $companyId): void
    {
        if (
            ! $user
            || ! $companyId
            || $notification->notifiable_id   != $user->id
            || $notification->notifiable_type !== get_class($user)
            || $notification->company_id      != $companyId
        ) {
            throw new BusinessRuleException('ليس لديك صلاحية على هذا الإشعار', 403);
        }
    }
}
