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

    public function getValue(Request $request, string $key): JsonResponse
    {
        try {
            $value = $this->settingService->getValue($key);
            return $this->successResponse(['key' => $key, 'value' => $value]);
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