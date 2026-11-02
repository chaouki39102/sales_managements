<?php

use App\Services\System\WindowsPrinterService;
use Tests\TestCase;

uses(TestCase::class);

/**
 * RAW TCP ESC/POS transport contract (WindowsPrinterService::rawTcpPrint).
 *
 * WHY A REAL SOCKET AND NOT A MOCK
 * -------------------------------
 * The whole point of this path is that network receipt printers (Ethernet/Wi-Fi
 * ESC/POS boxes) accept raw bytes on port 9100 with no Windows driver, no spooler
 * and no WebUSB enumeration. A mocked `fsockopen` would only prove the wrapper
 * calls the wrapper — it could not prove that every byte actually leaves the
 * process, that the write loop iterates for payloads larger than the socket
 * buffer, or that the socket is always closed. `stream_socket_server` on
 * 127.0.0.1 with an ephemeral port (`:0`) gives a real, hardware-free peer.
 *
 * THE CONTRACT THIS LOCKS IN
 * --------------------------
 *  1. ALL decoded bytes reach the socket and the return value is the byte count.
 *  2. A near-ceiling payload (just under the 1 MiB cap) arrives INTACT — no
 *     truncation, no reordering, no short return. The write loop is defensive
 *     rather than load-bearing: on a blocking socket `fwrite` already drains
 *     the buffer, so this case proves the end-to-end size contract, not that
 *     `fwrite` was called more than once.
 *  3. A blank host is refused before any socket is opened.
 *  4. Base64 is decoded STRICTLY, and empty data is refused.
 *  5. Payloads above 1 MiB are refused (a runaway buffer must not reach the socket).
 *  6. An unreachable printer raises a RuntimeException naming host:port, so the
 *     HTTP layer can show the operator which printer was actually tried.
 *  7. An out-of-range port falls back to the ESC/POS default 9100.
 *
 * No database is required — rawTcpPrint() touches neither Eloquent nor Cache.
 */

/**
 * @return array{0: resource, 1: int} [server, port]
 */
function rawTcpTestServer(): array
{
    $errno = 0;
    $errstr = '';
    $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);

    expect($server)->not->toBeFalse("local TCP test server failed: {$errstr} ({$errno})");

    $name = (string) stream_socket_get_name($server, false);
    $port = (int) substr($name, strrpos($name, ':') + 1);

    return [$server, $port];
}

/**
 * Drains whatever the printer peer has buffered, then returns it.
 */
function rawTcpTestReceive($server, int $expectedBytes): string
{
    $conn = stream_socket_accept($server, 5);
    expect($conn)->not->toBeFalse('the printer peer never accepted a connection');

    stream_set_timeout($conn, 5);
    $received = '';

    while (strlen($received) < $expectedBytes) {
        $chunk = fread($conn, min(65536, $expectedBytes - strlen($received)));
        if ($chunk === false || $chunk === '') {
            break;
        }
        $received .= $chunk;
    }

    fclose($conn);

    return $received;
}

it('streams every byte of the decoded payload to the printer socket', function () {
    [$server, $port] = rawTcpTestServer();

    // A realistic ESC/POS preamble + Arabic text + cut.
    $payload = "\x1b@\x1bE\x01POSDZ \xD9\x81\xD8\xA7\xD8\xB1\xD8\xAD\n\n\x1dV\x00";

    $written = (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', $port, base64_encode($payload), 5);

    expect($written)->toBe(strlen($payload));
    expect(rawTcpTestReceive($server, strlen($payload)))->toBe($payload);

    fclose($server);
});

it('trims the host so a padded address still connects', function () {
    [$server, $port] = rawTcpTestServer();
    $payload = "\x1b@padded-host\n";

    $written = (new WindowsPrinterService())->rawTcpPrint("  127.0.0.1\t", $port, base64_encode($payload), 5);

    expect($written)->toBe(strlen($payload));
    expect(rawTcpTestReceive($server, strlen($payload)))->toBe($payload);

    fclose($server);
});

it('delivers a near-ceiling payload intact and reports the true byte count', function () {
    [$server, $port] = rawTcpTestServer();

    // Just under the 1 MiB ceiling: the largest receipt this path accepts.
    $payload = str_repeat("\x1b@line 1234567890 abcdefghijklmnop\r\n", 28000);

    expect(strlen($payload))->toBeLessThanOrEqual(1024 * 1024);

    $written = (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', $port, base64_encode($payload), 5);

    expect($written)->toBe(strlen($payload));
    expect(rawTcpTestReceive($server, strlen($payload)))->toBe($payload);

    fclose($server);
});

it('refuses a blank host before opening any socket', function (string $host) {
    (new WindowsPrinterService())->rawTcpPrint($host, 9100, base64_encode("\x1b@x"), 5);
})->with([
    'empty' => [''],
    'spaces' => ['   '],
])->throws(RuntimeException::class, 'عنوان طابعة RAW TCP غير محدد.');

it('refuses invalid base64 data', function () {
    (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', 9100, 'not base64 @@', 5);
})->throws(RuntimeException::class, 'بيانات الطباعة غير صالحة.');

it('refuses empty decoded data', function () {
    (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', 9100, '', 5);
})->throws(RuntimeException::class, 'بيانات الطباعة غير صالحة.');

it('refuses payloads above the 1 MiB ceiling', function () {
    $oversize = base64_encode(str_repeat('x', (1024 * 1024) + 1));

    (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', 9100, $oversize, 5);
})->throws(RuntimeException::class, 'حجم بيانات الطباعة كبير جداً.');

it('names host and port when the printer is unreachable', function () {
    // Bind then immediately release a port so nothing is listening on it.
    [$server, $port] = rawTcpTestServer();
    fclose($server);

    $host = '127.0.0.1';
    $thrown = null;

    try {
        (new WindowsPrinterService())->rawTcpPrint($host, $port, base64_encode("\x1b@x"), 2);
    } catch (RuntimeException $e) {
        $thrown = $e;
    }

    expect($thrown)->not->toBeNull();
    expect($thrown->getMessage())->toContain("{$host}:{$port}");
});

it('falls back to port 9100 for an out-of-range port', function () {
    // Guard the environment: if a real printer happens to answer on 9100 this
    // assertion is meaningless (and we would not want to write to it).
    $probe = @fsockopen('127.0.0.1', 9100, $errno, $errstr, 0.3);
    if ($probe !== false) {
        fclose($probe);
        $this->markTestSkipped('something is already listening on 127.0.0.1:9100');
    }

    $thrown = null;

    try {
        (new WindowsPrinterService())->rawTcpPrint('127.0.0.1', 0, base64_encode("\x1b@x"), 2);
    } catch (RuntimeException $e) {
        $thrown = $e;
    }

    expect($thrown)->not->toBeNull();
    expect($thrown->getMessage())->toContain('127.0.0.1:9100');
});
