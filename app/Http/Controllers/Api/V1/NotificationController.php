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
