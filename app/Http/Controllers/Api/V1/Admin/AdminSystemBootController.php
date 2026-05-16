<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Database\Seeders\GlobalRolesAndPermissionsSeeder;
use Database\Seeders\WilayaCommuneSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AdminSystemBootController
 * ══════════════════════════════════════════════════════════════════
 * يُستخدم في مودال الإعداد الأول للسوبر أدمن (SystemBootModal)
 *
 * Routes (تحت middleware super.admin):
 *   GET  /api/v1/admin/system/status          ← حالة النظام
 *   POST /api/v1/admin/system/boot            ← تثبيت كامل دفعة واحدة
 *   POST /api/v1/admin/system/boot/wilayas    ← ولايات + بلديات فقط
 *   POST /api/v1/admin/system/boot/permissions← صلاحيات + super-admin فقط
 * ══════════════════════════════════════════════════════════════════
 */
class AdminSystemBootController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // GET /api/v1/admin/system/status
    // يُعيد حالة كل مكوّن عالمي — الواجهة تقرأها وتعرض ما يلزم
    // ─────────────────────────────────────────────────────────────
    public function status(): JsonResponse
    {
        $wilayasCount     = DB::table('wilayas')->count();
        $communesCount    = DB::table('communes')->count();
        $permissionsCount = \Spatie\Permission\Models\Permission::whereNull('company_id')->count();
        $superAdminRole   = \Spatie\Permission\Models\Role::where('name', 'super-admin')
                                ->whereNull('company_id')->exists();
        $superAdminUser   = \App\Models\User::whereHas('roles', fn($q) =>
                                $q->where('name', 'super-admin')->whereNull('company_id')
                            )->exists();

        $isReady = $wilayasCount >= 48
                && $communesCount > 0
                && $permissionsCount > 0
                && $superAdminRole
                && $superAdminUser;

        return response()->json([
            'is_ready'    => $isReady,
            'components'  => [
                [
                    'key'     => 'wilayas',
                    'label'   => 'الولايات والبلديات',
                    'icon'    => 'ti-map-pin',
                    'done'    => $wilayasCount >= 48,
                    'count'   => "{$wilayasCount} ولاية / {$communesCount} بلدية",
                ],
                [
                    'key'     => 'permissions',
                    'label'   => 'الصلاحيات العالمية',
                    'icon'    => 'ti-shield-check',
                    'done'    => $permissionsCount > 0,
                    'count'   => "{$permissionsCount} صلاحية",
                ],
                [
                    'key'     => 'super_admin_role',
                    'label'   => 'دور مدير النظام',
                    'icon'    => 'ti-crown',
                    'done'    => $superAdminRole,
                    'count'   => $superAdminRole ? 'مُعدّ' : 'غير موجود',
                ],
                [
                    'key'     => 'super_admin_user',
                    'label'   => 'حساب مدير النظام',
                    'icon'    => 'ti-user-shield',
                    'done'    => $superAdminUser,
                    'count'   => $superAdminUser ? 'مُعيَّن' : 'غير مُعيَّن',
                ],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot
    // تثبيت كل البيانات العالمية دفعة واحدة (idempotent)
    // ─────────────────────────────────────────────────────────────
    public function boot(): JsonResponse
    {
        $results = [];

        try {
            // 1. ولايات + بلديات
            $results['wilayas'] = $this->runWilayas();

            // 2. صلاحيات + دور super-admin + تعيين للمستخدم
            $results['permissions'] = $this->runPermissions();

            return response()->json([
                'message' => 'تم إعداد النظام بنجاح',
                'results' => $results,
            ]);
        } catch (\Throwable $e) {
            Log::error('SystemBoot failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'فشل الإعداد: ' . $e->getMessage(),
                'results' => $results,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot/wilayas
    // ─────────────────────────────────────────────────────────────
    public function bootWilayas(): JsonResponse
    {
        try {
            $result = $this->runWilayas();
            return response()->json(['message' => 'تم تثبيت الولايات والبلديات', ...$result]);
        } catch (\Throwable $e) {
            Log::error('WilayaBoot failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot/permissions
    // ─────────────────────────────────────────────────────────────
    public function bootPermissions(): JsonResponse
    {
        try {
            $result = $this->runPermissions();
            return response()->json(['message' => 'تم تحديث الصلاحيات', ...$result]);
        } catch (\Throwable $e) {
            Log::error('PermissionBoot failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function runWilayas(): array
    {
        (new WilayaCommuneSeeder())->run();

        return [
            'wilayas'  => DB::table('wilayas')->count(),
            'communes' => DB::table('communes')->count(),
        ];
    }

    private function runPermissions(): array
    {
        app(GlobalRolesAndPermissionsSeeder::class)->run();

        return [
            'permissions' => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
        ];
    }
}
