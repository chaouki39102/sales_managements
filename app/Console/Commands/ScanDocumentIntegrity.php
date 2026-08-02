<?php

namespace App\Console\Commands;

use App\Models\CommercialDocument;
use App\Services\TransactionIntegrityService;
use Illuminate\Console\Command;

/**
 * Scan every stored transaction and report any that fail the money-integrity
 * recompute (line totals, document totals, discount, fiscal stamp, net-to-pay).
 *
 *   php artisan documents:integrity-scan
 *   php artisan documents:integrity-scan --company=1
 *   php artisan documents:integrity-scan --limit=50
 *
 * Read-only — never modifies data. Exit code is 1 when any unclean document is
 * found, so it can be used as a guard in CI / pre-backup routines.
 */
class ScanDocumentIntegrity extends Command
{
    protected $signature = 'documents:integrity-scan
        {--company= : Limit to a specific company ID}
        {--limit= : Stop after scanning this many documents}
        {--no-fail : Always exit 0 even when violations are found}';

    protected $description = 'Verify every stored transaction is mathematically clean (money integrity gate)';

    public function handle(TransactionIntegrityService $integrity): int
    {
        $query = CommercialDocument::query()->orderBy('document_date')->orderBy('id');

        if ($companyId = $this->option('company')) {
            $query->where('company_id', (int) $companyId);
        }

        $total = $query->count();

        if ($total === 0) {
            $this->info('No documents to scan.');
            return self::SUCCESS;
        }

        $this->info("Scanning {$total} documents…");

        $scanned   = 0;
        $unclean   = 0;
        $violation = 0;

        $query->chunkById(50, function ($documents) use ($integrity, &$scanned, &$unclean, &$violation) {
            foreach ($documents as $doc) {
                $docViolations = $integrity->violationsForDocument($doc);

                if (!empty($docViolations)) {
                    $unclean++;
                    $violation += count($docViolations);
                    $this->warn("  ⚠ {$doc->document_number} (id {$doc->id}, company {$doc->company_id}):");
                    foreach ($docViolations as $v) {
                        $this->warn("      - {$v}");
                    }
                }

                $scanned++;

                if ($limit = $this->option('limit')) {
                    if ($scanned >= (int) $limit) {
                        return false;
                    }
                }
            }
        });

        $this->line('');
        if ($unclean === 0) {
            $this->info("✓ {$scanned} transactions scanned — all clean and clear.");
            return self::SUCCESS;
        }

        $this->error("✗ {$unclean} of {$scanned} transactions are NOT clean ({$violation} violations).");
        $this->warn('These documents contain money fields that do not match their inputs — investigate before trusting the ledger.');

        return $this->option('no-fail') ? self::SUCCESS : self::FAILURE;
    }
}
