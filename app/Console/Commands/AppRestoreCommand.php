<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Restore the database from a verified backup file in storage/app/backups.
 *
 *   php artisan app:restore --file=backup-2026-08-08-170556-smoke.sqlite.gz
 *   php artisan app:restore --file=backup-....sqlite.gz.enc --yes   (skip the confirm prompt)
 *
 * Before restoring, a fresh safety backup of the CURRENT database is created
 * (so a bad restore is always recoverable). The restore refuses to run on a
 * file whose sha256 checksum does not match, or on an encrypted file that
 * cannot be decrypted, or without explicit confirmation.
 */
class AppRestoreCommand extends Command
{
    protected $signature = 'app:restore
        {--file= : Backup filename inside storage/app/backups (required)}
        {--yes : Skip the confirmation prompt}';

    protected $description = 'Restore the database from a verified backup (current DB is overwritten)';

    public function handle(BackupService $backups): int
    {
        $file = (string) $this->option('file');

        if ($file === '') {
            $this->error('✗ Missing required option: --file=<backup name>');
            $this->line('   Available backups:');

            foreach ($backups->list() as $backup) {
                $this->line('     - '.$backup['name']);
            }

            return self::INVALID;
        }

        try {
            $backups->verify($file);
        } catch (Throwable $e) {
            $this->error('✗ Backup rejected: '.$e->getMessage());

            return self::FAILURE;
        }

        $info = $backups->verify($file);

        if (!$this->option('yes')) {
            $this->line('Backup to restore:');
            $this->line("  file     : {$file}");
            $this->line('  size     : '.$this->humanSize($info['size']));
            $this->line('  sha256   : '.$info['hash']);

            if (!$this->confirm('⚠  This will OVERWRITE the current database with the backup. Continue?', false)) {
                $this->info('Restore cancelled.');

                return self::SUCCESS;
            }
        }

        try {
            $safety = $backups->backup('pre-restore');
            $this->line("✓ Safety backup of the current database: {$safety['file']}");

            $safetyCopy = $backups->restore($file, true);

            $this->info('✓ Database restored from '.$file.'.');
            if ($safetyCopy !== '') {
                $this->line('   Previous database kept at: '.$safetyCopy);
            }
            $this->line('   Application cache has been flushed.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('✗ Restore failed: '.$e->getMessage());

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
