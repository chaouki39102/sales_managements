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
 *   GET  /notifications/unread     → unread()
 *   POST /notifications/{id}/read  → markAsRead()
 *   POST /notifications/read-all   → markAllAsRead()
 *
 * ⚠️  Multi-tenancy:
 *  - findById يجلب الإشعار من قاعدة البيانات بدون tenant filter
 *  - الـ Policy و Service يتحققان من company_id قبل أي تعديل
 *  - لا يوجد أي حقن يدوي لـ company_id هنا — هذا دور الـ Service
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
            // findById يجلب الـ record — الـ Policy ستتحقق من الملكية + الشركة
            $notification = $this->notificationService->findById($id);

            $this->authorizeAction('update', $notification);

            // Service تتحقق مجدداً من company_id (defense in depth)
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
