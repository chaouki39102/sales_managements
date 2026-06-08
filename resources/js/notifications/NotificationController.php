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
 *   GET  /notifications/unread         → getUnread()
 *   POST /notifications/{id}/read      → markAsRead()
 *   POST /notifications/read-all       → markAllAsRead()
 */
class NotificationController extends BaseApiController
{
    protected string  $resourceName  = 'notification';
    protected ?string $resourceClass = NotificationResource::class;

    public function __construct(private NotificationService $notificationService)
    {
        parent::__construct();
    }

    // ── GET /notifications/unread ─────────────────────────────

    public function unread(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Notification::class);

            $notifications = $this->notificationService->getUnread();
            $unreadCount   = $notifications->count();

            return $this->successResponse(
                [
                    'data'         => NotificationResource::collection($notifications),
                    'unread_count' => $unreadCount,
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
