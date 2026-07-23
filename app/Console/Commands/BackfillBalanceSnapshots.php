<?php

namespace App\Console\Commands;

use App\Models\CommercialDocument;
use App\Services\CompanyContextService;
use App\Services\CommercialDocumentService;
use Illuminate\Console\Command;

class BackfillBalanceSnapshots extends Command
{
    protected $signature = 'app:backfill-balance-snapshots {--company= : Limit to a specific company ID}';

    protected $description = 'Backfill balance snapshots for existing documents created before the snapshot columns were added';

    public function handle(): int
    {
        $query = CommercialDocument::query()
            ->whereNull('previous_balance_snapshot')
            ->whereNotNull('party_id')
            ->orderBy('document_date', 'asc')
            ->orderBy('id', 'asc');

        if ($companyId = $this->option('company')) {
            $query->where('company_id', $companyId);
        }

        $total = $query->count();

        if ($total === 0) {
            $this->info('No documents need backfilling.');
            return self::SUCCESS;
        }

        $this->info("Found {$total} documents to backfill.");

        $service = app(CommercialDocumentService::class);
        $totalProcessed = 0;
        $totalFailed = 0;
        $query->chunk(100, function ($documents) use ($service, &$totalProcessed, &$totalFailed) {
            foreach ($documents as $doc) {
                try {
                    app(CompanyContextService::class)->set($doc->company_id);
                    $service->persistBalanceSnapshots($doc);
                    $totalProcessed++;
                } catch (\Throwable $e) {
                    $this->error("Failed doc#{$doc->id}: {$e->getMessage()}");
                    $totalFailed++;
                }
            }
            $this->newLine();
            $this->output->write("\r  Progress: {$totalProcessed}/" . ($totalProcessed + $totalFailed));
        });

        $this->newLine(2);
        $this->info("Done. Processed: {$totalProcessed}, Failed: {$totalFailed}");

        return $totalFailed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
