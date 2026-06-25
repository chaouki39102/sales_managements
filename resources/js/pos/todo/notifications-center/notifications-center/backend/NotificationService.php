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

/**
 * NotificationService
 *
 * ⚠️  Multi-tenancy:
 *  - كل استعلام مُصفَّى بـ company_id للشركة النشطة (current_company_id)
 *  - assertOwnership تتحقق من notifiable_id + company_id معاً
 *  - sendToUser يأخذ company_id صراحةً من الـ User المُستهدَف
 *  - deleteMultiple يتحقق من ownership على كل عنصر فردياً قبل الحذف
 */
class NotificationService extends BaseService
{
    protected string $model        = Notification::class;
    protected string $resourceName = 'notification';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ── Queries ───────────────────────────────────────────────

    /**
     * جلب الإشعارات غير المقروءة للمستخدم الحالي في الشركة النشطة فقط.
     */
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

    /**
     * جلب الإشعارات مُرقَّمة (paginated) مع فلاتر اختيارية.
     * مُصفَّى دائماً بـ notifiable_id + company_id (نفس عزل getUnread).
     *
     * @param  array{type?: string, is_read?: bool, per_page?: int} $filters
     */
    public function getPaginated(array $filters = []): LengthAwarePaginator
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId) {
            // Paginator فارغ بنفس الشكل المتوقَّع من الـ Frontend
            return new \Illuminate\Pagination\LengthAwarePaginator(
                items: [],
                total: 0,
                perPage: $filters['per_page'] ?? 20,
                currentPage: 1,
            );
        }

        $query = $this->baseQuery($user, $companyId);

        // فلتر النوع — يُقرأ من حقل JSON data->type
        if (! empty($filters['type'])) {
            $query->where('data->type', $filters['type']);
        }

        // فلتر حالة القراءة
        if (array_key_exists('is_read', $filters) && $filters['is_read'] !== null) {
            $filters['is_read'] ? $query->read() : $query->unread();
        }

        return $query
            ->latest()
            ->paginate($filters['per_page'] ?? 20);
    }

    // ── Mutations ─────────────────────────────────────────────

    /**
     * تعليم إشعار واحد كمقروء.
     * يتحقق من: notifiable_id + company_id معاً.
     *
     * @throws BusinessRuleException
     */
    public function markAsRead(Model $notification): bool
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        $this->assertOwnership($notification, $user, $companyId);

        return $notification->markAsRead();
    }

    /**
     * تعليم جميع إشعارات المستخدم الحالي في الشركة النشطة كمقروءة.
     */
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

    /**
     * حذف إشعار واحد — يتحقق من الملكية قبل الحذف.
     *
     * @throws BusinessRuleException
     */
    public function deleteOne(Model $notification): bool
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        $this->assertOwnership($notification, $user, $companyId);

        return $notification->delete();
    }

    /**
     * حذف عدة إشعارات دفعة واحدة.
     * ⚠️  يتحقق من ownership على **كل id فردياً** — لا حذف جماعي عشوائي
     * بحجة "كلها لنفس المستخدم"؛ يمنع تمرير IDs لا تخص المستخدم/الشركة.
     *
     * @param  string[] $ids
     * @return int عدد العناصر المحذوفة فعلياً
     */
    public function deleteMultiple(array $ids): int
    {
        $user      = auth()->user();
        $companyId = $this->resolveCurrentCompanyId();

        if (! $user || ! $companyId || empty($ids)) {
            return 0;
        }

        // نجلب فقط الإشعارات التي تخص هذا المستخدم في هذه الشركة من بين الـ IDs المُرسَلة
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

    // ── Sending ───────────────────────────────────────────────

    /**
     * إرسال إشعار لمستخدم بعينه.
     * company_id تُستخرج دائماً من الـ User المُستهدَف.
     */
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
            'type'            => Notification::class, // مطلوب بصيغة Laravel morph
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

    /**
     * إرسال إشعار للمستخدم المصادَق عليه في الشركة النشطة (اختصار).
     */
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

    // ── Shortcuts ─────────────────────────────────────────────

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

    // ── Private Helpers ───────────────────────────────────────

    /**
     * استعلام أساسي مُصفَّى بـ notifiable + company_id — تُستخدم كقاعدة
     * لكل من getUnread / getPaginated / markAllAsRead / deleteMultiple
     * لضمان نفس منطق العزل في كل مكان (DRY + أمان متّسق).
     */
    private function baseQuery(User $user, int $companyId): Builder
    {
        return Notification::query()
            ->where('notifiable_type', get_class($user))
            ->where('notifiable_id',   $user->id)
            ->where('company_id',      $companyId);
    }

    /**
     * يجلب company_id للشركة النشطة من المستخدم المصادَق عليه.
     */
    private function resolveCurrentCompanyId(): ?int
    {
        $user = auth()->user();

        return $user?->current_company_id ?? $user?->company_id;
    }

    /**
     * يتحقق أن الإشعار يخص المستخدم الحالي في نفس الشركة.
     * الفحص المزدوج: notifiable_id + company_id ← يمنع Cross-tenant access.
     *
     * @throws BusinessRuleException
     */
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
