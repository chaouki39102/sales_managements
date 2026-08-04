<?php

namespace App\Console\Commands;

use App\Services\Portal\PortalOrderInstaller;
use Illuminate\Console\Command;

class InstallPortalOrders extends Command
{
    protected $signature = 'portal-orders:install {--company= : معرّف مؤسسة محددة (الكل إن لم يُعطَ)}';

    protected $description = 'تثبيت بيانات أنواع المستندات لطلبات بوابة الزبائن (CMD) لكل المؤسسات (idempotent)';

    public function handle(PortalOrderInstaller $installer): int
    {
        $companyId = $this->option('company');
        $companyId = $companyId !== null ? (int) $companyId : null;

        if ($companyId) {
            $installer->installForCompany($companyId);
            $this->info("تم تثبيت CMD للمؤسسة {$companyId}.");
        } else {
            $count = $installer->installAll();
            $this->info("تم تثبيت CMD لـ {$count} مؤسسة.");
        }

        return self::SUCCESS;
    }
}
