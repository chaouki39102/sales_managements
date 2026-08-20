<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

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

        $env = file_get_contents($envPath);

        // Replace DB_CONNECTION line
        $env = preg_replace('/^DB_CONNECTION=.*/m', "DB_CONNECTION={$driver}", $env);

        // Ensure DB_HOST/PORT/USERNAME/PASSWORD exist for MySQL targets
        if ($driver === 'mysql') {
            if (! preg_match('/^DB_HOST=/m', $env)) {
                $env .= "\nDB_HOST=127.0.0.1";
            }
            if (! preg_match('/^DB_PORT=/m', $env)) {
                $env .= "\nDB_PORT=3306";
            }
            if (! preg_match('/^DB_DATABASE=/m', $env)) {
                $env .= "\nDB_DATABASE=sales_management";
            }
            if (! preg_match('/^DB_USERNAME=/m', $env)) {
                $env .= "\nDB_USERNAME=root";
            }
            if (! preg_match('/^DB_PASSWORD=/m', $env)) {
                $env .= "\nDB_PASSWORD=";
            }
        }

        file_put_contents($envPath, $env);

        // Clear config cache so the new driver is picked up
        Artisan::call('config:clear', [], $this->getOutput());

        $this->newLine();
        $this->info("Switched: [{$current}] → [{$driver}]");
        $this->line("  Config cache cleared.");

        // Optionally run fresh migrations + seed
        if ($this->option('fresh')) {
            $this->newLine();
            $this->warn("Running migrate:fresh --seed on [{$driver}]...");

            if ($driver === 'sqlite') {
                // Ensure the SQLite file exists
                $dbPath = config('database.connections.sqlite.database');
                if ($dbPath && $dbPath !== ':memory:' && ! file_exists($dbPath)) {
                    touch($dbPath);
                    $this->line("  Created {$dbPath}");
                }
            }

            $exitCode = Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true], $this->getOutput());
            if ($exitCode !== 0) {
                $this->error('migrate:fresh failed. Check the output above.');
                return $exitCode;
            }
        } else {
            $this->newLine();
            $this->line("  Next steps:");
            if ($driver === 'sqlite') {
                $this->line("    php artisan migrate:fresh --seed");
            } else {
                $this->line("    php artisan migrate:fresh --seed");
            }
            $this->line("  Or re-run with --fresh to do it automatically:");
            $this->line("    php artisan db:use {$driver} --fresh");
        }

        return 0;
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
