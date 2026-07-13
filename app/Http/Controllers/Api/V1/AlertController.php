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

    public function unread(): JsonResponse
    {
        try {
            $companyId = $this->extractId(request()->route('company'));
            $userId = auth()->id();
            $alerts = $this->alertEngine->getUnreadAlerts($companyId, $userId);
            $count  = $this->alertEngine->getUnreadCount($companyId, $userId);

            return response()->json([
                'alerts' => $alerts,
                'unread_count' => $count,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function all(): JsonResponse
    {
        try {
            $companyId = $this->extractId(request()->route('company'));
            $userId = auth()->id();
            $alerts = $this->alertEngine->getAllAlerts($companyId, $userId);

            return response()->json($alerts);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function markAsRead(int $alertId): JsonResponse
    {
        try {
            $this->alertEngine->markAlertAsRead($alertId);
            return response()->json(['message' => 'تم تعليم التنبيه كمقروء']);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function markAllAsRead(): JsonResponse
    {
        try {
            $companyId = $this->extractId(request()->route('company'));
            $userId = auth()->id();
            $this->alertEngine->markAllAsRead($companyId, $userId);
            return response()->json(['message' => 'تم تعليم الكل كمقروء']);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function count(): JsonResponse
    {
        try {
            $companyId = $this->extractId(request()->route('company'));
            $userId = auth()->id();
            $count  = $this->alertEngine->getUnreadCount($companyId, $userId);
            return response()->json(['count' => $count]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function runDaily(): JsonResponse
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
