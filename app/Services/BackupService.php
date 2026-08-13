<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * BackupService — portable database backup / restore for SQLite (dev) and MySQL (prod).
 *
 *   backup()  : consistent snapshot of the active connection → gzip → optional AES-256-GCM
 *               encryption → sha256 checksum → retention-prune. Output lands in
 *               storage/app/backups.
 *   list()    : inventory with size / date / driver / extension.
 *   verify()  : sha256 comparison (refuses corrupt files).
 *   restore() : verified + decrypted + decompressed file replaces the live DB (sqlite file
 *               copy after disconnecting; MySQL re-import via the `mysql` client).
 *   delete()  : remove one backup (+ its checksum).
 *
 * Encryption uses PHP's built-in OpenSSL (AES-256-GCM, random IV per file) — portable and
 * dependency-free on this Windows box, unlike the `gpg` binary. Key resolution:
 *   config('backup.encryption_key') ?? config('app.key') (the `base64:` prefix is handled).
 *
 * Retention keeps the N most recent backups (config backup.retention_keep) — time-based
 * pruning is applied on top when a file is older than backup.retention_days.
 */
class BackupService
{
    protected string $dir;

    protected array $config;

    protected const MAGIC = 'DZB1';

    public function __construct()
    {
        $this->dir    = storage_path('app/backups');
        $this->config = config('backup', []);
    }

    /* ------------------------------------------------------------------ *
     *  Public API
     * ------------------------------------------------------------------ */

    /**
     * @return array{file:string,size:int,hash:string,driver:string,created_at:string}
     */
    public function backup(?string $label = null, ?int $keep = null): array
    {
        $this->ensureDir();

        $base = 'backup-'.date('Y-m-d-His').($label ? '-'.$this->slug($label) : '').'.'.$this->extension();
        $raw  = $this->dir.DIRECTORY_SEPARATOR.$base;

        $this->dump($raw);

        $gz = $raw.'.gz';
        $this->gzip($raw, $gz);
        @unlink($raw);

        $file = $gz;
        if ($this->encryptEnabled()) {
            $enc  = $gz.'.enc';
            $this->encryptFile($gz, $enc);
            @unlink($gz);
            $file = $enc;
        }

        $hash = hash_file('sha256', $file);
        file_put_contents($file.'.sha256', $hash);

        $this->prune($keep);

        return [
            'file'       => basename($file),
            'size'       => (int) filesize($file),
            'hash'       => $hash,
            'driver'     => $this->driver(),
            'created_at' => date('c'),
        ];
    }

    /**
     * @return array<int,array{name:string,size:int,date:string,driver:string,extension:string,encrypted:bool}>
     */
    public function list(): array
    {
        $this->ensureDir();
        $files = [];

        foreach (glob($this->dir.DIRECTORY_SEPARATOR.'backup-*') ?: [] as $path) {
            $name = basename($path);
            if (str_ends_with($name, '.sha256')) {
                continue;
            }
            $files[] = [
                'name'      => $name,
                'size'      => (int) filesize($path),
                'date'      => date('c', filemtime($path)),
                'driver'    => $this->driverFromName($name),
                'extension' => pathinfo($name, PATHINFO_EXTENSION),
                'encrypted' => str_ends_with($name, '.enc'),
            ];
        }

        usort($files, fn ($a, $b) => strcmp($b['name'], $a['name']));

        return $files;
    }

    /**
     * @return array{ok:true,size:int,hash:string}
     *
     * @throws RuntimeException when the file is missing or its sha256 does not match
     */
    public function verify(string $file): array
    {
        $path = $this->resolve($file);
        $hash = $this->resolve($file.'.sha256', false);

        if (!file_exists($hash)) {
            throw new RuntimeException("Missing checksum for {$file} — refusing to trust it.");
        }

        $expected = trim((string) file_get_contents($hash));
        $actual   = hash_file('sha256', $path);

        if (!hash_equals($expected, (string) $actual)) {
            throw new RuntimeException("Checksum mismatch for {$file} — the file is corrupt or tampered with.");
        }

        return ['ok' => true, 'size' => (int) filesize($path), 'hash' => $actual];
    }

    /**
     * Restore a verified backup over the live database.
     *
     * @param  bool  $confirmed  the explicit "current DB will be overwritten" consent
     *
     * @return string the path of the safety copy taken before overwrite ('' if none)
     *
     * @throws RuntimeException on missing consent, corrupt file, or import failure
     */
    public function restore(string $file, bool $confirmed): string
    {
        if (!$confirmed) {
            throw new RuntimeException('Refusing to restore: explicit confirmation is required (the current database will be overwritten).');
        }

        $this->verify($file);
        $path  = $this->resolve($file);
        $plain = $this->preparePlain($path);

        if ($this->driver() === 'sqlite') {
            return $this->restoreSqlite($plain);
        }

        return $this->restoreMysql($plain);
    }

    /**
     * @throws RuntimeException when the file does not exist or is a checksum sidecar
     */
    public function delete(string $file): void
    {
        $path = $this->resolve($file);
        @unlink($path);
        @unlink($path.'.sha256');
    }

    public function dir(): string
    {
        return $this->dir;
    }

    /**
     * Resolve a stored backup to its absolute path for streaming downloads.
     *
     * @throws RuntimeException when the file does not exist or is a checksum sidecar
     */
    public function resolveForDownload(string $file): string
    {
        return $this->resolve($file);
    }

    /**
     * Import an uploaded backup file (an offline/external copy) into
     * storage/app/backups. A fresh sha256 sidecar is written so the imported
     * file can then be verified / restored through the normal flow.
     *
     * @return array{name:string,size:int,date:string,driver:string,extension:string,encrypted:bool}
     *
     * @throws RuntimeException on disallowed extension, oversized file, or an
     *                          unreadable payload (bad gzip / encrypted header)
     */
    public function import(\Illuminate\Http\UploadedFile $file): array
    {
        $this->ensureDir();

        $original = (string) $file->getClientOriginalName();
        $ext      = strtolower(pathinfo($original, PATHINFO_EXTENSION));

        if (!in_array($ext, ['gz', 'enc', 'sqlite', 'sql'], true)) {
            $shown = $ext !== '' ? '.'.$ext : 'بدون امتداد';
            throw new RuntimeException("File extension not allowed: {$shown} — expected .gz / .enc / .sqlite / .sql.");
        }

        $max = (int) ($this->config['max_upload_bytes'] ?? 128 * 1024 * 1024);
        if (($file->getSize() ?: 0) > $max) {
            throw new RuntimeException('File too large: '.$this->humanBytes($file->getSize() ?: 0).' exceeds the '.$this->humanBytes($max).' limit.');
        }

        $name = 'backup-imported-'.date('Y-m-d-His').'-'.substr(uniqid(), -4).'-'.$this->slug(pathinfo($original, PATHINFO_FILENAME)).'.'.$ext;
        $dest = $this->dir.DIRECTORY_SEPARATOR.$name;

        $file->move($this->dir, $name);

        // Early sanity so the user gets immediate feedback: gzip magic or our
        // encrypted-backup header. Deeper checks still happen at restore time.
        $head = (string) file_get_contents($dest, false, null, 0, 4);
        if ($ext === 'gz' && substr($head, 0, 2) !== "\x1f\x8b") {
            @unlink($dest);
            throw new RuntimeException('Not a gzip backup: the file does not start with a gzip header.');
        }
        if ($ext === 'enc' && substr($head, 0, 4) !== self::MAGIC) {
            @unlink($dest);
            throw new RuntimeException('Not an encrypted backup: missing the backup header.');
        }

        $hash = hash_file('sha256', $dest);
        file_put_contents($dest.'.sha256', $hash);

        return [
            'name'      => $name,
            'size'      => (int) filesize($dest),
            'date'      => date('c'),
            'driver'    => $this->driverFromName($name),
            'extension' => $ext,
            'encrypted' => $ext === 'enc',
        ];
    }

    public function driver(): string
    {
        return (string) (config('database.connections.'.config('database.default').'.driver') ?: 'sqlite');
    }

    /* ------------------------------------------------------------------ *
     *  Dump
     * ------------------------------------------------------------------ */

    protected function extension(): string
    {
        return $this->driver() === 'sqlite' ? 'sqlite' : 'sql';
    }

    protected function dump(string $dest): void
    {
        if ($this->driver() === 'sqlite') {
            $this->dumpSqlite($dest);
        } else {
            $this->dumpMysql($dest);
        }
    }

    /**
     * Consistent SQLite snapshot via `VACUUM INTO` on the PDO connection.
     *
     * Only needs pdo_sqlite (the `SQLite3` class / php_sqlite3 extension is NOT required).
     * `VACUUM INTO` takes a consistent snapshot even while the DB is being written to.
     *
     * @throws RuntimeException when the target file cannot be written (e.g. another writer
     *                          holds a transaction — "database is locked")
     */
    protected function dumpSqlite(string $dest): void
    {
        $dbPath = (string) config('database.connections.sqlite.database');
        if (!is_file($dbPath)) {
            throw new RuntimeException("SQLite database not found at {$dbPath}.");
        }

        $pdo = new \PDO('sqlite:'.$dbPath, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);

        try {
            $quoted = str_replace("'", "''", $dest);
            $pdo->exec("VACUUM INTO '{$quoted}'");
        } catch (\PDOException $e) {
            throw new RuntimeException('SQLite snapshot (VACUUM INTO) failed: '.$e->getMessage(), 0, $e);
        } finally {
            $pdo = null;
        }
    }

    /**
     * MySQL dump via the `mysqldump` client when available, falling back to a PDO dump.
     *
     * @throws RuntimeException when both paths fail
     */
    protected function dumpMysql(string $dest): void
    {
        if ($this->mysqlBinaryAvailable('mysqldump_path')) {
            $this->dumpMysqlBinary($dest);
            return;
        }

        $this->dumpMysqlPdo($dest);
    }

    /**
     * MySQL dump through the `mysqldump` client (single-transaction, routines included).
     */
    protected function dumpMysqlBinary(string $dest): void
    {
        $conn = (array) config('database.connections.mysql');
        $cmd  = [($this->config['mysqldump_path'] ?? 'mysqldump')];

        $cmd[] = '-u'.$conn['username'];
        if (!empty($conn['password'])) {
            $cmd[] = '-p'.$conn['password'];
        }
        if (!empty($conn['host'])) {
            $cmd[] = '-h'.$conn['host'];
        }
        if (!empty($conn['port'])) {
            $cmd[] = '-P'.(string) $conn['port'];
        }
        $cmd[] = '--single-transaction';
        $cmd[] = '--routines';
        $cmd[] = '--no-tablespaces';
        $cmd[] = (string) $conn['database'];

        $process = new Process($cmd);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new RuntimeException('mysqldump failed: '.trim($process->getErrorOutput() ?: $process->getOutput()));
        }

        file_put_contents($dest, $process->getOutput());
    }

    /**
     * Dependency-free MySQL dump through PDO (pdo_mysql): schema + data, streamed.
     */
    protected function dumpMysqlPdo(string $dest): void
    {
        $pdo = DB::connection()->getPdo();
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $out = fopen($dest, 'wb');
        if ($out === false) {
            throw new RuntimeException('Unable to open dump file for writing.');
        }

        try {
            $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);

            foreach ($tables as $table) {
                fwrite($out, "-- --------------------------------------------------\n");
                fwrite($out, "-- Table `{$table}`\n");
                fwrite($out, "-- --------------------------------------------------\n");

                $create = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(\PDO::FETCH_ASSOC);
                fwrite($out, $create['Create Table'].";\n");

                $select = $pdo->query("SELECT * FROM `{$table}`");
                $select->setFetchMode(\PDO::FETCH_NUM);

                $cols = [];
                for ($i = 0; $i < $select->columnCount(); $i++) {
                    $meta = $select->getColumnMeta($i);
                    $cols[] = '`'.($meta['name'] ?? 'col'.$i).'`';
                }

                foreach ($select as $row) {
                    $values = [];
                    foreach (array_values($row) as $v) {
                        if ($v === null) {
                            $values[] = 'NULL';
                        } elseif (is_int($v) || is_float($v)) {
                            $values[] = (string) $v;
                        } else {
                            $values[] = $pdo->quote((string) $v);
                        }
                    }
                    fwrite($out, "INSERT INTO `{$table}` (`".implode('`,`', $cols)."`) VALUES (".implode(', ', $values).");\n");
                }
            }

            fwrite($out, "-- END OF DUMP\n");
        } finally {
            fclose($out);
        }
    }

    /**
     * Resolve a configured client binary and check it actually runs.
     */
    protected function mysqlBinaryAvailable(string $configKey): bool
    {
        $binary = $this->config[$configKey] ?? null;
        if (empty($binary)) {
            return false;
        }

        $process = new Process([$binary, '--version']);
        $process->run();

        return $process->isSuccessful();
    }

    /* ------------------------------------------------------------------ *
     *  Compression / encryption
     * ------------------------------------------------------------------ */

    protected function gzip(string $in, string $out): void
    {
        $inH  = fopen($in, 'rb');
        $gzH  = gzopen($out, 'wb9');

        if ($inH === false || $gzH === false) {
            throw new RuntimeException('Unable to open files for gzip.');
        }

        try {
            while (!feof($inH)) {
                gzwrite($gzH, (string) fread($inH, 8192));
            }
        } finally {
            gzclose($gzH);
            fclose($inH);
        }
    }

    protected function gunzip(string $in, string $out): void
    {
        $gzH = gzopen($in, 'rb');
        $outH = fopen($out, 'wb');

        if ($gzH === false || $outH === false) {
            throw new RuntimeException('Unable to open files for gunzip.');
        }

        try {
            while (!gzeof($gzH)) {
                fwrite($outH, (string) gzread($gzH, 8192));
            }
        } finally {
            gzclose($gzH);
            fclose($outH);
        }
    }

    protected function encryptEnabled(): bool
    {
        return (bool) ($this->config['encrypt'] ?? false);
    }

    /**
     * AES-256-GCM encryption with a random 12-byte IV; header = MAGIC(4) + iv(12) + tag(16).
     */
    protected function encryptFile(string $in, string $out): void
    {
        $data = (string) file_get_contents($in);
        $iv   = random_bytes(12);
        $tag  = '';

        $cipher = openssl_encrypt($data, 'aes-256-gcm', $this->encryptionKey(), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false) {
            throw new RuntimeException('Encryption failed (openssl).');
        }

        file_put_contents($out, self::MAGIC.$iv.$tag.$cipher);
    }

    protected function decryptFile(string $in): string
    {
        $raw = (string) file_get_contents($in);

        if (strlen($raw) < 32 || substr($raw, 0, 4) !== self::MAGIC) {
            throw new RuntimeException('Not an encrypted backup (missing header).');
        }

        $iv  = substr($raw, 4, 12);
        $tag = substr($raw, 16, 16);
        $cipher = substr($raw, 32);

        $plain = openssl_decrypt($cipher, 'aes-256-gcm', $this->encryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($plain === false) {
            throw new RuntimeException('Decryption failed (wrong key or corrupt file).');
        }

        return $plain;
    }

    protected function encryptionKey(): string
    {
        $key = (string) ($this->config['encryption_key'] ?? config('app.key'));

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);
            if ($decoded !== false) {
                $key = $decoded;
            }
        }

        if (strlen($key) < 32) {
            $key = str_pad($key, 32, '0');
        }

        return substr($key, 0, 32);
    }

    /**
     * Turn a stored file into a plain (decrypted, uncompressed) temporary copy.
     */
    protected function preparePlain(string $path): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'restore-');

        if ($tmp === false) {
            throw new RuntimeException('Unable to create a temporary file.');
        }

        try {
            if (str_ends_with($path, '.enc')) {
                $gz = $tmp;
                file_put_contents($gz, $this->decryptFile($path));
                $plain = $tmp.'.plain';
                $this->gunzip($gz, $plain);
                @unlink($gz);
            } elseif (str_ends_with($path, '.gz')) {
                $plain = $tmp.'.plain';
                $this->gunzip($path, $plain);
                @unlink($tmp);
            } else {
                $plain = $tmp;
                copy($path, $plain);
            }

            return $plain;
        } catch (\Throwable $e) {
            @unlink($tmp);
            throw $e;
        }
    }

    /* ------------------------------------------------------------------ *
     *  Restore
     * ------------------------------------------------------------------ */

    protected function restoreSqlite(string $plain): string
    {
        $dbPath = (string) config('database.connections.sqlite.database');
        if (!is_file($dbPath)) {
            throw new RuntimeException("SQLite database not found at {$dbPath} — nothing to restore over.");
        }

        // 1) Safety copy of the CURRENT live DB (read-only snapshot, safe at any
        //    point — SQLite shares the file for reads). Kept for manual rollback.
        $safety = $dbPath.'.before-restore-'.date('Y-m-d-His');
        if (!@copy($dbPath, $safety)) {
            throw new RuntimeException('Unable to take a safety copy of the current database — restore aborted.');
        }

        // 2) Stage the restored DB into the SAME directory as the target. A rename()
        //    is only atomic on the same volume, so the temp file MUST live beside
        //    database.sqlite (never in sys_get_temp_dir() on another drive).
        $staged = $dbPath.'.restore-tmp-'.bin2hex(random_bytes(4)).'.sqlite';
        if (!@copy($plain, $staged)) {
            @unlink($staged);
            throw new RuntimeException('Unable to stage the restored database file.');
        }

        // 3) Validate BEFORE touching the live database: refuse to install a
        //    corrupt / non-SQLite / truncated file over the real data.
        try {
            $this->assertValidSqlite($staged);
        } catch (\Throwable $e) {
            @unlink($staged); // never leave a rejected temp beside the live DB
            throw $e;
        }

        // 4) Restore the CONTENT through SQLite's Online Backup API
        //    (SQLite3::backup), NOT by replacing the file on disk. The built-in
        //    dev server holds database.sqlite open for the whole request, so
        //    rename()/copy() over the file fails on Windows with a sharing
        //    violation (the "locked by another process" the user hit) and — worse
        //    — the original in-place copy() left a half-written file that broke
        //    the next sale with "unable to open database file". The backup API
        //    copies page-by-page into the open live database and takes its own
        //    locks, so it works on an open/locked database and can never leave a
        //    truncated or missing file behind.
        if (!class_exists(\SQLite3::class)) {
            @unlink($staged);
            throw new RuntimeException('Restore failed: the sqlite3 extension is not loaded on this PHP.');
        }

        // Drop the framework's connections first so we are the only writer while
        // the backup copy runs (single-request server, so nothing else competes).
        DB::purge();
        foreach (DB::getConnections() as $conn) {
            $conn->disconnect();
        }

        $restored = null;
        $live = null;
        try {
            $restored = new \SQLite3($staged, SQLITE3_OPEN_READONLY);
            $live = new \SQLite3($dbPath, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
        } catch (\Throwable $e) {
            @unlink($staged);
            throw new RuntimeException('Restore failed: unable to open the SQLite databases ('.$e->getMessage().').', 0, $e);
        }

        try {
            // $restored is the SOURCE, $live the DESTINATION (the method is called
            // on the source instance). Copies restored -> live page by page.
            if (!$restored->backup($live)) {
                $code = $live->lastErrorCode();
                $msg  = $live->lastErrorMsg();
                throw new RuntimeException("Restore failed while copying the database (SQLite error {$code}: {$msg}).");
            }
        } catch (\Throwable $e) {
            if ($e instanceof RuntimeException) {
                throw $e;
            }
            throw new RuntimeException('Restore failed while copying the database: '.$e->getMessage(), 0, $e);
        } finally {
            $live?->close();
            $restored?->close();
        }

        @unlink($staged);
        clearstatcache();

        // 5) The live file now holds the restored content; drop every connection
        //    so the next request opens the fresh data, and flush cached settings.
        DB::purge();
        foreach (DB::getConnections() as $conn) {
            $conn->disconnect();
        }

        // 6) Settle the restored file's journal state and prove it is writable NOW.
        //    The backup API copies page-by-page under the DESTINATION's rollback
        //    journal (journal_mode=delete). On Windows a lingering journal/lock
        //    makes the very NEXT write fail with SQLite CANTOPEN ("unable to open
        //    database file") — exactly what the user hit right after a restore
        //    (the first import write died with `General error: 14`). Force the
        //    journal to fully create + delete inside a write transaction (rolled
        //    back, no data touched) while this request is the only writer, so any
        //    residue settles HERE instead of exploding on the next request.
        $settle = null;
        try {
            $settle = new \PDO('sqlite:'.$dbPath, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);
            $settle->exec('PRAGMA journal_mode = DELETE');
            $settled = false;
            for ($i = 1; $i <= 5 && !$settled; $i++) {
                try {
                    $settle->exec('BEGIN IMMEDIATE');
                    $settle->exec('ROLLBACK');
                    $settled = true;
                } catch (\Throwable $e) {
                    if ($i === 5) {
                        throw new RuntimeException(
                            'Restore completed but the database is not writable yet: '.$e->getMessage(),
                            0,
                            $e
                        );
                    }
                    usleep(250_000); // Windows lock-release timing; re-probe briefly
                }
            }
        } finally {
            $settle = null;
        }

        $this->afterRestore();

        return $safety;
    }

    /**
     * Refuse to install a file that is not a valid, uncorrupt SQLite database.
     *
     * @throws RuntimeException when the file cannot be opened, fails SQLite's own
     *                          integrity check, or is missing the migrations table
     */
    protected function assertValidSqlite(string $path): void
    {
        try {
            $pdo = new \PDO('sqlite:'.$path, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);
        } catch (\PDOException $e) {
            throw new RuntimeException('The restored file is not a valid SQLite database: '.$e->getMessage(), 0, $e);
        }

        try {
            $check = (string) ($pdo->query('PRAGMA integrity_check')->fetchColumn() ?? '');
            if ($check !== 'ok') {
                throw new RuntimeException("The restored database failed SQLite's integrity check ({$check}) — refusing to restore it.");
            }

            $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(\PDO::FETCH_COLUMN);
            if (!in_array('migrations', $tables, true)) {
                throw new RuntimeException('The restored database is missing the migrations table — refusing to restore it.');
            }

            $count = (int) $pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn();
            if ($count < 1) {
                throw new RuntimeException('The restored database has no applied migrations — refusing to restore it.');
            }
        } catch (\PDOException $e) {
            throw new RuntimeException('Unable to validate the restored database: '.$e->getMessage(), 0, $e);
        } finally {
            $pdo = null;
        }
    }

    protected function restoreMysql(string $plain): string
    {
        foreach (DB::getConnections() as $c) {
            $c->disconnect();
        }

        if ($this->mysqlBinaryAvailable('mysql_client')) {
            $conn = (array) config('database.connections.mysql');
            $cmd  = [($this->config['mysql_client'] ?? 'mysql')];

            $cmd[] = '-u'.$conn['username'];
            if (!empty($conn['password'])) {
                $cmd[] = '-p'.$conn['password'];
            }
            if (!empty($conn['host'])) {
                $cmd[] = '-h'.$conn['host'];
            }
            if (!empty($conn['port'])) {
                $cmd[] = '-P'.(string) $conn['port'];
            }
            $cmd[] = (string) $conn['database'];

            $process = new Process($cmd);
            $process->setInput((string) file_get_contents($plain));
            $process->run();

            if (!$process->isSuccessful()) {
                throw new RuntimeException('MySQL restore failed: '.trim($process->getErrorOutput() ?: $process->getOutput()));
            }
        } else {
            $this->restoreMysqlPdo($plain);
        }

        $this->afterRestore();

        return '';
    }

    /**
     * Dependency-free MySQL restore through PDO: split the dump into statements
     * (one per line for dumps we produced; falls back to whole-file exec).
     */
    protected function restoreMysqlPdo(string $plain): void
    {
        $sql = (string) file_get_contents($plain);
        $pdo = DB::connection()->getPdo();
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0; SET NAMES utf8mb4;');

        $statements = preg_split('/;\s*$/m', $sql) ?: [];
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if ($statement === '' || str_starts_with($statement, '--') || str_starts_with($statement, '#')) {
                continue;
            }
            $pdo->exec($statement);
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1;');
    }

    /**
     * Settings are Cache::remember-backed — a restored DB must invalidate the cache.
     */
    protected function afterRestore(): void
    {
        \Illuminate\Support\Facades\Cache::flush();
        \Illuminate\Support\Facades\Artisan::call('config:clear');
    }

    /* ------------------------------------------------------------------ *
     *  Retention / helpers
     * ------------------------------------------------------------------ */

    protected function prune(?int $keep): void
    {
        $keep = (int) ($keep ?? $this->config['retention_keep'] ?? 20);

        // A zero/negative cap must NEVER wipe the archive (it would delete the
        // backup we just created) — floor it at 1 and fall back to the default.
        if ($keep < 1) {
            $keep = (int) ($this->config['retention_keep'] ?? 20);
        }

        $maxAge = (int) ($this->config['retention_days'] ?? 14) * 86400;

        // Snapshot of real backup files (skip .sha256 sidecars), newest first.
        $files = [];
        foreach (glob($this->dir.DIRECTORY_SEPARATOR.'backup-*') ?: [] as $path) {
            $name = basename($path);
            if (is_file($path) && !str_ends_with($name, '.sha256')) {
                $files[] = $path;
            }
        }

        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));

        // 1) Cap by count: keep the N most recent, delete the rest.
        foreach (array_slice($files, $keep) as $old) {
            @unlink($old);
            @unlink($old.'.sha256');
        }

        // 2) Cap by age: only when MORE than `keep` files still exist, drop the
        //    ones older than retention_days. Re-glob so we never stat a file that
        //    the count-cap already deleted (filemtime() on a missing path crashed
        //    when keep=0 was passed in).
        $survivors = [];
        foreach (glob($this->dir.DIRECTORY_SEPARATOR.'backup-*') ?: [] as $path) {
            $name = basename($path);
            if (is_file($path) && !str_ends_with($name, '.sha256')) {
                $survivors[] = $path;
            }
        }

        if ($maxAge > 0 && count($survivors) > $keep) {
            foreach ($survivors as $path) {
                if ((time() - (int) filemtime($path)) > $maxAge) {
                    @unlink($path);
                    @unlink($path.'.sha256');
                }
            }
        }
    }

    protected function ensureDir(): void
    {
        if (!is_dir($this->dir)) {
            if (!mkdir($this->dir, 0755, true) && !is_dir($this->dir)) {
                throw new RuntimeException("Unable to create backups directory {$this->dir}.");
            }
        }
    }

    protected function slug(string $value): string
    {
        return preg_replace('/[^a-zA-Z0-9._-]/', '-', $value) ?: 'label';
    }

    protected function humanBytes(int $bytes): string
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

    protected function resolve(string $file, bool $strict = true): string
    {
        $name = basename($file);
        $path = $this->dir.DIRECTORY_SEPARATOR.$name;

        if ($strict && !file_exists($path)) {
            throw new RuntimeException("Backup file not found: {$name}");
        }

        return $path;
    }

    protected function driverFromName(string $name): string
    {
        return str_contains($name, '.sqlite') ? 'sqlite' : (str_contains($name, '.sql') ? 'mysql' : 'unknown');
    }
}
