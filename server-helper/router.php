<?php
/**
 * server-helper/router.php — مشغّل التحكم بالخادم (Server Control Helper)
 *
 * Standalone PHP router for:  php -S 0.0.0.0:8777 server-helper/router.php
 *
 * Runs INDEPENDENTLY of the main Laravel server (port 8000) so the
 * "start server" button keeps working even when the app is down.
 *
 * API:
 *   GET  /api/status   → deep diagnostic (server, DB, .env, migrations, storage, build)
 *   POST /api/start    → launch `php artisan serve` on port 8000 (detached)
 *   POST /api/stop     → kill the process listening on port 8000
 *   POST /api/restart  → stop then start
 *   GET  /             → human-readable RTL control page
 */

declare(strict_types=1);

const APP_PORT   = 8000;
const HELPER_URL = 'http://127.0.0.1:8777';
const TMP_OPTS   = ['http' => ['timeout' => 2.0, 'ignore_errors' => true]];

$ROOT   = dirname(__DIR__);   // D:\xampp\htdocs\sales-management
$METHOD = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$PATH   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Watchdog state must survive across requests: the PHP built-in server
// re-includes the router script on EVERY request, so process globals/statics
// are reset each time (verified empirically). Persist to a state file instead.
$STATE_FILE = __DIR__ . DIRECTORY_SEPARATOR . '.watchdog-state.json';

function state_read(): array {
    global $STATE_FILE;
    if (is_file($STATE_FILE)) {
        $raw = @file_get_contents($STATE_FILE);
        $s   = $raw ? json_decode($raw, true) : null;
        if (is_array($s)) {
            return [
                'manual_stop_until' => (int)($s['manual_stop_until'] ?? 0),
                'auto_attempt_at'   => (float)($s['auto_attempt_at'] ?? 0),
                'auto_failures'     => (int)($s['auto_failures'] ?? 0),
            ];
        }
    }
    return ['manual_stop_until' => 0, 'auto_attempt_at' => 0.0, 'auto_failures' => 0];
}

function state_write(array $s): void {
    global $STATE_FILE;
    @file_put_contents($STATE_FILE, json_encode($s), LOCK_EX);
}

/* ──────────────────────────────── CORS ──────────────────────────────── */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($METHOD === 'OPTIONS') { http_response_code(204); exit; }

/* ──────────────────────────────── helpers ──────────────────────────────── */
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function shell(string $cmd): array {
    $out = [];
    exec($cmd . ' 2>&1', $out, $rc);
    return $out;
}

function port_has_listener(int $port): bool {
    $fp = @fsockopen('127.0.0.1', $port, $errno, $errstr, 1.2);
    if ($fp) { fclose($fp); return true; }
    return false;
}

function pid_on_port(int $port): ?int {
    $lines = shell('netstat -ano | findstr ":' . $port . '"');
    $pids = [];
    foreach ($lines as $line) {
        if (stripos($line, 'LISTENING') === false) continue;
        $parts = preg_split('/\s+/', trim($line));
        $last = (int) end($parts);
        if ($last > 0) $pids[$last] = $last;
    }
    if (!$pids) return null;
    // Prefer the 0.0.0.0 / [::] listener, else any
    return (int) max($pids);
}

function server_health(): ?array {
    if (!port_has_listener(APP_PORT)) return null;
    $ctx = stream_context_create(TMP_OPTS);
    $body = @file_get_contents('http://127.0.0.1:' . APP_PORT . '/api/v1/health', false, $ctx);
    if ($body === false) return null;
    $decoded = json_decode($body, true);
    return $decoded['data'] ?? null;
}

function extensions_ok(): array {
    $required = ['pdo_sqlite', 'mbstring', 'openssl', 'curl', 'fileinfo', 'zip'];
    $missing = array_values(array_filter($required, fn ($e) => !extension_loaded($e)));
    return [$missing, array_values(array_filter($required, fn ($e) => extension_loaded($e)))];
}

function storage_writable(string $root): array {
    $dirs = [
        'storage/logs',
        'storage/framework/cache/data',
        'storage/framework/sessions',
        'storage/framework/views',
        'bootstrap/cache',
    ];
    $bad = [];
    foreach ($dirs as $d) {
        $p = $root . DIRECTORY_SEPARATOR . $d;
        if (!is_dir($p)) { @mkdir($p, 0777, true); }
        if (!is_writable($p)) $bad[] = $d;
    }
    return $bad;
}

function migrations_status(string $root): array {
    // Cached 30s in-process — `php artisan migrate:status` boots Laravel (~0.7s)
    // and the status page polls; we don't want a full boot every poll.
    static $cache = null;
    static $cachedAt = 0;
    if ($cache !== null && (microtime(true) - $cachedAt) < 30) {
        return $cache;
    }
    // [ran_count, pending_count, error]
    $lines = shell('cd /d "' . $root . '" && php artisan migrate:status');
    $ran = 0; $pending = 0;
    foreach ($lines as $l) {
        if (preg_match('/\bRan\b|\bPending\b/i', $l)) {
            if (preg_match('/\bPending\b/i', $l)) $pending++;
            elseif (preg_match('/\bRan\b/i', $l)) $ran++;
        }
    }
    $err = implode(' ', $lines);
    if (stripos($err, 'Exception') !== false || stripos($err, 'could not find driver') !== false) {
        $cache = [0, 0, trim(substr($err, 0, 300))];
    } else {
        $cache = [$ran, $pending, null];
    }
    $cachedAt = microtime(true);
    return $cache;
}

function start_server(string $root): array {
    if (port_has_listener(APP_PORT)) {
        return ['ok' => true, 'message' => 'الخادم يعمل بالفعل.', 'up' => true];
    }
    // Launch in a NEW minimized console window (start) so NO console handles are
    // inherited by the long-running `php artisan serve`. Redirect its output to a
    // log file. pclose(popen(...,'r')) does NOT wait for the child, so the request
    // returns immediately instead of blocking until the server exits.
    $log = $root . '\\storage\\logs\\server-console.log';
    $cmd = 'start "" /MIN cmd /C "cd /d "' . $root . '" && php artisan serve --host=0.0.0.0 --port=' . APP_PORT . ' > "' . $log . '" 2>&1"';
    @pclose(@popen($cmd, 'r'));
    for ($i = 0; $i < 30; $i++) {
        if (port_has_listener(APP_PORT)) {
            return ['ok' => true, 'message' => 'تم تشغيل الخادم على المنفذ ' . APP_PORT . '.', 'up' => true];
        }
        usleep(300_000);
    }
    return ['ok' => false, 'message' => 'تعذر تشغيل الخادم خلال المهلة (راجع start-server.bat).', 'up' => false];
}

/**
 * Watchdog: auto-start the app server when it is down and the environment is
 * sane. Called on /api/status and on the landing page so opening either of
 * them brings the app up without a manual click.
 *
 * Rules:
 *  - Never fights an explicit "stop" (manual_stop_until cooldown).
 *  - Rate-limits attempts (default 20s; 60s after consecutive failures).
 *  - Only runs when php extensions + APP_KEY are present (it would fail anyway).
 *  - Returns the attempt info so the UI can show "جارٍ التشغيل التلقائي".
 */
function maybe_auto_start(string $root): array {
    if (port_has_listener(APP_PORT)) return ['auto' => false];

    $state = state_read();
    if (time() < $state['manual_stop_until']) {
        return ['auto' => false, 'blocked' => 'manual-stop'];
    }

    $cooldown = $state['auto_failures'] > 0 ? 60 : 20;
    $now = microtime(true);
    if ($now - $state['auto_attempt_at'] < $cooldown) {
        return ['auto' => false, 'cooldown' => true];
    }
    $state['auto_attempt_at'] = $now;
    state_write($state);

    [$missing] = extensions_ok();
    $envKey = '';
    $envFile = $root . DIRECTORY_SEPARATOR . '.env';
    if (is_file($envFile)) {
        $envContent = @file_get_contents($envFile) ?: '';
        if (preg_match('/^APP_KEY=(.+)$/m', $envContent, $m)) $envKey = trim($m[1]);
    }
    if (!empty($missing) || $envKey === '') {
        return ['auto' => false, 'blocked' => $envKey === '' ? 'env' : 'extensions'];
    }

    $res = start_server($root);
    $state = state_read();   // re-read: cooldown may have been updated elsewhere
    $state['auto_failures'] = $res['ok'] ? 0 : ($state['auto_failures'] + 1);
    state_write($state);
    return ['auto' => true, 'ok' => $res['ok'], 'message' => $res['message']];
}

function stop_server(): array {
    $pid = pid_on_port(APP_PORT);
    if ($pid === null) {
        return ['ok' => true, 'message' => 'لا يوجد خادم يعمل على المنفذ ' . APP_PORT . '.', 'up' => false];
    }
    shell('taskkill /F /T /PID ' . $pid);
    usleep(500_000);
    // Explicit stops suppress the auto-start watchdog for 5 minutes so the user
    // can keep the server down without the page fighting them (persisted to the
    // state file — in-process globals do not survive between requests).
    $state = state_read();
    $state['manual_stop_until'] = time() + 300;
    state_write($state);
    return ['ok' => !port_has_listener(APP_PORT), 'message' => 'تم إيقاف الخادم (PID ' . $pid . ') — لن يُشغَّل تلقائياً لمدة 5 دقائق.', 'up' => port_has_listener(APP_PORT)];
}

function build_diagnostic(string $root): array {
    global $argv, $argc;
    $checks = [];

    [$missing, $present] = extensions_ok();
    $checks[] = [
        'id'     => 'php',
        'name'   => 'PHP',
        'ok'     => true,
        'detail' => PHP_VERSION . ' — الإضافات المطلوبة موجودة',
        'fix'    => null,
    ];
    $checks[] = [
        'id'     => 'extensions',
        'name'   => 'إضافات PHP المطلوبة',
        'ok'     => empty($missing),
        'detail' => empty($missing) ? implode(', ', $present) : 'ناقصة: ' . implode(', ', $missing),
        'fix'    => empty($missing) ? null : 'فعّل الإضافات المفقودة في php.ini ثم أعد تشغيل PHP.',
    ];

    $envFile  = $root . DIRECTORY_SEPARATOR . '.env';
    $envOk    = is_file($envFile);
    $envKey   = '';
    if ($envOk) {
        $envContent = @file_get_contents($envFile) ?: '';
        if (preg_match('/^APP_KEY=(.+)$/m', $envContent, $m)) $envKey = trim($m[1]);
    }
    $envKeySet = $envOk && $envKey !== '';
    $checks[] = [
        'id'     => 'env',
        'name'   => 'ملف .env و APP_KEY',
        'ok'     => $envKeySet,
        'detail' => !$envOk ? 'الملف غير موجود' : ($envKeySet ? 'APP_KEY مضبوطة' : 'APP_KEY فارغة'),
        'fix'    => $envKeySet ? null : 'php artisan key:generate',
    ];

    $dbFile  = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'database.sqlite';
    $dbExists = is_file($dbFile);
    $dbWritable = $dbExists && is_writable($dbFile);
    $checks[] = [
        'id'     => 'database',
        'name'   => 'قاعدة البيانات (sqlite)',
        'ok'     => $dbExists && $dbWritable,
        'detail' => $dbExists ? ('database/database.sqlite · ' . ($dbWritable ? 'قابلة للكتابة' : 'غير قابلة للكتابة')) : 'الملف غير موجود',
        'fix'    => $dbExists && $dbWritable ? null : 'أنشئ database/database.sqlite (start-server.bat يفعل ذلك تلقائياً).',
    ];

    [$ran, $pending, $migErr] = migrations_status($root);
    $migOk = $migErr === null && $pending === 0;
    $checks[] = [
        'id'     => 'migrations',
        'name'   => 'الترحيلات (migrations)',
        'ok'     => $migOk,
        'detail' => $migErr !== null ? ('خطأ: ' . $migErr) : ($pending === 0 ? $ran . ' ترحيل مطبّق' : $pending . ' ترحيل معلّق'),
        'fix'    => $migOk ? null : 'php artisan migrate --force',
    ];

    $storageBad = storage_writable($root);
    $checks[] = [
        'id'     => 'storage',
        'name'   => 'مجلدات التخزين',
        'ok'     => empty($storageBad),
        'detail' => empty($storageBad) ? 'كل المجلدات قابلة للكتابة' : 'غير قابلة للكتابة: ' . implode(', ', $storageBad),
        'fix'    => empty($storageBad) ? null : 'امنح صلاحيات الكتابة لمجلدات storage و bootstrap/cache.',
    ];

    $buildOk = is_file($root . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'build' . DIRECTORY_SEPARATOR . 'manifest.json');
    $checks[] = [
        'id'     => 'build',
        'name'   => 'واجهة المستخدم (build)',
        'ok'     => $buildOk,
        'detail' => $buildOk ? 'الملفات مبنية وجاهزة' : 'public/build/manifest.json غير موجود',
        'fix'    => $buildOk ? null : 'npm run build',
    ];

    $up     = port_has_listener(APP_PORT);
    $health = server_health();
    $checks[] = [
        'id'     => 'server',
        'name'   => 'خادم التطبيق (المنفذ ' . APP_PORT . ')',
        'ok'     => $up,
        'detail' => $up ? ('يعمل — ' . ($health['status'] ?? 'متصل') . ' · ' . ($health['laravel_version'] ?? '')) : 'متوقف',
        'fix'    => $up ? null : 'اضغط زر «تشغيل السيرفر» أدناه.',
    ];

    // Root cause = first failing check in a useful priority order
    $priority = ['server', 'php', 'env', 'extensions', 'database', 'migrations', 'storage', 'build'];
    $problem  = null;
    foreach ($priority as $id) {
        foreach ($checks as $c) {
            if ($c['id'] === $id && !$c['ok']) { $problem = $c; break 2; }
        }
    }

    return [
        'ok'       => $problem === null,
        'app'      => ['dir' => $root, 'port' => APP_PORT],
        'server'   => ['up' => $up, 'port' => APP_PORT, 'pid' => pid_on_port(APP_PORT), 'health' => $health],
        'checks'   => $checks,
        'problem'  => $problem,
        'actions'  => ['can_start' => !$up, 'can_stop' => $up],
    ];
}

/* ──────────────────────────────── routes ──────────────────────────────── */
if ($PATH === '/api/ping' && $METHOD === 'GET') {
    json_out(['ok' => true, 'ts' => microtime(true)]);
}

if ($PATH === '/api/status' && $METHOD === 'GET') {
    $diag = build_diagnostic($ROOT);
    // Auto-start watchdog: bring the app up automatically when it is down.
    if (!$diag['server']['up']) {
        $auto = maybe_auto_start($ROOT);
        if (!empty($auto['auto']) && !empty($auto['ok'])) {
            $diag = build_diagnostic($ROOT);   // re-diagnose now that it started
        }
        $diag['auto_start'] = $auto;
    } else {
        $diag['auto_start'] = ['auto' => false];
    }
    json_out($diag);
}

if ($PATH === '/api/start' && $METHOD === 'POST') {
    $res = start_server($ROOT);
    if ($res['ok']) {
        $state = state_read();
        $state['manual_stop_until'] = 0;   // explicit start = user opted back into auto-start
        $state['auto_failures']     = 0;
        state_write($state);
    }
    json_out(array_merge(['diagnostic' => null], $res));
}

if ($PATH === '/api/stop' && $METHOD === 'POST') {
    json_out(stop_server());
}

if ($PATH === '/api/restart' && $METHOD === 'POST') {
    stop_server();
    json_out(start_server($ROOT));
}

if ($PATH === '/' && $METHOD === 'GET') {
    maybe_auto_start($ROOT);   // opening the helper page also auto-starts the app
    serve_landing($ROOT);
    exit;
}

json_out(['error' => 'Not found'], 404);

/* ──────────────────────────────── landing page ──────────────────────────────── */
/**
 * Serve the standalone static status.html (single source of truth).
 * The same file also works by double-click (file://) with zero servers running.
 */
function serve_landing(string $root): void {
    header('Content-Type: text/html; charset=utf-8');
    $file = $root . DIRECTORY_SEPARATOR . 'status.html';
    if (is_file($file)) { readfile($file); return; }
    echo '<meta charset="utf-8"><title>Helper</title><body style="font-family:sans-serif;padding:2rem" dir="rtl">' .
         'صفحة الحالة مفقودة — أعد إنشاء <code>status.html</code> في جذر المشروع.</body>';
}
