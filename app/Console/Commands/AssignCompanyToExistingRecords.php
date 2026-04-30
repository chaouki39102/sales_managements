<?php
// app/Console/Commands/AssignCompanyToExistingRecords.php
namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssignCompanyToExistingRecords extends Command
{
    protected $signature = 'tenancy:assign
                            {--company-id= : معرف الشركة الافتراضية}
                            {--create-default : إنشاء شركة افتراضية إذا لم توجد}
                            {--dry-run : عرض ما سيتم دون تنفيذ}';

    protected $description = 'تعيين company_id لجميع السجلات الحالية';

    private array $tables = [
        'products', 'product_packagings', 'product_prices',
        'quantity_discounts', 'product_lots', 'stock_movements',
        'commercial_documents', 'commercial_document_lines',
        'parties', 'warehouses', 'fiscal_years', 'payments',
        'expenses', 'treasury_accounts', 'opening_balances_stock',
        'opening_balances_parties', 'numbering_series', 'checks',
    ];

    public function handle(): int
    {
        $companyId = $this->resolveCompanyId();

        if (! $companyId) {
            $this->error('لم يتم تحديد شركة. استخدم --company-id أو --create-default');
            return Command::FAILURE;
        }

        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('وضع المعاينة — لن يتم تغيير أي بيانات');
        }

        $this->info("سيتم تعيين company_id = {$companyId} لجميع السجلات بدون شركة");
        $this->newLine();

        DB::transaction(function () use ($companyId, $isDryRun) {
            foreach ($this->tables as $table) {
                $this->processTable($table, $companyId, $isDryRun);
            }

            $this->linkUsersToCompany($companyId, $isDryRun);
        });

        $this->newLine();
        $this->info('✅ اكتمل بنجاح!');

        return Command::SUCCESS;
    }

    private function resolveCompanyId(): ?int
    {
        if ($id = $this->option('company-id')) {
            return (int) $id;
        }

        if ($this->option('create-default')) {
            $company = Company::firstOrCreate(
                ['slug' => 'default'],
                ['name' => 'الشركة الافتراضية', 'is_active' => true]
            );
            $this->info("الشركة الافتراضية: [{$company->id}] {$company->name}");
            return $company->id;
        }

        return null;
    }

    private function processTable(string $table, int $companyId, bool $isDryRun): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'company_id')) {
            $this->warn("  ⚠ جدول '{$table}' غير موجود أو بدون company_id — تجاهل");
            return;
        }

        $count = DB::table($table)->whereNull('company_id')->count();

        if ($count === 0) {
            $this->line("  ✓ {$table}: جميع السجلات لديها company_id");
            return;
        }

        if (! $isDryRun) {
            DB::table($table)->whereNull('company_id')->update(['company_id' => $companyId]);
        }

        $this->info("  → {$table}: تم تحديث {$count} سجل" . ($isDryRun ? ' (معاينة)' : ''));
    }

    private function linkUsersToCompany(int $companyId, bool $isDryRun): void
    {
        $users = User::doesntHave('companies')->get();

        foreach ($users as $user) {
            if (! $isDryRun) {
                $user->companies()->attach($companyId, ['is_default' => true]);
                $user->update(['company_id' => $companyId]);
            }
            $this->info("  → ربط المستخدم [{$user->id}] {$user->name} بالشركة");
        }
    }
}
