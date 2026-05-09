<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Models\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AdminActivityController
 *
 * يعرض سجل الأنشطة (Audit Log) على مستوى النظام لـ Super Admin.
 */
class AdminActivityController extends Controller
{
    use ApiResponders;

    /**
     * عرض قائمة الأنشطة مع إمكانية البحث والتصفية.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Audit::query()
            ->with(['user:id,name,email'])
            ->latest('created_at');

        // فلترة حسب الحدث (event)
        if ($event = $request->get('event')) {
            $query->where('event', $event);
        }

        // فلترة حسب نوع الكيان (auditable_type)
        if ($auditableType = $request->get('auditable_type')) {
            $query->where('auditable_type', 'like', "%{$auditableType}%");
        }

        // فلترة حسب المستخدم (user_id)
        if ($userId = $request->get('user_id')) {
            $query->where('user_id', $userId);
        }

        // بحث عام في old_values / new_values
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('auditable_type', 'like', "%{$search}%")
                  ->orWhere('event', 'like', "%{$search}%")
                  ->orWhere('url', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $activities = $query->paginate($request->get('per_page', 20));

        return $this->successResponse($activities, 'سجل الأنشطة');
    }

    /**
     * عرض تفاصيل نشاط معين.
     */
    public function show($id): JsonResponse
    {
        $activity = Audit::with(['user:id,name,email'])->find($id);

        if (!$activity) {
            return $this->errorResponse('النشاط غير موجود', 404, 'NOT_FOUND');
        }

        return $this->successResponse($activity, 'تفاصيل النشاط');
    }
}
