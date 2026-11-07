<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

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
            // --database إلزامي: بدونه يُحصى الترحيل المعلق على الاتصال
            // الافتراضي الحالي لا على المشغّل المطلوب فتعرض الواجهة رقماً خاطئاً.
            Artisan::call('migrate:status', ['--database' => $driver], $output = new \Symfony\Component\Console\Output\BufferedOutput());
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

    // ══════════════════════════════════════════════════════════
    // Tailscale Funnel — Public Sharing Link (per machine)
    // ══════════════════════════════════════════════════════════
    public function funnelStatus(Request $request): JsonResponse
    {
        $cfg = $this->resolveFunnelConfig($request);
        $installed = is_file($cfg['cli_path']);
        $url = null;
        $raw = null;
        $running = false;
        $detail = null;

        if ($installed) {
            $result = $this->runTailscale([$cfg['cli_path'], 'funnel', 'status'], 20);
            $raw = trim($result['stdout'] . "\n" . $result['stderr']);
            $url = $this->extractFunnelUrl($result['stdout'] . "\n" . $result['stderr']);
            $running = $url !== null;
            if (!$result['ok'] && !$running) {
                $detail = $this->tailLines($raw, 6);
            }
        }

        // Keep the setting in sync when we can positively detect the URL.
        if ($url) {
            $this->storeSystemSetting('public_funnel_url', $url, 'sharing', 'string');
        }

        return response()->json([
            'data' => [
                'installed'         => $installed,
                'cli_path'          => $cfg['cli_path'],
                'app_port'          => $cfg['port'],
                'url'               => $url,
                'funnel_active'     => $running,
                'configured_url'    => $this->getSystemSetting('public_funnel_url'),
                'detail'            => $detail,
            ],
        ]);
    }

    public function funnelEnable(Request $request): JsonResponse
    {
        $cfg = $this->resolveFunnelConfig($request);

        if (!is_file($cfg['cli_path'])) {
            return response()->json([
                'message'   => 'برنامج Tailscale غير مثبت أو مساره غير صحيح على هذا الجهاز.',
                'detail'    => $cfg['cli_path'],
                'hint'      => 'ثبّت Tailscale من https://tailscale.com/download وسجّل الدخول، ثم تأكد من مسار tailscale.exe في الإعدادات.',
                'installed' => false,
            ], 422);
        }

        // Persist config so the device remembers it.
        $this->storeSystemSetting('tailscale_cli_path', $cfg['cli_path'], 'sharing', 'string');
        $this->storeSystemSetting('tailscale_app_port', (string) $cfg['port'], 'sharing', 'integer');

        // Check current status first (idempotent, like share-public-order.ps1).
        $status = $this->runTailscale([$cfg['cli_path'], 'funnel', 'status'], 20);
        $existingUrl = $this->extractFunnelUrl($status['stdout'] . "\n" . $status['stderr']);
        if ($existingUrl) {
            $this->storeSystemSetting('public_funnel_url', $existingUrl, 'sharing', 'string');
            return response()->json([
                'message'   => 'رابط Tailscale Funnel مفعّل مسبقاً لهذا الجهاز.',
                'url'       => $existingUrl,
                'app_port'  => $cfg['port'],
                'cli_path'  => $cfg['cli_path'],
                'installed' => true,
                'created'   => false,
            ]);
        }

        // Enable funnel (non-interactive: --yes is mandatory).
        $enable = $this->runTailscale([$cfg['cli_path'], 'funnel', '--bg', '--yes', (string) $cfg['port']], 60);
        $enableOut = trim($enable['stdout'] . "\n" . $enable['stderr']);

        // Read back the resulting URL.
        $url = $this->extractFunnelUrl($enableOut);
        if (!$url) {
            $after = $this->runTailscale([$cfg['cli_path'], 'funnel', 'status'], 20);
            $url = $this->extractFunnelUrl($after['stdout'] . "\n" . $after['stderr']);
            if (!$url && !$enable['ok']) {
                $enableOut = trim($enableOut . "\n" . $after['stdout'] . "\n" . $after['stderr']);
            }
        }

        if (!$url) {
            $hint = 'شغّل Tailscale وسجّل الدخول، وتأكد أن Funnel مفعّل على حساب tailnet (قد تحتاج تفعيلاً لمرة واحدة من لوحة Tailscale).';
            if (str_contains(mb_strtolower($enableOut), 'not enabled') || str_contains(mb_strtolower($enableOut), 'funnel is not enabled')) {
                $hint = 'ميزة Funnel غير مفعّلة على حساب الـ tailnet لهذا الجهاز. فعّلها لمرة واحدة من رابط الإدارة الذي يظهره Tailscale ثم أعد المحاولة.';
            }
            return response()->json([
                'message'   => 'تعذّر إنشاء رابط Funnel لهذا الجهاز.',
                'detail'    => $this->tailLines($enableOut, 10),
                'hint'      => $hint,
                'installed' => true,
                'cli_path'  => $cfg['cli_path'],
                'app_port'  => $cfg['port'],
            ], 422);
        }

        $this->storeSystemSetting('public_funnel_url', $url, 'sharing', 'string');

        return response()->json([
            'message'   => 'تم إنشاء رابط المشاركة العام لهذا الجهاز.',
            'url'       => $url,
            'app_port'  => $cfg['port'],
            'cli_path'  => $cfg['cli_path'],
            'installed' => true,
            'created'   => true,
        ]);
    }

    /**
     * Resolve Tailscale CLI path + app port from request > system settings >
     * machine config file > defaults.
     * @return array{cli_path:string,port:int}
     */
    private function resolveFunnelConfig(Request $request): array
    {
        $cli = $request->input('cli_path');
        $port = $request->input('port');

        if (!is_string($cli) || trim($cli) === '') {
            $cli = $this->getSystemSetting('tailscale_cli_path');
        }
        if (!is_string($cli) || trim($cli) === '') {
            $cli = $this->readFunnelConfigFile('TailscaleCli');
        }
        if (!is_string($cli) || trim($cli) === '') {
            $cli = 'C:\\Program Files\\Tailscale\\tailscale.exe';
        }

        $portInt = is_numeric($port) ? (int) $port : 0;
        if ($portInt < 1 || $portInt > 65535) {
            $storedPort = $this->getSystemSetting('tailscale_app_port');
            $portInt = is_numeric($storedPort) ? (int) $storedPort : 0;
        }
        if ($portInt < 1 || $portInt > 65535) {
            $filePort = $this->readFunnelConfigFile('AppPort');
            $portInt = is_numeric($filePort) ? (int) $filePort : 0;
        }
        if ($portInt < 1 || $portInt > 65535) {
            $portInt = 8000;
        }

        return ['cli_path' => trim($cli), 'port' => $portInt];
    }

    private function readFunnelConfigFile(string $varName): ?string
    {
        $path = base_path('share-public-order.config.ps1');
        if (!is_file($path)) {
            return null;
        }
        $contents = @file_get_contents($path);
        if (!is_string($contents) || $contents === '') {
            return null;
        }
        // $VarName = 'value'  OR  $VarName = 8000
        $pattern = '/^\s*\$' . preg_quote($varName, '/') . '\s*=\s*[\'"]?([^\'"\r\n]+)[\'"]?\s*$/m';
        if (preg_match($pattern, $contents, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    private function runTailscale(array $command, int $timeoutSeconds): array
    {
        try {
            $process = new Process($command);
            $process->setTimeout($timeoutSeconds);
            $process->run();
            return [
                'ok'     => $process->isSuccessful(),
                'stdout' => $process->getOutput(),
                'stderr' => $process->getErrorOutput(),
                'code'   => $process->getExitCode(),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'stdout' => '', 'stderr' => $e->getMessage(), 'code' => -1];
        }
    }

    private function extractFunnelUrl(string $text): ?string
    {
        if (preg_match('/https:\/\/[a-zA-Z0-9\-\.]+\.ts\.net/', $text, $m)) {
            return $m[0];
        }
        return null;
    }

    private function tailLines(string $text, int $lines): string
    {
        $parts = preg_split('/\r\n|\r|\n/', trim($text)) ?: [];
        $parts = array_values(array_filter($parts, fn ($l) => trim($l) !== ''));
        return implode("\n", array_slice($parts, -$lines));
    }

    private function getSystemSetting(string $key): mixed
    {
        try {
            $row = Setting::whereNull('company_id')->where('key', $key)->first();
            return $row ? $row->getTypedValue() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function storeSystemSetting(string $key, string $value, string $group, string $type): void
    {
        try {
            DB::table('settings')->updateOrInsert(
                ['key' => $key, 'company_id' => null],
                [
                    'value'       => $value,
                    'group'       => $group,
                    'type'        => $type,
                    'is_public'   => false,
                    'is_editable' => true,
                    'updated_at'  => now(),
                ]
            );
            Setting::clearCacheForKey($key);
            Cache::forget($this->cacheKey);
        } catch (\Throwable) {
            // Best-effort persistence; status/enable still return the live result.
        }
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
            'tailscale_cli_path'  => 'nullable|string|max:500',
            'tailscale_app_port'  => 'nullable|integer|min:1|max:65535',
            'public_funnel_url'   => 'nullable|string|max:500',
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

                // الكتابة عبر DB::table تتجاوز أحداث النموذج — ذاكرة
                // getSetting لكل مفتاح (company_id = null) يجب تفريغها يدوياً
                // وإلا بقيت القيمة القديمة معلقة حتى 24 ساعة.
                Setting::clearCacheForKey($key);
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
            str_starts_with($key, 'tailscale_') || $key === 'public_funnel_url' => 'sharing',
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
