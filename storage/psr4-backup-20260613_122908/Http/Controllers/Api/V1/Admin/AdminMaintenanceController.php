<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class AdminMaintenanceController extends Controller
{
    /**
     * حالة وضع الصيانة الحالية.
     */
    public function status(): JsonResponse
    {
        $down = app()->isDownForMaintenance();
        return response()->json([
            'data' => [
                'maintenance_mode' => $down,
                'message' => $down ? (Cache::get('maintenance.message') ?? 'النظام تحت الصيانة') : null,
            ]
        ]);
    }

    /**
     * تفعيل وضع الصيانة.
     */
    public function enable(): JsonResponse
    {
        $message = request()->input('message', 'النظام تحت الصيانة حالياً، يرجى المحاولة لاحقاً');
        Artisan::call('down', [
            '--message' => $message,
            '--retry' => 60,
        ]);
        return response()->json(['message' => 'تم تفعيل وضع الصيانة']);
    }

    /**
     * إلغاء وضع الصيانة.
     */
    public function disable(): JsonResponse
    {
        Artisan::call('up');
        return response()->json(['message' => 'تم إلغاء وضع الصيانة']);
    }

    /**
     * مسح الكاش العام.
     */
    public function clearCache(): JsonResponse
    {
        Artisan::call('optimize:clear');
        return response()->json(['message' => 'تم مسح الكاش بنجاح']);
    }
}
