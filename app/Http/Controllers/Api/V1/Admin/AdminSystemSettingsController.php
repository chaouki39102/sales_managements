<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSystemSettingsController extends Controller
{
    protected string $cacheKey = 'system_settings';

    // ══════════════════════════════════════════════════════════
    // Database Driver — Current Status
    // ══════════════════════════════════════════════════════════
    public function dbStatus(): JsonResponse
    {
        $driver = config('database.default');

        $detail = match ($driver) {
            'mysql' => $this->mysqlDetail(),
            default => $this->sqliteDetail(),
        };

        return response()->json([
            'data' => array_merge([
                'current_driver' => $driver,
            ], $detail),
        ]);
    }

    private function mysqlDetail(): array
    {
        try {
            $pdo = DB::connection('mysql')->getPdo();
            $serverVersion = $pdo->query('SELECT VERSION()')->fetchColumn();
            return [
                'connected'    => true,
                'server'       => "MySQL/MariaDB $serverVersion",
                'host'         => config('database.connections.mysql.host') . ':' . config('database.connections.mysql.port'),
                'database'     => config('database.connections.mysql.database'),
                'pending_migrations' => $this->pendingMigrations('mysql'),
            ];
        } catch (\Throwable $e) {
            return [
                'connected'    => false,
                'server'       => null,
                'host'         => config('database.connections.mysql.host') . ':' . config('database.connections.mysql.port'),
                'database'     => config('database.connections.mysql.database'),
                'error'        => $e->getMessage(),
                'pending_migrations' => 0,
            ];
        }
    }

    private function sqliteDetail(): array
    {
        $path = config('database.connections.sqlite.database');
        $exists = is_file($path);

        return [
            'connected' => $exists,
            'path'      => $path,
            'writable'  => $exists && is_writable($path),
            'size'      => $exists ? round(filesize($path) / 1024, 1) . ' KB' : null,
            'pending_migrations' => $this->pendingMigrations('sqlite'),
        ];
    }

    private function pendingMigrations(string $driver): int
    {
        try {
            Artisan::call('migrate:status', [], $output = new \Symfony\Component\Console\Output\BufferedOutput());
            $out = $output->fetch();
            return preg_match_all('/\bPending\b/i', $out);
        } catch (\Throwable) {
            return -1;
        }
    }

    // ══════════════════════════════════════════════════════════
    // Database Driver — Switch
    //
    // CRITICAL ORDER:
    //   1. Validate + decide .env values BEFORE writing
    //   2. Ensure target DB file/connection exists + run migrations
    //      (current request is still on the OLD driver, so auth works)
    //   3. Write .env + clear config cache
    //   4. Return — NEXT request boots with the new driver and finds
    //      the tables we just migrated
    // ══════════════════════════════════════════════════════════
    public function switchDb(Request $request): JsonResponse
    {
        $data = $request->validate([
            'driver' => 'required|in:sqlite,mysql',
        ]);

        $target = $data['driver'];
        $current = config('database.default');

        if ($current === $target) {
            return response()->json(['message' => "قاعدة البيانات تعمل بالفعل عبر {$target}."]);
        }

        $envPath = base_path('.env');
        if (!is_file($envPath)) {
            return response()->json(['error' => 'ملف .env غير موجود.'], 500);
        }

        // ── Step 1: Compute the DB_DATABASE value for the target driver ──
        // We MUST hardcode these because env('DB_DATABASE') returns the CURRENT driver's value
        // (SQLite path when on SQLite, MySQL name when on MySQL) — not the target's value.
        $sqliteFile = database_path('database.sqlite');
        $mysqlDb    = 'sales_management';

        // ── Step 2: Ensure target is reachable + migrate (while OLD driver is active) ──
        $reachable      = false;
        $reachableError = null;
        $migrated       = false;
        $migrationError = null;

        try {
            if ($target === 'mysql') {
                DB::connection('mysql')->getPdo();
                $reachable = true;
            } else {
                // Ensure the SQLite file exists
                if (!is_file($sqliteFile)) {
                    file_put_contents($sqliteFile, '');
                }
                DB::connection('sqlite')->getPdo();
                $reachable = true;
            }
        } catch (\Throwable $e) {
            $reachableError = $e->getMessage();
        }

        if (!$reachable) {
            return response()->json([
                'error'  => "الاتصال بـ {$target} فشل.",
                'detail' => $reachableError,
            ], 500);
        }

        // Run migrations on the target NOW — the current request still uses
        // the OLD driver (auth already passed), so the target connection is free.
        try {
            $output = new \Symfony\Component\Console\Output\BufferedOutput();
            Artisan::call('migrate', [
                '--database' => $target,
                '--force'    => true,
            ], $output);
            $migrated = true;
        } catch (\Throwable $e) {
            $migrationError = $e->getMessage();
        }

        // ── Step 3: Write .env (now safe — migrations already ran) ──
        // Backup before any write
        $backupPath = $envPath . '.bak-' . date('Ymd-His');
        @copy($envPath, $backupPath);

        $env = file_get_contents($envPath);

        // DB_CONNECTION — uncomment if commented out
        if (preg_match('/^#[ \t]*DB_CONNECTION=/m', $env)) {
            $env = preg_replace('/^#[ \t]*DB_CONNECTION=.*/m', "DB_CONNECTION={$target}", $env);
        } else {
            $env = preg_replace('/^DB_CONNECTION=.*/m', "DB_CONNECTION={$target}", $env);
        }

        if ($target === 'sqlite') {
            // Quote Windows backslash paths
            $escapedSqlite = str_replace('\\', '\\\\', $sqliteFile);
            $this->setEnvLine($env, 'DB_DATABASE', $escapedSqlite);
        } else {
            // MySQL uses its own MYSQL_DATABASE env var (not DB_DATABASE which is for SQLite)
            $this->setEnvLine($env, 'MYSQL_DATABASE', $mysqlDb);
            $this->appendEnvIfMissing($env, 'MYSQL_DATABASE', $mysqlDb);
        }

        // Ensure HOST/PORT/USERNAME/PASSWORD are set
        $this->appendEnvIfMissing($env, 'DB_HOST', '127.0.0.1');
        $this->appendEnvIfMissing($env, 'DB_PORT', '3306');
        $this->appendEnvIfMissing($env, 'DB_USERNAME', 'root');
        $this->appendEnvIfMissing($env, 'DB_PASSWORD', '');

        file_put_contents($envPath, $env);
        Artisan::call('config:clear');

        return response()->json([
            'message'   => "تم التبديل إلى {$target}.",
            'driver'    => $target,
            'reachable' => true,
            'migrated'  => $migrated,
            'migration_error' => $migrationError,
        ]);
    }

    public function index(): JsonResponse
    {
        $settings = Cache::remember($this->cacheKey, 3600, function () {
            return Setting::whereNull('company_id')
                ->get()
                ->mapWithKeys(fn(Setting $s) => [$s->key => $s->getTypedValue()])
                ->toArray();
        });

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'allow_registration'  => 'nullable|boolean',
            'allow_new_companies' => 'nullable|boolean',
            'debug_mode'          => 'nullable|boolean',
            'public_api'          => 'nullable|boolean',
            'free_trial_days'     => 'nullable|integer|min:0',
            'free_max_users'      => 'nullable|integer|min:0',
            'starter_max_products'=> 'nullable|integer|min:0',
            'maintenance_mode'    => 'nullable|boolean',
            'maintenance_message' => 'nullable|string',
            'mail_mailer'         => 'nullable|string',
            'mail_host'           => 'nullable|string',
            'mail_port'           => 'nullable|string',
            'mail_username'       => 'nullable|string',
            'mail_password'       => 'nullable|string',
            'mail_encryption'     => 'nullable|string',
            'mail_from_address'   => 'nullable|email',
            'mail_from_name'      => 'nullable|string',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data as $key => $value) {
                if ($value === null) continue;

                $stored = match (true) {
                    is_bool($value)   => $value ? 'true' : 'false',
                    is_array($value)  => json_encode($value, JSON_UNESCAPED_UNICODE),
                    default           => (string) $value,
                };

                DB::table('settings')->updateOrInsert(
                    ['key' => $key, 'company_id' => null],
                    [
                        'value'       => $stored,
                        'group'       => $this->guessGroup($key),
                        'type'        => $this->guessType($value),
                        'is_public'   => false,
                        'is_editable' => true,
                        'updated_at'  => now(),
                    ]
                );
            }
        });

        Cache::forget($this->cacheKey);
        return response()->json(['message' => 'تم تحديث الإعدادات']);
    }

    private function guessGroup(string $key): string
    {
        return match (true) {
            str_starts_with($key, 'mail_') => 'mail',
            str_starts_with($key, 'free_') || str_starts_with($key, 'starter_') => 'plans',
            $key === 'allow_registration' || $key === 'allow_new_companies' || $key === 'public_api' => 'general',
            $key === 'debug_mode' => 'system',
            $key === 'maintenance_mode' || $key === 'maintenance_message' => 'maintenance',
            default => 'general',
        };
    }

    private function guessType(mixed $value): string
    {
        if (is_bool($value)) return 'boolean';
        if (is_int($value))  return 'integer';
        if (is_float($value)) return 'float';
        if (is_array($value)) return 'json';
        return 'string';
    }

    /**
     * Set or uncomment a KEY=VALUE line in .env content (by reference).
     * Handles commented-out lines (# DB_HOST=...) by uncommenting them.
     */
    private function setEnvLine(string &$env, string $key, string $value): void
    {
        // Already exists uncommented — replace
        if (preg_match('/^' . preg_quote($key, '/') . '=/m', $env)) {
            $env = preg_replace('/^' . preg_quote($key, '/') . '=.*/m', "{$key}={$value}", $env);
            return;
        }
        // Exists commented out — uncomment + replace
        if (preg_match('/^#[ \t]*' . preg_quote($key, '/') . '=/m', $env)) {
            $env = preg_replace('/^#[ \t]*' . preg_quote($key, '/') . '=.*/m', "{$key}={$value}", $env);
            return;
        }
        // Does not exist — append
        $env .= "\n{$key}={$value}";
    }

    /**
     * Append KEY=VALUE to .env if the key is not already set (even commented).
     */
    private function appendEnvIfMissing(string &$env, string $key, string $value): void
    {
        if (!preg_match('/^#?[ \t]*' . preg_quote($key, '/') . '=/m', $env)) {
            $env .= "\n{$key}={$value}";
        }
    }
}
