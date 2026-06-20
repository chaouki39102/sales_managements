<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\AlertEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends BaseApiController
{
    public function __construct(
        private AlertEngine $alertEngine,
    ) {
        parent::__construct();
    }

    public function unread($company): JsonResponse
    {
        try {
            $userId = auth()->id();
            $alerts = $this->alertEngine->getUnreadAlerts((int) $company, $userId);
            $count  = $this->alertEngine->getUnreadCount((int) $company, $userId);

            return response()->json([
                'alerts' => $alerts,
                'unread_count' => $count,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function all($company): JsonResponse
    {
        try {
            $userId = auth()->id();
            $alerts = $this->alertEngine->getAllAlerts((int) $company, $userId);

            return response()->json($alerts);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function markAsRead($company, int $alertId): JsonResponse
    {
        try {
            $this->alertEngine->markAlertAsRead($alertId);
            return response()->json(['message' => 'تم تعليم التنبيه كمقروء']);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function markAllAsRead($company): JsonResponse
    {
        try {
            $userId = auth()->id();
            $this->alertEngine->markAllAsRead((int) $company, $userId);
            return response()->json(['message' => 'تم تعليم الكل كمقروء']);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function count($company): JsonResponse
    {
        try {
            $userId = auth()->id();
            $count  = $this->alertEngine->getUnreadCount((int) $company, $userId);
            return response()->json(['count' => $count]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function runDaily($company): JsonResponse
    {
        try {
            $alerts = $this->alertEngine->runDailyChecks();
            return response()->json([
                'message' => 'تم تشغيل الفحص اليومي',
                'alerts_generated' => count($alerts),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
