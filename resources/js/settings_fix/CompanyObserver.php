<?php

namespace App\Observers;

use App\Models\Company;
use Database\Seeders\SettingsSeeder;
use Illuminate\Support\Facades\Log;

/**
 * CompanyObserver
 * عند إنشاء شركة جديدة → ينشئ الإعدادات الافتراضية تلقائياً
 */
class CompanyObserver
{
    public function created(Company $company): void
    {
        try {
            (new SettingsSeeder())->seedForCompany($company->id);
            Log::info('Default settings created for company', ['company_id' => $company->id]);
        } catch (\Throwable $e) {
            Log::error('Failed to create default settings for company', [
                'company_id' => $company->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }
}
