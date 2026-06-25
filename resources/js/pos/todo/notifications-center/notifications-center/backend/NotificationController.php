<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationController
 *
 * Endpoints:
 *   GET    /notifications                 → index()           🆕
 *   GET    /notifications/unread          → unread()
 *   POST   /notifications/{id}/read       → markAsRead()
 *   POST   /notifications/read-all        → markAllAsRead()
 *   DELETE /notifications/{id}            → destroy()          🆕
 *   POST   /notifications/delete-multiple → deleteMultiple()   🆕
 *
 * ⚠️  Multi-tenancy:
 *  - findById يجلب الإشعار بدون tenant filter
 *  - الـ Policy و الـ Service يتحققان من company_id قبل أي تعديل/حذف
 */
class NotificationController extends BaseApiController
{
    protected string  $resourceName  = 'notification';
    protected ?string $resourceClass = NotificationResource::class;

    public function __construct(private NotificationService $notificationService)
    {
        parent::__construct();
    }

    // ── GET /notifications  🆕 ────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Notification::class);

            $validated = $request->validate([
                'type'     => 'nullable|string|in:success,error,warning,info',
                'is_read'  => 'nullable|boolean',
                'page'     => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $paginated = $this->notificationService->getPaginated([
                'type'     => $validated['type']     ?? null,
                'is_read'  => array_key_exists('is_read', $validated)
                    ? filter_var($validated['is_read'], FILTER_VALIDATE_BOOLEAN)
                    : null,
                'per_page' => $validated['per_page'] ?? 20,
            ]);

            return $this->successResponse(
                [
                    'data' => NotificationResource::collection($paginated->items()),
                    'meta' => [
                        'current_page'  => $paginated->currentPage(),
                        'last_page'     => $paginated->lastPage(),
                        'per_page'      => $paginated->perPage(),
                        'total'         => $paginated->total(),
                        'from'          => $paginated->firstItem(),
                        'to'            => $paginated->lastItem(),
                        'is_first_page' => $paginated->currentPage() === 1,
                        'is_last_page'  => $paginated->currentPage() === $paginated->lastPage(),
                    ],
                ],
                'تم جلب الإشعارات بنجاح',
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ── GET /notifications/unread ─────────────────────────────

    public function unread(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Notification::class);

            $notifications = $this->notificationService->getUnread();

            return $this->successResponse(
                [
                    'data'         => NotificationResource::collection($notifications),
                    'unread_count' => $notifications->count(),
                ],
                'تم جلب الإشعارات بنجاح',
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unread');
        }
    }

    // ── POST /notifications/{id}/read ─────────────────────────

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        try {
            $notification = $this->notificationService->findById($id);

            $this->authorizeAction('update', $notification);

            $this->notificationService->markAsRead($notification);

            return $this->successResponse(
                new NotificationResource($notification->fresh()),
                'تم تعليم الإشعار كمقروء',
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsRead');
        }
    }

    // ── POST /notifications/read-all ─────────────────────────

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('update', Notification::class);

            $count = $this->notificationService->markAllAsRead();

            return $this->successResponse(
                ['updated_count' => $count],
                'تم تعليم جميع الإشعارات كمقروءة',
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAllAsRead');
        }
    }

    // ── DELETE /notifications/{id}  🆕 ────────────────────────

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $notification = $this->notificationService->findById($id);

            $this->authorizeAction('delete', $notification);

            $this->notificationService->deleteOne($notification);

            return $this->successResponse(null, 'تم حذف الإشعار بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ── POST /notifications/delete-multiple  🆕 ───────────────

    public function deleteMultiple(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('delete', Notification::class);

            $validated = $request->validate([
                'ids'   => 'required|array|min:1|max:100',
                'ids.*' => 'required|string',
            ]);

            $deletedCount = $this->notificationService->deleteMultiple($validated['ids']);

            return $this->successResponse(
                ['deleted_count' => $deletedCount],
                "تم حذف {$deletedCount} إشعار بنجاح",
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deleteMultiple');
        }
    }

    // ── Required by BaseApiController ─────────────────────────

    protected function getService(): NotificationService
    {
        return $this->notificationService;
    }

    protected function getModelClass(): string
    {
        return Notification::class;
    }
}
