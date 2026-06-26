<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSystemSettingsController extends Controller
{
    protected string $cacheKey = 'system_settings';

    public function index(): JsonResponse
    {
        $settings = Cache::remember($this->cacheKey, 3600, function () {
            return Setting::whereNull('company_id')
                ->get()
                ->mapWithKeys(fn(Setting $s) => [$s->key => $s->getTypedValue()])
                ->toArray();
        });

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'allow_registration'  => 'nullable|boolean',
            'allow_new_companies' => 'nullable|boolean',
            'debug_mode'          => 'nullable|boolean',
            'public_api'          => 'nullable|boolean',
            'free_trial_days'     => 'nullable|integer|min:0',
            'free_max_users'      => 'nullable|integer|min:0',
            'starter_max_products'=> 'nullable|integer|min:0',
            'maintenance_mode'    => 'nullable|boolean',
            'maintenance_message' => 'nullable|string',
            'mail_mailer'         => 'nullable|string',
            'mail_host'           => 'nullable|string',
            'mail_port'           => 'nullable|string',
            'mail_username'       => 'nullable|string',
            'mail_password'       => 'nullable|string',
            'mail_encryption'     => 'nullable|string',
            'mail_from_address'   => 'nullable|email',
            'mail_from_name'      => 'nullable|string',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data as $key => $value) {
                if ($value === null) continue;

                $stored = match (true) {
                    is_bool($value)   => $value ? 'true' : 'false',
                    is_array($value)  => json_encode($value, JSON_UNESCAPED_UNICODE),
                    default           => (string) $value,
                };

                DB::table('settings')->updateOrInsert(
                    ['key' => $key, 'company_id' => null],
                    [
                        'value'       => $stored,
                        'group'       => $this->guessGroup($key),
                        'type'        => $this->guessType($value),
                        'is_public'   => false,
                        'is_editable' => true,
                        'updated_at'  => now(),
                    ]
                );
            }
        });

        Cache::forget($this->cacheKey);
        return response()->json(['message' => 'تم تحديث الإعدادات']);
    }

    private function guessGroup(string $key): string
    {
        return match (true) {
            str_starts_with($key, 'mail_') => 'mail',
            str_starts_with($key, 'free_') || str_starts_with($key, 'starter_') => 'plans',
            $key === 'allow_registration' || $key === 'allow_new_companies' || $key === 'public_api' => 'general',
            $key === 'debug_mode' => 'system',
            $key === 'maintenance_mode' || $key === 'maintenance_message' => 'maintenance',
            default => 'general',
        };
    }

    private function guessType(mixed $value): string
    {
        if (is_bool($value)) return 'boolean';
        if (is_int($value))  return 'integer';
        if (is_float($value)) return 'float';
        if (is_array($value)) return 'json';
        return 'string';
    }
}
