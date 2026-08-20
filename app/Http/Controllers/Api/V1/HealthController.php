<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends BaseApiController
{
    /**
     * Public health check — no auth required.
     * Used by the connection-status portal (/status) to show the user
     * what is reachable and what is broken before they even log in.
     *
     * Returns the legacy fields (status/service/database/…) PLUS a structured
     * `checks[]` deep diagnostic and a computed `problem` (root cause) so the
     * page can highlight exactly what is wrong.
     */
    public function check(): JsonResponse
    {
        $dbConnected = false;
        $dbError     = null;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Throwable $e) {
            $dbError = $e->getMessage();
        }

        $checks   = $this->buildChecks($dbConnected, $dbError);
        $problem  = $this->rootProblem($checks);
        $status   = $dbConnected ? 'ok' : 'degraded';

        return $this->successResponse([
            'status'          => $status,
            'service'         => config('app.name'),
            'environment'     => config('app.env'),
            'debug'           => (bool) config('app.debug'),
            'app_url'         => config('app.url'),
            'database'        => $dbConnected ? 'connected' : 'error',
            'database_error'  => $dbError,
            'database_driver' => config('database.default'),
            'php_version'     => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_time'     => now()->toIso8601String(),
            'timezone'        => config('app.timezone'),
            'checks'          => $checks,
            'problem'         => $problem,
        ]);
    }

    /**
     * @return array<int, array{id:string,name:string,ok:bool,detail:string,fix:?string}>
     */
    private function buildChecks(bool $dbConnected, ?string $dbError): array
    {
        $root = base_path();

        // 1. PHP extensions
        $driver = config('database.default');
        $required = $driver === 'mysql'
            ? ['pdo_mysql', 'mbstring', 'openssl', 'curl', 'fileinfo', 'zip']
            : ['pdo_sqlite', 'mbstring', 'openssl', 'curl', 'fileinfo', 'zip'];
        $missing  = array_values(array_filter($required, fn ($e) => !extension_loaded($e)));
        $checks[] = [
            'id'     => 'extensions',
            'name'   => 'إضافات PHP المطلوبة',
            'ok'     => empty($missing),
            'detail' => empty($missing) ? implode(', ', $required) : 'ناقصة: ' . implode(', ', $missing),
            'fix'    => empty($missing) ? null : 'فعّل الإضافات المفقودة في php.ini ثم أعد تشغيل PHP.',
        ];

        // 2. .env + APP_KEY
        $envOk  = is_file($root . '/.env');
        $envKey = '';
        if ($envOk) {
            preg_match('/^APP_KEY=(.+)$/m', (string) file_get_contents($root . '/.env'), $m);
            $envKey = trim($m[1] ?? '');
        }
        $envKeySet = $envOk && $envKey !== '';
        $checks[] = [
            'id'     => 'env',
            'name'   => 'ملف .env و APP_KEY',
            'ok'     => $envKeySet,
            'detail' => !$envOk ? 'الملف غير موجود' : ($envKeySet ? 'APP_KEY مضبوطة' : 'APP_KEY فارغة'),
            'fix'    => $envKeySet ? null : 'php artisan key:generate',
        ];

        // 3. database connectivity (driver-aware)
        if ($driver === 'mysql') {
            $dbHost = config('database.connections.mysql.host', '127.0.0.1');
            $dbPort = config('database.connections.mysql.port', 3306);
            $dbConnectedCheck = false;
            $dbCheckDetail    = '';
            try {
                $pdo = DB::connection('mysql')->getPdo();
                $dbConnectedCheck = true;
                $serverVersion = $pdo->query('SELECT VERSION()')->fetchColumn();
                $dbCheckDetail = "MySQL/MariaDB $serverVersion · $dbHost:$dbPort";
            } catch (\Throwable $e) {
                $dbCheckDetail = 'MySQL غير متاح: ' . $e->getMessage();
            }
            $checks[] = [
                'id'     => 'database',
                'name'   => 'قاعدة البيانات (MySQL)',
                'ok'     => $dbConnectedCheck,
                'detail' => $dbCheckDetail,
                'fix'    => $dbConnectedCheck ? null : 'تأكد أن MySQL يعمل (C:\\xampp\\mysql\\bin\\mysqld.exe).',
            ];
        } else {
            $dbFile     = $root . '/database/database.sqlite';
            $dbExists   = is_file($dbFile);
            $dbWritable = $dbExists && is_writable($dbFile);
            $checks[] = [
                'id'     => 'database',
                'name'   => 'قاعدة البيانات (sqlite)',
                'ok'     => $dbExists && $dbWritable,
                'detail' => $dbExists
                    ? ('database/database.sqlite · ' . ($dbWritable ? 'قابلة للكتابة' : 'غير قابلة للكتابة'))
                    : 'الملف غير موجود',
                'fix'    => ($dbExists && $dbWritable) ? null : 'أنشئ database/database.sqlite (start-server.bat يفعل ذلك تلقائياً).',
            ];
        }

        // 4. storage writable
        $storageBad = [];
        foreach (['storage/logs', 'storage/framework/cache/data', 'storage/framework/sessions', 'storage/framework/views', 'bootstrap/cache'] as $d) {
            $p = $root . '/' . $d;
            if (!is_dir($p)) { @mkdir($p, 0777, true); }
            if (!is_writable($p)) { $storageBad[] = $d; }
        }
        $checks[] = [
            'id'     => 'storage',
            'name'   => 'مجلدات التخزين',
            'ok'     => empty($storageBad),
            'detail' => empty($storageBad) ? 'كل المجلدات قابلة للكتابة' : 'غير قابلة للكتابة: ' . implode(', ', $storageBad),
            'fix'    => empty($storageBad) ? null : 'امنح صلاحيات الكتابة لمجلدات storage و bootstrap/cache.',
        ];

        // 5. build assets
        $buildOk = is_file($root . '/public/build/manifest.json');
        $checks[] = [
            'id'     => 'build',
            'name'   => 'واجهة المستخدم (build)',
            'ok'     => $buildOk,
            'detail' => $buildOk ? 'الملفات مبنية وجاهزة' : 'public/build/manifest.json غير موجود',
            'fix'    => $buildOk ? null : 'npm run build',
        ];

        // 6. migrations (cached per driver — heavy command)
        [$ran, $pending] = Cache::remember("health:migrations:{$driver}", 60, function () use ($root, $driver) {
            try {
                Artisan::call('migrate:status', ['--database' => $driver]);
                $out    = Artisan::output();
                $ran    = preg_match_all('/\bRan\b/i', $out);
                $pending = preg_match_all('/\bPending\b/i', $out);
                return [$ran, $pending];
            } catch (\Throwable) {
                return [0, 0];
            }
        });
        $checks[] = [
            'id'     => 'migrations',
            'name'   => 'الترحيلات (migrations)',
            'ok'     => $pending === 0,
            'detail' => $pending === 0 ? $ran . ' ترحيل مطبّق' : $pending . ' ترحيل معلّق',
            'fix'    => $pending === 0 ? null : 'php artisan migrate --force',
        ];

        // 7. server process / HTTP (this request proves the server is up)
        $checks[] = [
            'id'     => 'server',
            'name'   => 'خادم التطبيق (المنفذ 8000)',
            'ok'     => true,
            'detail' => 'يعمل — ' . app()->version(),
            'fix'    => null,
        ];

        return $checks;
    }

    /**
     * @param  array<int,array{id:string,ok:bool}>  $checks
     * @return array{id:string,name:string,ok:bool,detail:string,fix:?string}|null
     */
    private function rootProblem(array $checks): ?array
    {
        $priority = ['server', 'extensions', 'env', 'database', 'migrations', 'storage', 'build'];
        foreach ($priority as $id) {
            foreach ($checks as $c) {
                if ($c['id'] === $id && !$c['ok']) {
                    return $c;
                }
            }
        }
        return null;
    }
}
