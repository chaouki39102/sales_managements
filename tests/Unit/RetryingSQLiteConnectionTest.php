<?php

use App\Support\Database\RetryingSQLiteConnection;
use Illuminate\Database\QueryException;
use Tests\TestCase;

uses(TestCase::class);

/**
 * A PDO subclass that fails the first N prepare() calls with a Windows
 * transient-lock PDOException, then delegates to a real in-memory sqlite.
 */
class FlakyLockPdo extends PDO
{
    public int $failuresLeft;

    private PDO $real;

    private string $errorMessage;

    private int $errorCode;

    public function __construct(int $failuresLeft, string $errorMessage, int $errorCode)
    {
        parent::__construct('sqlite::memory:');
        $this->real = new PDO('sqlite::memory:');
        $this->failuresLeft = $failuresLeft;
        $this->errorMessage = $errorMessage;
        $this->errorCode = $errorCode;
    }

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        if ($this->failuresLeft > 0) {
            $this->failuresLeft--;
            $previous = new Exception($this->errorMessage, $this->errorCode);
            throw new PDOException($this->errorMessage, $this->errorCode, $previous);
        }

        return $this->real->prepare($query, $options);
    }
}

function makeFlakyConnection(int $failuresLeft, string $message, int $code): RetryingSQLiteConnection
{
    $pdo = new FlakyLockPdo($failuresLeft, $message, $code);

    return new RetryingSQLiteConnection($pdo, ':memory:', '', [
        'database' => ':memory:',
        // Keep the give-up test fast: tiny per-retry backoff (5 retries → 6 attempts).
        'retry_delays_ms' => [0, 1, 1, 1, 1],
    ]);
}

it('retries a transient CANTOPEN (error 14) and succeeds', function () {
    $conn = makeFlakyConnection(2, 'unable to open database file', 14);

    $rows = $conn->select("select 'ok' as greeting");

    expect($rows)->toHaveCount(1)
        ->and($rows[0]->greeting)->toBe('ok')
        ->and($conn->getPdo()->failuresLeft)->toBe(0);
});

it('retries a transient database-is-locked (error 5) and succeeds', function () {
    $conn = makeFlakyConnection(1, 'database is locked', 5);

    $rows = $conn->select("select 'ok' as greeting");

    expect($rows)->toHaveCount(1)
        ->and($rows[0]->greeting)->toBe('ok')
        ->and($conn->getPdo()->failuresLeft)->toBe(0);
});

it('gives up after maxRetries retries and surfaces the original QueryException', function () {
    // Test config → 5 retries after the initial attempt → 6 prepare() calls total.
    $conn = makeFlakyConnection(99, 'unable to open database file', 14);

    try {
        $conn->select("select 'ok' as greeting");
        $this->fail('Expected QueryException was not thrown.');
    } catch (QueryException $e) {
        expect($e->getMessage())->toContain('unable to open database file')
            ->and($conn->getPdo()->failuresLeft)->toBe(99 - 6);
    }
});

it('does NOT retry non-transient errors', function () {
    // First prepare throws a non-transient error (code 1). It is consumed once
    // by the single attempt, then the REAL sqlite surfaces the natural
    // "no such table" error — which must propagate without any retry loop.
    $conn = makeFlakyConnection(1, 'SQLSTATE[HY000]: General error: 1 no such table: missing', 1);

    try {
        $conn->select('select * from missing_table');
        $this->fail('Expected QueryException was not thrown.');
    } catch (QueryException $e) {
        expect($e->getMessage())->toContain('no such table')
            ->and($conn->getPdo()->failuresLeft)->toBe(0); // only the single attempt, never retried
    }
});
