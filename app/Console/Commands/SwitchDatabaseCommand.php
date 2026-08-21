<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Process\Process;

/**
 * Switch the active database driver without manually editing .env.
 *
 *   php artisan db:use          — show current driver
 *   php artisan db:use sqlite   — switch to SQLite + clear config cache
 *   php artisan db:use mysql    — switch to MySQL + clear config cache
 *   php artisan db:use --fresh  — also run migrate:fresh --seed after switching
 *
 * This command edits .env directly (the same as doing it by hand) and
 * clears the config cache so the new driver takes effect on the next request.
 *
 * WARNING: switching drivers does NOT migrate data between databases.
 * Each driver has its own separate database — use --fresh to re-run
 * migrations + seeds on the target database.
 */
class SwitchDatabaseCommand extends Command
{
    protected $signature = 'db:use
        {driver? : Target driver: sqlite or mysql (omit to show current)}
        {--fresh : Run migrate:fresh --seed after switching}';

    protected $description = 'Show or switch the active database driver';

    private array $supported = ['sqlite', 'mysql'];

    public function handle(): int
    {
        $driver = $this->argument('driver');

        if ($driver === null) {
            return $this->showCurrent();
        }

        $driver = strtolower($driver);

        if (! in_array($driver, $this->supported, true)) {
            $this->error("Unsupported driver: \"{$driver}\". Supported: " . implode(', ', $this->supported));
            return 1;
        }

        $current = config('database.default');

        if ($current === $driver) {
            $this->info("Already using [{$driver}]. Nothing to change.");
            return 0;
        }

        $envPath = base_path('.env');

        if (! file_exists($envPath)) {
            $this->error('.env file not found.');
            return 1;
        }

        // ── Ensure target DB exists ──
        if ($driver === 'mysql') {
            $mysqlDb = 'sales_management';
            try {
                \Illuminate\Support\Facades\DB::connection('mysql')->getPdo();
                $this->line("  MySQL database '{$mysqlDb}' exists.");
            } catch (\Throwable $e) {
                if (str_contains($e->getMessage(), 'Unknown database') || str_contains($e->getMessage(), '1049')) {
                    $this->line("  MySQL database '{$mysqlDb}' not found — creating...");
                    if ($this->createMysqlDatabase($mysqlDb)) {
                        $this->info("  Created database '{$mysqlDb}'.");
                    } else {
                        $this->error("  Failed to create database '{$mysqlDb}'.");
                        $this->error("  Make sure MySQL is running and root user has CREATE DATABASE privilege.");
                        return 1;
                    }
                } else {
                    $this->error("  MySQL connection failed: {$e->getMessage()}");
                    $this->error("  Make sure MySQL is running on "
                        . config('database.connections.mysql.host') . ':'
                        . config('database.connections.mysql.port'));
                    return 1;
                }
            }
        } elseif ($driver === 'sqlite') {
            $sqliteFile = database_path('database.sqlite');
            if (! file_exists($sqliteFile)) {
                $dir = dirname($sqliteFile);
                if (! is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                file_put_contents($sqliteFile, '');
                $this->line("  Created {$sqliteFile}");
            }
        }

        // ── Backup + write .env atomically ──
        $backupPath = $envPath . '.bak-' . date('Ymd-His');
        @copy($envPath, $backupPath);
        $this->line("  Backup saved: {$backupPath}");

        $env = file_get_contents($envPath);

        // Replace DB_CONNECTION line (handle commented-out)
        if (preg_match('/^#[ \t]*DB_CONNECTION=/m', $env)) {
            $env = preg_replace('/^#[ \t]*DB_CONNECTION=.*/m', "DB_CONNECTION={$driver}", $env);
        } else {
            $env = preg_replace('/^DB_CONNECTION=.*/m', "DB_CONNECTION={$driver}", $env);
        }

        // Set DB_DATABASE for the target driver
        if ($driver === 'mysql') {
            $this->setEnvLine($env, 'DB_HOST', '127.0.0.1');
            $this->setEnvLine($env, 'DB_PORT', '3306');
            $this->setEnvLine($env, 'MYSQL_DATABASE', 'sales_management');
            $this->setEnvLine($env, 'DB_USERNAME', 'root');
            $this->setEnvLine($env, 'DB_PASSWORD', '');
        } elseif ($driver === 'sqlite') {
            $sqliteFile = str_replace('\\', '\\\\', database_path('database.sqlite'));
            $this->setEnvLine($env, 'DB_DATABASE', $sqliteFile);
        }

        // Atomic write: temp → rename
        $tmpPath = $envPath . '.tmp-' . getmypid();
        $written = @file_put_contents($tmpPath, $env);
        if ($written === false) {
            $this->error("  Failed to write temp file {$tmpPath}");
            @unlink($tmpPath);
            return 1;
        }
        if (file_exists($envPath)) {
            @unlink($envPath);
        }
        if (! @rename($tmpPath, $envPath)) {
            @file_put_contents($envPath, $env);
            @unlink($tmpPath);
        }

        Artisan::call('config:clear', [], $this->getOutput());

        $this->newLine();
        $this->info("Switched: [{$current}] → [{$driver}]");
        $this->line("  Config cache cleared.");

        // ── Auto-migrate via subprocess ──
        // Must run in a subprocess because in-process Artisan::call('config:clear')
        // only clears the cache file — the running process still holds the OLD config.
        $this->newLine();
        $this->line("  Migrating [{$driver}]...");

        $phpBinary = PHP_BINARY;
        $artisanPath = base_path('artisan');

        if ($this->option('fresh')) {
            $this->warn("  Running migrate:fresh --seed...");
            $cmd = [$phpBinary, $artisanPath, 'migrate:fresh', '--seed', '--force'];
        } else {
            $this->line("  Running migrate...");
            $cmd = [$phpBinary, $artisanPath, 'migrate', '--force'];
        }

        // Inherit the parent's env but FORCE DB_CONNECTION to the target driver.
        // phpdotenv won't override env vars already set via putenv(), so the
        // parent's old DB_CONNECTION=sqlite would leak into the subprocess.
        $env = array_merge(getenv(), [
            'DB_CONNECTION' => $driver,
        ]);

        $process = new Process($cmd, null, $env);
        $process->setTimeout(null);
        $process->run(function ($type, $output) {
            $this->line('  ' . trim($output));
        });

        if ($process->getExitCode() !== 0) {
            $this->error("  Migration failed (exit {$process->getExitCode()}): {$process->getErrorOutput()}");
            $this->error("  The .env is set to [{$driver}] but tables may be missing.");
            $this->error("  Run: php artisan db:use {$driver} --fresh");
            return $process->getExitCode();
        }

        $this->newLine();
        $this->info("  Done. [{$driver}] is ready.");

        // Verify the new connection works
        try {
            \Illuminate\Support\Facades\DB::connection($driver)->getPdo();
            $this->info("  Connection verified.");
        } catch (\Throwable $e) {
            $this->warn("  Warning: could not verify connection: {$e->getMessage()}");
        }

        return 0;
    }

    /**
     * Set or uncomment a KEY=VALUE line in .env content (by reference).
     */
    private function setEnvLine(string &$env, string $key, string $value): void
    {
        if (preg_match('/^' . preg_quote($key, '/') . '=/m', $env)) {
            $env = preg_replace('/^' . preg_quote($key, '/') . '=.*/m', "{$key}={$value}", $env);
        } elseif (preg_match('/^#[ \t]*' . preg_quote($key, '/') . '=/m', $env)) {
            $env = preg_replace('/^#[ \t]*' . preg_quote($key, '/') . '=.*/m', "{$key}={$value}", $env);
        } else {
            $env .= "\n{$key}={$value}";
        }
    }

    /**
     * Create a MySQL database via raw PDO.
     */
    private function createMysqlDatabase(string $dbName): bool
    {
        try {
            $host = config('database.connections.mysql.host', '127.0.0.1');
            $port = config('database.connections.mysql.port', '3306');
            $user = config('database.connections.mysql.username', 'root');
            $pass = config('database.connections.mysql.password', '');

            $pdo = new \PDO("mysql:host={$host};port={$port}", $user, $pass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);

            $dbNameEscaped = preg_replace('/[^a-zA-Z0-9_]/', '', $dbName);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbNameEscaped}` "
                . "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            $pdo = null;
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function showCurrent(): int
    {
        $driver = config('database.default');

        $this->info("Current driver: [{$driver}]");

        if ($driver === 'sqlite') {
            $path = config('database.connections.sqlite.database');
            $this->line("  Database: {$path}");
            $this->line("  Exists: " . (file_exists($path) ? 'yes' : 'NO — run migrate first'));
        } else {
            $host = config('database.connections.mysql.host');
            $port = config('database.connections.mysql.port');
            $name = config('database.connections.mysql.database');
            $this->line("  Host: {$host}:{$port}");
            $this->line("  Database: {$name}");
        }

        $this->newLine();
        $this->line("To switch:");
        $this->line("  php artisan db:use sqlite");
        $this->line("  php artisan db:use mysql");
        $this->line("  php artisan db:use mysql --fresh   (switch + migrate + seed)");

        return 0;
    }
}
