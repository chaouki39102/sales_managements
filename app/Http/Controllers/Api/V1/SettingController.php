<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\SettingResource;
use App\Services\SettingService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends BaseApiController
{
    protected string $resourceName = 'setting';
    protected ?string $resourceClass = SettingResource::class;

    public function __construct(private SettingService $settingService)
    {
        parent::__construct();
    }

    /**
     * تجاوز store() لاستخدام updateOrCreate بدلاً من create
     * ويتجاوز الـ Policy لأن إعداد المؤسسة مسموح لأي مستخدم مسجّل دخوله
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'key'   => 'required|string|max:150',
                'group' => 'nullable|string|max:100',
                'value' => 'nullable',
            ]);

            $setting = Setting::updateOrCreate(
                ['key' => $request->key],
                [
                    'value' => $request->value,
                    'group' => $request->group ?? 'general',
                ]
            );

            return $this->successResponse(
                new SettingResource($setting),
                'تم حفظ الإعداد بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    /**
     * جلب الإعدادات حسب المجموعة
     */
    public function byGroup(Request $request, string $group): JsonResponse
    {
        try {
            $settings = $this->settingService->getByGroup($group);
            return $this->successResponse(
                SettingResource::collection($settings),
                'تم جلب الإعدادات حسب المجموعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    /**
     * جلب قيمة إعداد بواسطة المفتاح
     * إذا لم يوجد المفتاح يُرجع null بدلاً من 500
     */
    public function getValue(Request $request, string $key): JsonResponse
    {
        try {
            $setting = Setting::where('key', $key)->first();

            // ← إرجاع مباشر بدون Resource
            return $this->successResponse([
                'key'   => $key,
                'value' => $setting?->value,
            ]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'getValue');
        }
    }

    protected function getService(): SettingService
    {
        return $this->settingService;
    }

    protected function getModelClass(): string
    {
        return Setting::class;
    }
}
