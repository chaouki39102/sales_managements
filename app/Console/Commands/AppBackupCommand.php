<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

/**
 * Create a database backup (consistent snapshot → gzip → optional encryption
 * → sha256 checksum) and prune old ones per retention.
 *
 *   php artisan app:backup
 *   php artisan app:backup --label=before-upgrade --keep=30
 */
class AppBackupCommand extends Command
{
    protected $signature = 'app:backup
        {--label= : Optional label appended to the filename}
        {--keep= : Override the retention count (config backup.retention_keep)}';

    protected $description = 'Backup the database to storage/app/backups (gzip + optional AES-256-GCM + sha256)';

    public function handle(BackupService $backups): int
    {
        try {
            $result = $backups->backup(
                $this->option('label'),
                $this->option('keep') !== null ? (int) $this->option('keep') : null
            );

            $this->info("✓ Backup created: {$result['file']} ({$this->humanSize($result['size'])})");
            $this->line("   driver: {$result['driver']}  ·  sha256: {$result['hash']}");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('✗ Backup failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    protected function humanSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $value = (float) $bytes;
        while ($value >= 1024 && $i < count($units) - 1) {
            $value /= 1024;
            $i++;
        }

        return round($value, 2).' '.$units[$i];
    }
}
