<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\WilayaCommuneSeeder;

/**
 * GlobalSeedController
 *
 * خاص بالـ Super Admin فقط. يزرع البيانات المشتركة بين جميع الشركات
 * (حالياً: الولايات والبلديات) مرة واحدة على مستوى النظام.
 */
class GlobalSeedController extends Controller
{
    public function __construct()
    {
        // التأكد من أن المستخدم Super Admin (أو نعتمد على middleware في الـ route)
        $this->middleware('role:super-admin');
    }

    /**
     * تشغيل سيدر عالمي (wilayas-communes فقط حالياً).
     */
    public function run(string $seeder): JsonResponse
    {
        if ($seeder !== 'wilayas-communes') {
            return response()->json(['message' => 'seeder غير معروف'], 404);
        }

        // الولاية الواحدة على الأقل تعني أن البيانات الجغرافية موجودة
        if (DB::table('wilayas')->exists()) {
            return response()->json(['message' => 'البيانات الجغرافية موجودة مسبقاً']);
        }

        try {
            DB::transaction(function () {
                (new WilayaCommuneSeeder())->run();
            });

            return response()->json(['message' => 'تم زرع البيانات الجغرافية (58 ولاية + البلديات) بنجاح']);
        } catch (\Throwable $e) {
            logger()->error('Global seed فشل: ' . $e->getMessage());
            return response()->json(['message' => 'فشل الزرع: ' . $e->getMessage()], 500);
        }
    }
}
