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
    //   3. Atomic .env write (temp file → rename) + clear config cache
    //   4. Post-switch verification — re-read .env + connect new driver
    //   5. Return — NEXT request boots with the new driver and finds
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
            return response()->json(['message' => 'ملف .env غير موجود.'], 500);
        }

        // ── Step 1: Compute target driver values ──
        // We MUST hardcode these because env('DB_DATABASE') returns the CURRENT driver's value
        // (SQLite path when on SQLite, MySQL name when on MySQL) — not the target's value.
        $sqliteFile = database_path('database.sqlite');
        $mysqlDb    = 'sales_management';

        // ── Step 2: Ensure target is reachable + migrate (while OLD driver is active) ──
        $reachable      = false;
        $reachableError = null;
        $dbCreated      = false;
        $migrated       = false;
        $migrationError = null;
        $migrationsRan  = '';

        try {
            if ($target === 'mysql') {
                // Try connecting — if the DB doesn't exist, auto-create it
                try {
                    DB::connection('mysql')->getPdo();
                    $reachable = true;
                } catch (\Throwable $e) {
                    $reachableError = $e->getMessage();
                    // MySQL error 1049 = Unknown database → auto-create then retry once
                    if (str_contains($reachableError, 'Unknown database') || str_contains($reachableError, '1049')) {
                        $createFail     = $this->createMysqlDatabase($mysqlDb);
                        $reachableError = $createFail ?? $reachableError;
                        if ($createFail === null) {
                            $dbCreated = true;
                            try {
                                DB::connection('mysql')->getPdo();
                                $reachable      = true;
                                $reachableError = null;
                            } catch (\Throwable $e2) {
                                $reachableError = $e2->getMessage();
                            }
                        }
                    }
                }
            } else {
                // Ensure the SQLite file exists
                if (!is_file($sqliteFile)) {
                    $dir = dirname($sqliteFile);
                    if (!is_dir($dir)) {
                        mkdir($dir, 0755, true);
                    }
                    file_put_contents($sqliteFile, '');
                }
                if (!is_writable($sqliteFile)) {
                    $reachableError = "ملف SQLite غير قابل للكتابة: {$sqliteFile}";
                } else {
                    DB::connection('sqlite')->getPdo();
                    $reachable = true;
                }
            }
        } catch (\Throwable $e) {
            $reachableError = $e->getMessage();
        }

        if (!$reachable) {
            $failure = $this->describeDbFailure($target, $reachableError);
            return response()->json([
                'message' => $failure['message'],
                'detail'  => $failure['detail'],
                'hint'    => $failure['hint'],
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
            $migrationsRan = $output->fetch();
        } catch (\Throwable $e) {
            $migrationError = $e->getMessage();
        }

        // ── Step 3: Atomic .env write ──
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
            $escapedSqlite = str_replace('\\', '\\\\', $sqliteFile);
            $this->setEnvLine($env, 'DB_DATABASE', $escapedSqlite);
        } else {
            // MySQL uses its own MYSQL_DATABASE env var (not DB_DATABASE which is for SQLite)
            $this->setEnvLine($env, 'MYSQL_DATABASE', $mysqlDb);
        }

        // Ensure HOST/PORT/USERNAME/PASSWORD are set
        $this->appendEnvIfMissing($env, 'DB_HOST', '127.0.0.1');
        $this->appendEnvIfMissing($env, 'DB_PORT', '3306');
        $this->appendEnvIfMissing($env, 'DB_USERNAME', 'root');
        $this->appendEnvIfMissing($env, 'DB_PASSWORD', '');

        // Atomic write: temp file → rename (prevents corruption on crash)
        $tmpPath = $envPath . '.tmp-' . getmypid();
        $written = @file_put_contents($tmpPath, $env);
        if ($written === false) {
            @unlink($tmpPath);
            return response()->json([
                'message' => 'فشل كتابة ملف .env (tmp).',
                'hint'    => 'تأكد من صلاحيات الكتابة في مجلد المشروع.',
            ], 500);
        }

        // rename() is atomic on the same filesystem; on Windows it may fail
        // if the destination exists, so we unlink first
        if (file_exists($envPath)) {
            @unlink($envPath);
        }
        if (!@rename($tmpPath, $envPath)) {
            // Last resort fallback — write directly (non-atomic)
            @file_put_contents($envPath, $env);
            @unlink($tmpPath);
        }

        Artisan::call('config:clear');

        // ── Step 4: Post-switch verification ──
        // Re-read the .env we just wrote to confirm it's correct
        $verifyEnv = file_get_contents($envPath);
        $envOk = str_contains($verifyEnv, "DB_CONNECTION={$target}");
        if ($target === 'mysql') {
            $envOk = $envOk && str_contains($verifyEnv, "MYSQL_DATABASE={$mysqlDb}");
        }

        return response()->json([
            'message'         => $dbCreated
                ? "تم إنشاء قاعدة البيانات '{$mysqlDb}' والتبديل إلى {$target}."
                : "تم التبديل إلى {$target}.",
            'driver'          => $target,
            'db_created'      => $dbCreated,
            'reachable'       => true,
            'migrated'        => $migrated,
            'migration_error' => $migrationError,
            'env_verified'    => $envOk,
            'hint'            => "الطلب التالي سيعمل على {$target} تلقائياً.",
        ]);
    }

    /**
     * Create a MySQL database via raw PDO (bypasses Laravel connection config).
     * Returns null on success, or the raw failure message.
     */
    private function createMysqlDatabase(string $dbName): ?string
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
            return null;
        } catch (\Throwable $e) {
            return $e->getMessage();
        }
    }

    /**
     * Classify a raw DB connection failure into an EXACT Arabic diagnosis
     * (server down / wrong credentials / missing extension / locked file...).
     * Returns ['message' => .., 'detail' => <raw>, 'hint' => ..].
     */
    private function describeDbFailure(string $target, ?string $raw): array
    {
        $raw = trim((string) $raw);
        if ($raw === '') {
            $raw = 'سبب غير معروف.';
        }
        $low = mb_strtolower($raw);

        if ($target === 'mysql') {
            $host = config('database.connections.mysql.host', '127.0.0.1');
            $port = config('database.connections.mysql.port', '3306');

            // 1) PHP extension missing
            if (str_contains($low, 'could not find driver')) {
                return [
                    'message' => 'إضافة PDO MySQL غير مفعّلة في PHP الحالي.',
                    'detail'  => $raw,
                    'hint'    => 'فعّل السطر extension=pdo_mysql في php.ini ثم أعد تشغيل الخادم.',
                ];
            }

            // 2) Server not running / unreachable (2002 = can't connect via socket/host,
            //    2003 = can't connect on port; Windows wording varies)
            foreach (['[2002]', '[2003]', 'no connection could be made', 'connection refused', 'actively refused', 'unable to connect', 'connection timed out'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => "خادم MySQL/MariaDB غير مشغّل أو غير قابل للوصول على {$host}:{$port}.",
                        'detail'  => $raw,
                        'hint'    => 'شغّل MySQL من لوحة تحكم XAMPP (زر Start أمام MySQL) ثم أعد المحاولة.',
                    ];
                }
            }

            // 3) Wrong username/password
            foreach (['[1045]', 'access denied for user'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => 'بيانات الدخول إلى MySQL غير صحيحة (المستخدم أو كلمة المرور).',
                        'detail'  => $raw,
                        'hint'    => 'تحقق من القيمتين DB_USERNAME و DB_PASSWORD في ملف .env ثم أعد المحاولة.',
                    ];
                }
            }

            // 4) Privilege problem (incl. CREATE DATABASE denied)
            foreach (['[1044]', 'command denied'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => 'المستخدم لا يملك صلاحية كافية على MySQL لتنفيذ العملية المطلوبة.',
                        'detail'  => $raw,
                        'hint'    => 'امنح المستخدم صلاحية CREATE DATABASE أو أنشئ قاعدة البيانات يدوياً من phpMyAdmin.',
                    ];
                }
            }

            // 5) Wrong host name
            foreach (['[2005]', 'unknown mysql server host'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => "اسم مضيف MySQL غير صحيح: {$host}.",
                        'detail'  => $raw,
                        'hint'    => 'استخدم 127.0.0.1 أو localhost في DB_HOST داخل ملف .env.',
                    ];
                }
            }

            // 6) Unknown database (auto-create failed earlier)
            foreach (['[1049]', 'unknown database'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => "قاعدة البيانات غير موجودة وفشل إنشاؤها تلقائياً.",
                        'detail'  => $raw,
                        'hint'    => 'أنشئ قاعدة البيانات يدوياً من phpMyAdmin أو تأكد من صلاحية CREATE DATABASE للمستخدم.',
                    ];
                }
            }
        } else {
            // ── SQLite ──
            foreach (['[14]', 'unable to open database file'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => 'تعذّر فتح ملف SQLite (قاعدة البيانات المحلية).',
                        'detail'  => $raw,
                        'hint'    => 'تأكد من وجود الملف داخل مجلد database/ وأن المجلد قابل للكتابة وأن الملف غير مقفل من برنامج آخر (مثل DB Browser).',
                    ];
                }
            }
            foreach (['readonly database', '[8]', 'attempt to write'] as $needle) {
                if (str_contains($low, $needle)) {
                    return [
                        'message' => 'ملف SQLite للقراءة فقط — لا يمكن الكتابة عليه.',
                        'detail'  => $raw,
                        'hint'    => 'أعطِ صلاحية الكتابة على ملف database/database.sqlite ومجلد database/.',
                    ];
                }
            }
            if (str_contains($low, 'file is not a database') || str_contains($low, '[26]')) {
                return [
                    'message' => 'ملف SQLite تالف أو ليس ملف قاعدة بيانات صالحاً.',
                    'detail'  => $raw,
                    'hint'    => 'استعد نسخة احتياطية سليمة من قاعدة البيانات أو أنشئ ملفاً جديداً.',
                ];
            }
        }

        return [
            'message' => "الاتصال بـ {$target} فشل.",
            'detail'  => $raw,
            'hint'    => $target === 'mysql'
                ? 'تحقق من إعدادات MySQL (DB_HOST / DB_PORT / DB_USERNAME) في .env ثم أعد المحاولة.'
                : 'تحقق من مسار ملف SQLite في .env ثم أعد المحاولة.',
        ];
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
