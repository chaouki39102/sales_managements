<?php

namespace App\Services\System;

use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;

/**
 * WindowsPrinterService — اكتشاف الطابعات المثبتة على ويندوز (SSOT).
 *
 * يقرأ قائمة الطابعات من نظام التشغيل نفسه عبر PowerShell
 * (Get-CimInstance Win32_Printer) — نفس القائمة التي تظهر في
 * إعدادات ويندوز ← الطابعات والماسحات الضوئية.
 *
 * ملاحظة نشر: الطابعات المقروءة هي طابعات الخادم الذي يشغّل PHP.
 * في نشر هذا المشروع (خادم محلي على جهاز نقطة البيع) هي نفسها
 * طابعات الجهاز الذي يستعمله المستخدم.
 */
class WindowsPrinterService
{
    private const CACHE_KEY = 'win-printers:list';
    private const CACHE_TTL = 30; // ثانية

    public function isWindows(): bool
    {
        return PHP_OS_FAMILY === 'Windows';
    }

    /**
     * @return array{printers: array<int, array<string, mixed>>, platform: string, error: ?string}
     */
    public function list(): array
    {
        if (!$this->isWindows()) {
            return ['printers' => [], 'platform' => PHP_OS_FAMILY, 'error' => null];
        }

        $cached = Cache::get(self::CACHE_KEY);
        if (is_array($cached)) {
            return ['printers' => $cached, 'platform' => PHP_OS_FAMILY, 'error' => null];
        }

        try {
            $printers = $this->enumerate();
            Cache::put(self::CACHE_KEY, $printers, self::CACHE_TTL);

            return ['printers' => $printers, 'platform' => PHP_OS_FAMILY, 'error' => null];
        } catch (\Throwable $e) {
            return ['printers' => [], 'platform' => PHP_OS_FAMILY, 'error' => $e->getMessage()];
        }
    }

    /**
     * إرسال صفحة اختبار إلى طابعة عبر Windows Print Spooler.
     *
     * الاسم يُتحقَّق منه ضد قائمة الطابعات التي أبلغ عنها النظام (allowlist)،
     * ثم يُمرَّر داخل سكربت PowerShell عبر stdin (لا shell string) — فلا مجال
     * لحقن الأوامر حتى لو تغيّرت القائمة بين التحقق والتنفيذ.
     */
    public function testPrint(string $name): void
    {
        $known = array_map(
            fn ($p) => mb_strtolower($p['name']),
            $this->list()['printers'],
        );
        if (!in_array(mb_strtolower($name), $known, true)) {
            throw new \RuntimeException('الطابعة غير موجودة في قائمة طابعات النظام.');
        }

        $safe = str_replace("'", "''", $name);
        $date = now()->format('Y-m-d H:i');

        // here-string PowerShell: يجب أن يبدأ "@ وينتهي '@ في أول السطر تماماً
        $script = "\$text = @'\n"
            . "================================\n"
            . "   TEST PAGE - POSDZ\n"
            . "   الطابعة تعمل بنجاح\n"
            . "   {$date}\n"
            . "================================\n"
            . "'@\n"
            . "\$text | Out-Printer -Name '{$safe}'";

        $this->runPowerShell($script, 20);
    }

    /**
     * تعداد الطابعات عبر WMI وتطبيعها إلى شكل موحّد للـ API.
     *
     * Win32_Printer.PrinterStatus:
     * 3 = Idle (جاهزة), 4 = Printing, 5 = Warmup, 7 = Offline.
     */
    private function enumerate(): array
    {
        $script = 'Get-CimInstance Win32_Printer | '
            . 'Select-Object Name,DriverName,PortName,Default,WorkOffline,Shared,Local,PrinterStatus | '
            . 'ConvertTo-Json -Compress -Depth 2';

        $out = $this->runPowerShell($script, 10);

        $decoded = json_decode(trim($out), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('تعذر تحليل مخرجات PowerShell.');
        }
        if ($decoded === null || $decoded === []) {
            return [];
        }
        // طابعة واحدة → ConvertTo-Json يعيد كائناً واحداً وليس مصفوفة
        if (!isset($decoded[0])) {
            $decoded = [$decoded];
        }

        $printers = [];
        foreach ($decoded as $row) {
            $name = trim((string) ($row['Name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $status = (int) ($row['PrinterStatus'] ?? 0);
            $workOffline = (bool) ($row['WorkOffline'] ?? false);

            if ($workOffline || $status === 7) {
                $state = 'offline';       // غير متصلة
            } elseif ($status === 4) {
                $state = 'printing';      // قيد الطباعة
            } elseif ($status === 3 || $status === 5 || $status === 0) {
                $state = 'ready';         // جاهزة / تسخين
            } else {
                $state = 'unknown';
            }

            $printers[] = [
                'name'         => $name,
                'driver'       => (string) ($row['DriverName'] ?? ''),
                'port'         => (string) ($row['PortName'] ?? ''),
                'is_default'   => (bool) ($row['Default'] ?? false),
                'work_offline' => $workOffline,
                'shared'       => (bool) ($row['Shared'] ?? false),
                'local'        => (bool) ($row['Local'] ?? true),
                'status'       => $state,
                'status_label' => match ($state) {
                    'ready'    => 'جاهزة',
                    'printing' => 'قيد الطباعة',
                    'offline'  => 'غير متصلة',
                    default    => 'غير معروفة',
                },
            ];
        }

        // الافتراضية أولاً ثم أبجدياً
        usort($printers, function ($a, $b) {
            if ($a['is_default'] !== $b['is_default']) {
                return $a['is_default'] ? -1 : 1;
            }

            return strcasecmp($a['name'], $b['name']);
        });

        return $printers;
    }

    /**
     * تنفيذ سكربت PowerShell — يُمرَّر عبر ‎-EncodedCommand
     * (Base64 لـ UTF-16LE) فلا تمر أي مدخلات عبر shell string
     * ولا عبر stdin (وضع ‎-Command - يعلّق في PS 5.1 غير التفاعلي).
     */
    private function runPowerShell(string $script, int $timeout): string
    {
        $encoded = base64_encode((string) iconv('UTF-8', 'UTF-16LE', $script));

        $process = new Process([
            'powershell',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-EncodedCommand',
            $encoded,
        ]);
        $process->setTimeout($timeout);
        $process->run();

        if (!$process->isSuccessful()) {
            $err = trim($process->getErrorOutput());

            throw new \RuntimeException($err !== '' ? $err : 'فشل تنفيذ أمر النظام.');
        }

        return $process->getOutput();
    }
}
