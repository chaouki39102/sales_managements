<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends BaseApiController
{
    protected string $resourceName = 'notification';
    protected ?string $resourceClass = NotificationResource::class;

    public function __construct(private NotificationService $notificationService)
    {
        parent::__construct();
    }

    public function unread(Request $request): JsonResponse
    {
        try {
            $notifications = $this->notificationService->getUnread();
            return $this->successResponse(
                NotificationResource::collection($notifications),
                'تم جلب الإشعارات غير المقروءة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unread');
        }
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        try {
            $notification = $this->notificationService->findById($id);
            $this->notificationService->markAsRead($notification);
            return $this->successResponse(
                new NotificationResource($notification->fresh()),
                'تم تعليم الإشعار كمقروء'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAsRead');
        }
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
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