<?php

namespace App\Support\Database;

use Illuminate\Database\QueryException;
use Illuminate\Database\SQLiteConnection;

/**
 * SQLite connection that retries transient statement failures caused by
 * Windows file locking (Windows Defender / Search Indexer momentarily holding
 * database.sqlite or its -journal/-wal sibling during a write).
 *
 * These failures surface as SQLite codes 5 ("database is locked") and 14
 * ("unable to open database file") — NOT as SQLITE_BUSY that PRAGMA
 * busy_timeout can absorb. A failed statement in SQLite is rolled back at the
 * statement level, so retrying the exact same statement is safe and never
 * double-applies a mutation.
 *
 * Registered in AppServiceProvider::boot() via Connection::resolverFor('sqlite').
 */
class RetryingSQLiteConnection extends SQLiteConnection
{
    protected int $maxRetries = 5;

    /** @var int[] Delays in ms before retry attempt N (index 0 = first retry). */
    protected array $retryDelaysMs = [0, 50, 100, 200, 400];

    protected function runQueryCallback($query, $bindings, $callback)
    {
        $attempt = 0;

        do {
            try {
                return parent::runQueryCallback($query, $bindings, $callback);
            } catch (QueryException $e) {
                if (!$this->isTransientLock($e) || $attempt >= $this->maxRetries) {
                    throw $e;
                }

                $delayMs = $this->retryDelaysMs[$attempt] ?? 100;
                usleep($delayMs * 1000);
                $attempt++;
            }
        } while (true);
    }

    /**
     * Retryable = the Windows transient-lock signatures only:
     *   - driver code 5  (SQLITE_BUSY / "database is locked")
     *   - driver code 14 (SQLITE_CANTOPEN / "unable to open database file")
     */
    protected function isTransientLock(QueryException $e): bool
    {
        $code = (int) ($e->errorInfo[1] ?? 0);
        if ($code === 5 || $code === 14) {
            return true;
        }

        $message = (string) $e->getMessage();

        return str_contains($message, 'unable to open database file')
            || str_contains($message, 'database is locked');
    }
}
