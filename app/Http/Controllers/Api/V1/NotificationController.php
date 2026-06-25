<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class NotificationController extends BaseApiController
{
    protected string  $resourceName  = 'notification';
    protected ?string $resourceClass = NotificationResource::class;

    public function __construct(private NotificationService $notificationService)
    {
        parent::__construct();
    }

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

            return response()->json([
                'status'  => 'success',
                'message' => 'تم جلب الإشعارات بنجاح',
                'timestamp' => Carbon::now()->toISOString(),
                'data'    => [
                    'data' => NotificationResource::collection($paginated->items()),
                    'meta' => [
                        'current_page'   => $paginated->currentPage(),
                        'last_page'      => $paginated->lastPage(),
                        'per_page'       => $paginated->perPage(),
                        'total'          => $paginated->total(),
                        'from'           => $paginated->firstItem(),
                        'to'             => $paginated->lastItem(),
                        'has_more_pages' => $paginated->hasMorePages(),
                        'is_first_page'  => $paginated->currentPage() === 1,
                        'is_last_page'   => $paginated->currentPage() === $paginated->lastPage(),
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function unread(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Notification::class);

            $notifications = $this->notificationService->getUnread();

            return response()->json([
                'status'  => 'success',
                'message' => 'تم جلب الإشعارات بنجاح',
                'timestamp' => Carbon::now()->toISOString(),
                'data'    => [
                    'data'         => NotificationResource::collection($notifications),
                    'unread_count' => $notifications->count(),
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unread');
        }
    }

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

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('update', Notification::class);

            $count = $this->notificationService->markAllAsRead();

            return response()->json([
                'status'  => 'success',
                'message' => 'تم تعليم جميع الإشعارات كمقروءة',
                'timestamp' => Carbon::now()->toISOString(),
                'data'    => ['updated_count' => $count],
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'markAllAsRead');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $resolved = $this->resolveRouteId($id);
            $notification = $this->notificationService->findById($resolved);

            $this->authorizeAction('delete', $notification);

            $this->notificationService->deleteOne($notification);

            return $this->successResponse(null, 'تم حذف الإشعار بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function deleteMultiple(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('delete', Notification::class);

            $validated = $request->validate([
                'ids'   => 'required|array|min:1|max:100',
                'ids.*' => 'required|string',
            ]);

            $deletedCount = $this->notificationService->deleteMultiple($validated['ids']);

            return response()->json([
                'status'  => 'success',
                'message' => "تم حذف {$deletedCount} إشعار بنجاح",
                'timestamp' => Carbon::now()->toISOString(),
                'data'    => ['deleted_count' => $deletedCount],
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deleteMultiple');
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
