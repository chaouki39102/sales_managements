<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\CompanyRoleService;
use Illuminate\Console\Command;

class UpgradeCompanyRoles extends Command
{
    protected $signature = 'company:upgrade-roles {company? : معرّف مؤسسة محددة (الكل إن لم يُعطَ)}';

    protected $description = 'ترقية أدوار الشركات إلى المجموعة المعيارية (owner/manager/cashier/viewer) ونقل المستخدمين من الأدوار القديمة (idempotent)';

    public function handle(CompanyRoleService $roleService): int
    {
        $companyId = $this->argument('company');

        if ($companyId) {
            return $this->upgrade((int) $companyId, $roleService);
        }

        $companyIds = Company::pluck('id')->all();
        foreach ($companyIds as $id) {
            $this->upgrade((int) $id, $roleService);
        }

        return self::SUCCESS;
    }

    private function upgrade(int $companyId, CompanyRoleService $roleService): int
    {
        if (! Company::whereKey($companyId)->exists()) {
            $this->error("المؤسسة #{$companyId} غير موجودة.");

            return self::FAILURE;
        }

        $migrated = $roleService->migrateToStandardRoleSet($companyId);

        $this->line("المؤسسة #{$companyId}: " . json_encode($migrated, JSON_UNESCAPED_UNICODE));
        $this->info("تمت ترقية أدوار المؤسسة #{$companyId}.");

        return self::SUCCESS;
    }
}
