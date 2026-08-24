<?php

namespace App\Services\System;

use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
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

    /**
     * محرك طباعة أصلي مُصرَّف مرة واحدة (بدون PowerShell إطلاقاً).
     *
     * لماذا؟ المسار السابق كان يشغّل powershell.exe في كل عملية طباعة:
     * ~1.3s بداية باردة + إعادة ترجمة Add-Type كل مرة، والمشغّل الخارجي
     * الذي يطلقه proc_open يحصل على كونسول خاص به عندما لا يكون للعملية
     * الأم كونسول يُورَّث → وميض نافذة أمام المستخدم.
     *
     * الحل: برنامج C# صغير يُترجم مرة واحدة عبر csc.exe بوصفه ‎/target:winexe
     * (تطبيق واجهة رسومية من الناحية الـ Win32 — لا يُسند له كونسول أبداً،
     * فلا وميض مهما كانت حالة العملية الأم)، ويُطلَق مباشرة عبر Symfony
     * Process، والنتيجة تعود عبر ملف JSON (لا أنابيب تُورَّث ولا stdout
     * يُلتقط — نفس سبب تعليق محاولة wscript السابقة تم استبعاده هنا).
     * ترجمة csc نفسها (تطبيق كونسول) تمر مرة واحدة عبر مشغّل ‎.vbs مخفي.
     */
    private const HELPER_CS = <<<'CSCODE'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class PosdzPrint {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  static string J(string s) {
    var sb = new StringBuilder("\"");
    foreach (char c in s ?? "") {
      switch (c) {
        case '"': sb.Append("\\\""); break;
        case '\\': sb.Append("\\\\"); break;
        case '\b': sb.Append("\\b"); break;
        case '\f': sb.Append("\\f"); break;
        case '\n': sb.Append("\\n"); break;
        case '\r': sb.Append("\\r"); break;
        case '\t': sb.Append("\\t"); break;
        default:
          if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
          else sb.Append(c);
          break;
      }
    }
    return sb.Append('"').ToString();
  }

  public static int Main(string[] args) {
    // التخطيط الثابت: <op> <printer> <inputFile> <copies> <timeoutSec> <resultPath>
    if (args.Length < 6) return 2;
    string op = args[0];
    string printer = args[1];
    string inFile = args[2];
    int copies = ParseCopies(args[3]);
    int timeoutSec = 40;
    int t;
    if (int.TryParse(args[4], out t)) { timeoutSec = Math.Max(10, t); }
    string resPath = args[5];

    string error = null;
    string dataJson = "null";
    var done = new ManualResetEvent(false);
    using (var watchdog = new Timer(x => {
      try { File.WriteAllText(resPath, "{\"ok\":false,\"error\":\"timeout\"}", new UTF8Encoding(false)); } catch {}
      Environment.Exit(124);
    })) {
      watchdog.Change(timeoutSec * 1000, Timeout.Infinite);
      var worker = new Thread(() => {
        try {
          switch (op) {
            case "list": dataJson = ListPrinters(); break;
            case "raw": RawPrint(printer, inFile, copies); break;
            case "text": TextPrint(printer, inFile, copies); break;
            case "test": TestPrint(printer); break;
            default: throw new Exception("unknown op");
          }
        } catch (Exception ex) { error = ex.GetType().Name + ": " + ex.Message + (ex.InnerException != null ? " < " + ex.InnerException.Message : ""); }
        finally { done.Set(); }
      });
      worker.SetApartmentState(ApartmentState.STA);
      worker.Start();
      worker.Join();
    }

    var sb = new StringBuilder();
    sb.Append("{\"ok\":").Append(error == null ? "true" : "false");
    if (error != null) sb.Append(",\"error\":").Append(J(error));
    if (error == null && dataJson != "null") sb.Append(",\"data\":").Append(dataJson);
    sb.Append('}');
    File.WriteAllText(resPath, sb.ToString(), new UTF8Encoding(false));
    return error == null ? 0 : 1;
  }

  static int ParseCopies(string s) { int c; return Math.Max(1, Math.Min(10, int.TryParse(s, out c) ? c : 1)); }

  static string ListPrinters() {
    var rows = new List<string[]>();
    using (var searcher = new ManagementObjectSearcher("SELECT Name,DriverName,PortName,Default,WorkOffline,Shared,Local,PrinterStatus FROM Win32_Printer")) {
      foreach (ManagementObject o in searcher.Get()) {
        string name = (o["Name"] ?? "").ToString().Trim();
        if (name.Length == 0) continue;
        int status = Convert.ToInt32(o["PrinterStatus"] ?? 0);
        bool offline = Convert.ToBoolean(o["WorkOffline"] ?? false);
        bool isDefault = Convert.ToBoolean(o["Default"] ?? false);
        string state = (offline || status == 7) ? "offline" : (status == 4 ? "printing" : (status == 3 || status == 5 || status == 0 ? "ready" : "unknown"));
        string label = state == "ready" ? "\u062C\u0627\u0647\u0632\u0629" : state == "printing" ? "\u0642\u064A\u062F \u0627\u0644\u0637\u0628\u0627\u0639\u0629" : state == "offline" ? "\u063A\u064A\u0631 \u0645\u062A\u0635\u0644\u0629" : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629";
        rows.Add(new string[] {
          "{\"name\":" + J(name)
            + ",\"driver\":" + J((o["DriverName"] ?? "").ToString())
            + ",\"port\":" + J((o["PortName"] ?? "").ToString())
            + ",\"is_default\":" + (isDefault ? "true" : "false")
            + ",\"work_offline\":" + (offline ? "true" : "false")
            + ",\"shared\":" + (Convert.ToBoolean(o["Shared"] ?? false) ? "true" : "false")
            + ",\"local\":" + (Convert.ToBoolean(o["Local"] ?? true) ? "true" : "false")
            + ",\"status\":" + J(state)
            + ",\"status_label\":" + J(label) + "}",
          name,
          isDefault ? "1" : "0",
        });
      }
    }
    // الافتراضية أولاً ثم أبجدياً (نفس ترتيب الخدمة السابقة)
    rows.Sort((a, b) => {
      if (!a[2].Equals(b[2], StringComparison.Ordinal)) return a[2] == "1" ? -1 : 1;
      return string.Compare(a[1], b[1], StringComparison.OrdinalIgnoreCase);
    });
    var parts = new List<string>();
    foreach (string[] r in rows.ToArray()) { parts.Add(r[0]); }
    return "[" + string.Join(",", parts.ToArray()) + "]";
  }

  static void RawPrint(string printer, string file, int copies) {
    for (int i = 0; i < copies; i++) {
      if (!SendFileToPrinter(printer, file)) throw new Exception("spooler write failed");
    }
  }

  static bool SendFileToPrinter(string szPrinterName, string szFileName) {
    bool ok = false;
    using (FileStream fs = new FileStream(szFileName, FileMode.Open, FileAccess.Read)) {
      Byte[] bytes = new Byte[fs.Length];
      fs.Read(bytes, 0, (int)fs.Length);
      IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
      Marshal.Copy(bytes, 0, pBytes, bytes.Length);
      IntPtr hPrinter = IntPtr.Zero;
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "POSDZ Receipt";
      di.pDataType = "RAW";
      if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
        if (StartDocPrinter(hPrinter, 1, di)) {
          if (StartPagePrinter(hPrinter)) {
            int dwWritten;
            ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
            EndPagePrinter(hPrinter);
          }
          EndDocPrinter(hPrinter);
        }
        ClosePrinter(hPrinter);
      }
      Marshal.FreeCoTaskMem(pBytes);
    }
    return ok;
  }

  static void TestPrint(string printer) {
    string[] lines = {
      "================================",
      "   TEST PAGE - POSDZ",
      "   \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u062A\u0639\u0645\u0644 \u0628\u0646\u062C\u0627\u062D",
      "   " + DateTime.Now.ToString("yyyy-MM-dd HH:mm"),
      "================================",
    };
    PrintLines(printer, lines, 1);
  }

  static void TextPrint(string printer, string file, int copies) {
    PrintLines(printer, File.ReadAllLines(file, Encoding.UTF8), copies);
  }

  static void PrintLines(string printer, string[] lines, int copies) {
    using (var pd = new PrintDocument()) {
      pd.PrinterSettings.PrinterName = printer;
      pd.DocumentName = "POSDZ Receipt";
      using (Font font = new Font("Segoe UI", 9f)) {
        float maxW;
        using (Graphics g = pd.PrinterSettings.CreateMeasurementGraphics()) { maxW = g.VisibleClipBounds.Width - 40f; }
        var flat = new List<string>();
        foreach (string ln in lines) {
          string rest = ln ?? "";
          while (rest.Length > 0) {
            int take = Math.Min(rest.Length, 200);
            using (Graphics g = pd.PrinterSettings.CreateMeasurementGraphics()) {
              while (take > 1 && g.MeasureString(rest.Substring(0, take), font).Width > maxW) { take--; }
            }
            flat.Add(rest.Substring(0, take));
            rest = rest.Substring(take);
          }
        }
        int idx = 0;
        PrintPageEventHandler h = (s, e) => {
          float lh = font.GetHeight(e.Graphics) + 3f;
          float bottom = e.Graphics.VisibleClipBounds.Height - 20f;
          float y = 20f;
          while (idx < flat.Count) {
            if ((y + lh) > bottom) { e.HasMorePages = true; return; }
            e.Graphics.DrawString(flat[idx], font, Brushes.Black, 20f, y);
            y += lh; idx++;
          }
          e.HasMorePages = false;
        };
        pd.PrintPage += h;
        for (int i = 0; i < copies; i++) { idx = 0; pd.Print(); }
      }
    }
  }
}
CSCODE;

    public function isWindows(): bool
    {
        return PHP_OS_FAMILY === 'Windows';
    }

    /**
     * مسارات أدوات محرك الطباعة الأصلي.
     *
     * @return array{dir: string, src: string, exe: string, marker: string}
     */
    private function helperPaths(): array
    {
        $dir = storage_path('app/tools');

        return [
            'dir' => $dir,
            'src' => $dir.DIRECTORY_SEPARATOR.'posdz_print_helper.cs',
            'exe' => $dir.DIRECTORY_SEPARATOR.'posdz_print_helper.exe',
            'marker' => $dir.DIRECTORY_SEPARATOR.'posdz_print_helper.md5',
        ];
    }

    private function resolveCsc(): string
    {
        foreach (['Framework64', 'Framework'] as $bits) {
            $csc = 'C:\\Windows\\Microsoft.NET\\'.$bits.'\\v4.0.30319\\csc.exe';
            if (is_file($csc)) {
                return $csc;
            }
        }

        throw new PrinterHelperUnavailableException('مُصرِّف ‎.NET (csc.exe) غير موجود.');
    }

    /**
     * ضمان وجود المحرك المصرَّف — يُبنى مرة واحدة ويُعاد بناؤه فقط إذا تغيّر
     * المصدر (بصمة md5). الترجمة نفسها تمر عبر COM المخفي أيضاً.
     */
    private function ensureHelper(): string
    {
        $p = $this->helperPaths();
        if (!is_dir($p['dir']) && !@mkdir($p['dir'], 0775, true) && !is_dir($p['dir'])) {
            throw new PrinterHelperUnavailableException('تعذر تجهيز مجلد أدوات الطباعة.');
        }

        $want = md5(self::HELPER_CS);
        if (is_file($p['exe']) && is_file($p['marker'])
            && trim((string) @file_get_contents($p['marker'])) === $want) {
            return $p['exe'];
        }

        // BOM حتى يقرأ csrc حرفية النصوص العربية كـ UTF-8 صحيحاً
        if (file_put_contents($p['src'], "\xEF\xBB\xBF".self::HELPER_CS) === false) {
            throw new PrinterHelperUnavailableException('تعذر كتابة مصدر محرك الطباعة.');
        }

        $csc = $this->resolveCsc();
        $tmpExe = $p['exe'].'.'.getmypid().'.'.bin2hex(random_bytes(3)).'.tmp';
        $outLog = $tmpExe.'.log';

        // cmd /c مع إعادة توجيه المخرجات لملف — حتى نرى سبب فشل csc فعلياً
        $q = fn (string $s): string => '"'.str_replace('"', '', $s).'"';
        $cmd = 'cmd /c "'.$q($csc)
            .' /nologo /target:winexe /platform:anycpu /optimize+'
            .' /r:System.Drawing.dll /r:System.Management.dll'
            .' /out:'.$q($tmpExe).' '.$q($p['src'])
            .' >'.$q($outLog).' 2>&1"';

        $exit = $this->runHidden($cmd, 180);

        if (!is_file($tmpExe)) {
            \Log::debug('[WinPrint] compile failed', [
                'exit' => $exit,
                'csc_out' => substr((string) @file_get_contents($outLog), 0, 800),
            ]);
            @unlink($outLog);

            // بعض بيئات الويب تحجب تشغيل المُصرِّف من سلسلة خادم الويب
            // (CS0016 رفض الوصول). إن وُجد محرك سابق يعمل نخدمه كما هو —
            // عقد الاستدعاء مستقر — وإلا نفشل بوضوح.
            if (is_file($p['exe'])) {
                \Log::debug('[WinPrint] serving stale helper exe after compile failure');

                return $p['exe'];
            }

            throw new PrinterHelperUnavailableException('فشلت ترجمة محرك الطباعة.');
        }
        @unlink($outLog);

        @unlink($p['exe']);
        if (!@rename($tmpExe, $p['exe'])) {
            @copy($tmpExe, $p['exe']);
            @unlink($tmpExe);
        }

        if (!is_file($p['exe'])) {
            throw new PrinterHelperUnavailableException('تعذر تثبيت محرك الطباعة.');
        }
        @file_put_contents($p['marker'], $want);

        return $p['exe'];
    }

    /**
     * تنظيف أي رسالة قادمة من ويندوز (CLIXML / صفحة ترميز OEM) إلى UTF-8
     * سليم — رسالة غير سليمة تُسقط json_encode للاستجابة كلها (HTTP 500).
     */
    private static function utf8Safe(string $s): string
    {
        if (preg_match('//u', $s)) {
            return $s;
        }

        $conv = @mb_convert_encoding($s, 'UTF-8', 'Windows-1252');

        return is_string($conv) ? $conv : preg_replace('/[^\x20-\x7E]/', '?', $s) ?? '';
    }

    /**
     * تشغيل أمر كونسولي (ترجمة csc) بلا أي نافذة على الإطلاق، دون الاعتماد
     * على إضافة com_dotnet: سكربت ‎.vbs صغير يُطلَق عبر wscript.exe (تطبيق
     * من نوع GUI — لا يُسند له كونسول أبداً) وهو بدوره يشغّل الأمر بنمط
     * نافذة 0 مع الانتظار ويعيد كود الخروج. //B يكتم أي خطأ سكربت.
     */
    private function runHidden(string $cmdLine, int $timeout): int
    {
        $tmp = rtrim(sys_get_temp_dir(), '\\/');
        $vbsPath = $tmp.DIRECTORY_SEPARATOR.'posdz_run_'.bin2hex(random_bytes(6)).'.vbs';

        try {
            $vbs = "Set sh = CreateObject(\"WScript.Shell\")\r\n"
                .'code = sh.Run("'.str_replace('"', '""', $cmdLine)."\", 0, True)\r\n"
                ."WScript.Quit code\r\n";

            // UTF-16LE مع BOM — الصيغة التي يقرؤها wscript بأمان مهما كانت
            // مسارات النظام (المسارات هنا ASCII عملياً، وهذا احتياط)
            if (file_put_contents($vbsPath, "\xFF\xFE".mb_convert_encoding($vbs, 'UTF-16LE', 'UTF-8')) === false) {
                throw new PrinterHelperUnavailableException('تعذر تجهيز مشغّل الترجمة المخفي.');
            }

            $process = new Process([
                'wscript', '//B', '//nologo', '//T:' . max(30, $timeout), $vbsPath,
            ], $tmp); // CWD صريح في temp — أدوات ويندوز قد تُنشئ ملفات نسبية بجانب المجلد الحالي
            $process->setTimeout(max(30, $timeout));
            $process->run();

            return $process->getExitCode() ?? 1;
        } catch (ProcessTimedOutException $e) {
            throw new PrinterHelperUnavailableException('انتهت مهلة تشغيل المشغّل المخفي.', 0, $e);
        } finally {
            @unlink($vbsPath);
        }
    }

    /**
     * استدعاء موحّد لأوامر المحرك: list | raw | text | test.
     * أخطاء البنية التحتية (ترجمة/COM/نتيجة مفقودة) → PrinterHelperUnavailableException
     * ليتولى المستدعي التراجع إلى مسار PowerShell؛ أما أخطاء العمل الفعلية
     * (طابعة فاشلة مثلاً) فتعود RuntimeException عادية برسالة المحرك العربية.
     */
    private function runHelper(string $op, string $printer, string $file, int $copies, int $timeout)
    {
        $exe = $this->ensureHelper();

        $tmp = rtrim(sys_get_temp_dir(), '\\/');
        $resPath = $tmp.DIRECTORY_SEPARATOR.'posdz_res_'.bin2hex(random_bytes(6)).'.json';

        // المحرك winexe — لا كونسول له مهما كانت حالة العملية الأم،
        // فتُطلَقه Symfony Process مباشرة بلا أي مشغّل وسيط.
        try {
            $process = new Process([
                $exe, $op, $printer, $file,
                (string) max(1, min(10, $copies)),
                (string) max(10, $timeout),
                $resPath,
            ], $tmp); // CWD صريح في temp — حماية من مخلفات الأدوات النسبية
            $process->setTimeout(max(15, $timeout + 5));
            $process->run();
        } catch (ProcessTimedOutException $e) {
            throw new PrinterHelperUnavailableException('تجاوز محرك الطباعة مهلته.', 0, $e);
        }

        if (!is_file($resPath)) {
            \Log::debug('[WinPrint] helper no-result', [
                'op' => $op,
                'printer' => $printer,
                'exit' => $process->getExitCode(),
                'stdout' => substr((string) $process->getOutput(), 0, 500),
                'stderr' => substr((string) $process->getErrorOutput(), 0, 500),
            ]);

            throw new PrinterHelperUnavailableException(
                "محرك الطباعة لم يُعد نتيجة (exit={$process->getExitCode()})."
            );
        }

        try {
            $decoded = json_decode((string) file_get_contents($resPath), true);
            if (!is_array($decoded) || !array_key_exists('ok', $decoded)) {
                throw new PrinterHelperUnavailableException('نتيجة محرك الطباعة غير صالحة.');
            }

            if (empty($decoded['ok'])) {
                @file_put_contents(storage_path('app/tools/last_error.json'), (string) file_get_contents($resPath));

                $err = (string) ($decoded['error'] ?? 'فشل تنفيذ أمر النظام.');
                if (!preg_match('//u', $err)) {
                    $err = mb_convert_encoding($err, 'UTF-8', 'Windows-1252');
                }

                throw new \RuntimeException($err);
            }

            return $decoded['data'] ?? null;
        } finally {
            @unlink($resPath);
        }
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
     * الاسم يُتحقَّق منه ضد قائمة الطابعات التي أبلغ عنها النظام (allowlist)
     * قبل أي تنفيذ — فلا مجال لحقن الأوامر حتى لو تغيّرت القائمة بين
     * التحقق والتنفيذ. التنفيذ الأساسي عبر المحرك الأصلي المصرَّف، ومسار
     * PowerShell احتياطي فقط إذا تعذّرت البنية التحتية للمحرك.
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

        try {
            $this->runHelper('test', $name, '-', 1, 25);

            return;
        } catch (PrinterHelperUnavailableException $e) {
            // المحرك الأصلي غير متاح — نتراجع إلى PowerShell أدناه
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
     * إرسال بايتات خام (ESC/POS) إلى طابعة عبر Windows Print Spooler.
     *
     * هذا هو الحل الجذري لفشل WebUSB على ويندوز: تعريف النظام (usbprint.sys)
     * يحجز واجهة الطابعة من نوع printer-class فور توصيلها، وكروم لا يستطيع
     * فك هذا الحجز على ويندوز — لذا تفشل claimInterface دائماً حتى لو لم
     * يستهلك أي برنامج الطابعة ظاهرياً. الإرسال عبر الـ spooler يتجاوز
     * هذا الحجز تماماً (نوع البيانات RAW يمرر البايتات كما هي للمنفذ).
     *
     * المسار: base64 → ملف مؤقت → P/Invoke winspool.drv
     * (OpenPrinter/StartDocPrinter/WritePrinter) داخل PowerShell.
     * الاسم يتحقق ضد قائمة النظام (allowlist) قبل التنفيذ.
     */
    public function rawPrint(string $name, string $base64Data, int $copies = 1): void
    {
        $known = array_map(
            fn ($p) => mb_strtolower($p['name']),
            $this->list()['printers'],
        );
        if (!in_array(mb_strtolower($name), $known, true)) {
            throw new \RuntimeException('الطابعة غير موجودة في قائمة طابعات النظام.');
        }

        $bytes = base64_decode($base64Data, true);
        if ($bytes === false || strlen($bytes) === 0) {
            throw new \RuntimeException('بيانات الطباعة غير صالحة.');
        }
        if (strlen($bytes) > 1024 * 1024) {
            throw new \RuntimeException('حجم بيانات الطباعة كبير جداً.');
        }

        $copies = max(1, min(10, $copies));

        $path = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR
            . 'posdz_raw_' . bin2hex(random_bytes(6)) . '.bin';
        if (file_put_contents($path, $bytes) === false) {
            throw new \RuntimeException('تعذر تجهيز ملف الطباعة المؤقت.');
        }

        try {
            // المسار الأساسي: المحرك الأصلي المصرَّف (بلا PowerShell وبلا نافذة)
            try {
                $this->runHelper('raw', $name, $path, $copies, 30);

                return;
            } catch (PrinterHelperUnavailableException $e) {
                // البنية التحتية للمحرك غير متاحة — نتراجع إلى PowerShell أدناه
            }

            $escName = str_replace("'", "''", $name);
            $escPath = str_replace("'", "''", $path);

            // C# NOWDOC — لا استيفاء PHP، ويُحقن داخل here-string بسطر واحد
            $cs = <<<'CS'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
    bool ok = false;
    FileStream fs = null;
    try {
      fs = new FileStream(szFileName, FileMode.Open, FileAccess.Read);
      Byte[] bytes = new Byte[fs.Length];
      fs.Read(bytes, 0, (int)fs.Length);
      IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
      Marshal.Copy(bytes, 0, pBytes, bytes.Length);
      IntPtr hPrinter = IntPtr.Zero;
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "POSDZ Receipt";
      di.pDataType = "RAW";
      if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
        if (StartDocPrinter(hPrinter, 1, di)) {
          if (StartPagePrinter(hPrinter)) {
            int dwWritten;
            ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
            EndPagePrinter(hPrinter);
          }
          EndDocPrinter(hPrinter);
        }
        ClosePrinter(hPrinter);
      }
      Marshal.FreeCoTaskMem(pBytes);
    } finally {
      if (fs != null) { fs.Dispose(); }
    }
    return ok;
  }
}
CS;

            $csLines = explode("\n", str_replace("\r\n", "\n", $cs));
            $csLiteral = "@'\n" . implode("\n", $csLines) . "\n'@";

            $script = "\$ErrorActionPreference = 'Stop'\n"
                . "Add-Type -TypeDefinition {$csLiteral}\n"
                . "for (\$i = 0; \$i -lt {$copies}; \$i++) {\n"
                . "  \$ok = [RawPrinterHelper]::SendFileToPrinter('{$escName}', '{$escPath}')\n"
                . "  if (-not \$ok) { throw 'spooler write failed' }\n"
                . "}\n"
                . "Write-Output 'OK'\n";

            $this->runPowerShell($script, 25);
        } finally {
            @unlink($path);
        }
    }

    /**
     * طباعة نص عادي (GDI) على أي طابعة مثبتة — صامتة تماماً: بدون معاينة
     * ولا نافذة حوار، وتعمل على الطابعات العادية (ليزر/حبر) التي لا تفهم
     * بايتات ESC/POS الخام (مثل Canon MF3010).
     *
     * المسار: base64(نص UTF-8) → ملف مؤقت → PowerShell + System.Drawing
     * PrintDocument — نفس محرك الطباعة الذي تستعمله Word/Excel داخلياً
     * عبر الـ GDI، فيُرسَل المستند مباشرة إلى الـ spooler.
     */
    public function rawTextPrint(string $name, string $base64Text, int $copies = 1): void
    {
        $known = array_map(
            fn ($p) => mb_strtolower($p['name']),
            $this->list()['printers'],
        );
        if (!in_array(mb_strtolower($name), $known, true)) {
            throw new \RuntimeException('الطابعة غير موجودة في قائمة طابعات النظام.');
        }

        $bytes = base64_decode($base64Text, true);
        if ($bytes === false || strlen($bytes) === 0) {
            throw new \RuntimeException('بيانات الطباعة غير صالحة.');
        }
        if (strlen($bytes) > 512 * 1024) {
            throw new \RuntimeException('حجم نص الطباعة كبير جداً.');
        }

        $copies = max(1, min(10, $copies));

        $path = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR
            . 'posdz_txt_' . bin2hex(random_bytes(6)) . '.txt';
        if (file_put_contents($path, $bytes) === false) {
            throw new \RuntimeException('تعذر تجهيز ملف الطباعة المؤقت.');
        }

        try {
            // المسار الأساسي: المحرك الأصلي المصرَّف (بلا PowerShell وبلا نافذة)
            try {
                $this->runHelper('text', $name, $path, $copies, 40);

                return;
            } catch (PrinterHelperUnavailableException $e) {
                // البنية التحتية للمحرك غير متاحة — نتراجع إلى PowerShell أدناه
            }

            $escName = str_replace("'", "''", $name);
            $escPath = str_replace("'", "''", $path);

            // PrintDocument عبر GDI: نفس مسار Word — يرسم النص ويسلّمه للـ spooler
            // صامتةً. الأسطر تُقاس مسبقاً (MeasureString) لتقطيع السطور الطويلة،
            // وخط Segoe UI يدعم العربية على كل نسخ ويندوز الحديثة.
            $script = "\$ErrorActionPreference = 'Stop'\n"
                . "Add-Type -AssemblyName System.Drawing\n"
                . "\$pd = New-Object System.Drawing.Printing.PrintDocument\n"
                . "\$pd.PrinterSettings.PrinterName = '{$escName}'\n"
                . "\$pd.DocumentName = 'POSDZ Receipt'\n"
                . "\$script:font = New-Object System.Drawing.Font('Segoe UI', 9)\n"
                . "\$g = \$pd.PrinterSettings.CreateMeasurementGraphics()\n"
                . "\$maxW = \$g.VisibleClipBounds.Width - 40\n"
                . "\$script:flat = New-Object System.Collections.Generic.List[string]\n"
                . "foreach (\$ln in [System.IO.File]::ReadAllLines('{$escPath}', [System.Text.Encoding]::UTF8)) {\n"
                . "  \$rest = \$ln\n"
                . "  while (\$rest.Length -gt 0) {\n"
                . "    \$take = [Math]::Min(\$rest.Length, 200)\n"
                . "    while ((\$take -gt 1) -and (\$g.MeasureString(\$rest.Substring(0, \$take), \$script:font).Width -gt \$maxW)) { \$take-- }\n"
                . "    [void]\$script:flat.Add(\$rest.Substring(0, \$take))\n"
                . "    \$rest = \$rest.Substring(\$take)\n"
                . "  }\n"
                . "}\n"
                . "\$script:idx = 0\n"
                . "\$h = { param(\$s, \$e)\n"
                . "  \$lh = \$script:font.GetHeight(\$e.Graphics) + 3\n"
                . "  \$bottom = \$e.Graphics.VisibleClipBounds.Height - 20\n"
                . "  \$y = 20\n"
                . "  while (\$script:idx -lt \$script:flat.Count) {\n"
                . "    if ((\$y + \$lh) -gt \$bottom) { \$e.HasMorePages = \$true; return }\n"
                . "    \$e.Graphics.DrawString(\$script:flat[\$script:idx], \$script:font, [System.Drawing.Brushes]::Black, 20, \$y)\n"
                . "    \$y += \$lh\n"
                . "    \$script:idx++\n"
                . "  }\n"
                . "  \$e.HasMorePages = \$false\n"
                . "}\n"
                . "\$pd.add_PrintPage(\$h)\n"
                . "for (\$i = 0; \$i -lt {$copies}; \$i++) { \$script:idx = 0; \$pd.Print() }\n"
                . "Write-Output 'OK'\n";

            $this->runPowerShell($script, 40);
        } finally {
            @unlink($path);
        }
    }

    /**
     * طباعة HTML بدقة كاملة على أي طابعة ويندوز عادية (ليزر/حبر):
     * Edge headless يلتقط لقطة PNG كاملة للصفحة (نفس عرض المعاينة)، ثم
     * تُطبع الصورة عبر GDI PrintDocument — نفس المسار المُثبت لطباعة النص.
     * (SumatraPDF استُبعد: يفشل exit=1 بصمت حين يُستدعى من شجرة عملية الخادم
     * بينما يعمل من الطرفية — غير قابل للاعتماد من سياق الويب.)
     */
    public function htmlPrint(string $name, string $base64Html, int $copies = 1): void
    {
        $known = array_map(
            fn ($p) => mb_strtolower($p['name']),
            $this->list()['printers'],
        );
        if (!in_array(mb_strtolower($name), $known, true)) {
            throw new \RuntimeException('الطابعة غير موجودة في قائمة طابعات النظام.');
        }

        $bytes = base64_decode($base64Html, true);
        if ($bytes === false || strlen($bytes) === 0) {
            throw new \RuntimeException('بيانات الطباعة غير صالحة.');
        }
        if (strlen($bytes) > 4 * 1024 * 1024) {
            throw new \RuntimeException('حجم HTML الطباعة كبير جداً.');
        }

        $copies = max(1, min(10, $copies));

        $tmp = rtrim(sys_get_temp_dir(), '\\/');
        $hex = bin2hex(random_bytes(6));
        $htmlPath = $tmp . DIRECTORY_SEPARATOR . 'posdz_html_' . $hex . '.html';
        $pngPath = $tmp . DIRECTORY_SEPARATOR . 'posdz_png_' . $hex . '.png';
        $profileDir = $tmp . DIRECTORY_SEPARATOR . 'posdz_edge_' . $hex;

        if (file_put_contents($htmlPath, $bytes) === false) {
            throw new \RuntimeException('تعذر تجهيز ملف الطباعة المؤقت.');
        }

        try {
            $edge = self::locateEdge();

            // 1) Edge headless ← لقطة PNG (ملف تعريف مؤقت خاص حتى لا يتصادم مع
            //    نسخة Edge المفتوحة لدى المستخدم — بدون هذا قد يفشل بصمت).
            //    نافذة 900x3600 CSS px تغطي إيصالات حرارية طويلة وصفحات A4،
            //    وعامل التكبير 2 يعطي ~192dpi حدة جيدة على الليزر.
            try {
                $proc = new Process([
                    $edge,
                    '--headless',
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-extensions',
                    '--hide-scrollbars',
                    '--force-device-scale-factor=2',
                    '--user-data-dir=' . $profileDir,
                    '--screenshot=' . $pngPath,
                    '--window-size=900,3600',
                    'file:///' . str_replace('\\', '/', $htmlPath),
                ], $tmp);
                $proc->setTimeout(60);
                $proc->run();
            } catch (\Symfony\Component\Process\Exception\ProcessTimedOutException $e) {
                throw new \RuntimeException('تجاوز تحويل الإيصال إلى صورة مهلته.', 0, $e);
            }

            if (!is_file($pngPath) || filesize($pngPath) < 500) {
                $noise = mb_substr($proc->getErrorOutput() . ' ' . $proc->getOutput(), -600);
                \Log::debug('[WinPrint] edge screenshot failed', ['out' => $noise]);
                throw new \RuntimeException('فشل تجهيز الإيصال (صورة).');
            }

            // 2) قصّ الحواف البيضاء + طباعة الصورة صامتاً عبر GDI PrintDocument.
            $nameEsc = str_replace("'", "''", $name);
            $pngEsc = str_replace("'", "''", $pngPath);

            $script =
                "Add-Type -AssemblyName System.Drawing\n"
                . "\$src = [System.Drawing.Bitmap]::FromFile('$pngEsc')\n"
                . "\$w = \$src.Width; \$hh = \$src.Height\n"
                // حدّ أدنى: صف/عمود فيه أي بكسل غير أبيض يوقف البحث. خطوة 3 تكفي
                // عملياً (أعرض عنصر خط ~2px عند sf=2) والحشو 16px يمنع القص الزائد.
                . "\$b = -1\n"
                . "for (\$y = \$hh - 1; \$y -ge 0; \$y--) {\n"
                . "  for (\$x = 0; \$x -lt \$w; \$x += 3) {\n"
                . "    \$c = \$src.GetPixel(\$x, \$y)\n"
                . "    if (-not (\$c.R -ge 246 -and \$c.G -ge 246 -and \$c.B -ge 246)) { \$b = \$y; break }\n"
                . "  }\n"
                . "  if (\$b -ge 0) { break }\n"
                . "}\n"
                . "if (\$b -lt 0) { \$b = \$hh - 1 }\n"
                . "\$r = -1\n"
                . "for (\$x = \$w - 1; \$x -ge 0; \$x--) {\n"
                . "  for (\$y = 0; \$y -le \$b; \$y += 3) {\n"
                . "    \$c = \$src.GetPixel(\$x, \$y)\n"
                . "    if (-not (\$c.R -ge 246 -and \$c.G -ge 246 -and \$c.B -ge 246)) { \$r = \$x; break }\n"
                . "  }\n"
                . "  if (\$r -ge 0) { break }\n"
                . "}\n"
                . "if (\$r -lt 0) { \$r = \$w - 1 }\n"
                . "\$cw = [Math]::Min(\$r + 17, \$w); \$ch = [Math]::Min(\$b + 17, \$hh)\n"
                . "\$img = New-Object System.Drawing.Bitmap(\$cw, \$ch)\n"
                . "\$g = [System.Drawing.Graphics]::FromImage(\$img)\n"
                . "\$g.Clear([System.Drawing.Color]::White)\n"
                . "\$dstR = New-Object System.Drawing.Rectangle(0, 0, \$cw, \$ch)\n"
                . "\$srcR = New-Object System.Drawing.Rectangle(0, 0, \$cw, \$ch)\n"
                . "\$g.DrawImage(\$src, \$dstR, \$srcR, [System.Drawing.GraphicsUnit]::Pixel)\n"
                . "\$g.Dispose(); \$src.Dispose()\n"
                . "\$pd = New-Object System.Drawing.Printing.PrintDocument\n"
                . "\$pd.PrinterSettings.PrinterName = '$nameEsc'\n"
                . "\$pd.DocumentName = 'POSDZ Receipt'\n"
                . "\$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(20, 20, 20, 20)\n"
                . "\$h = {\n"
                . "  param(\$s, \$e)\n"
                . "  \$area = \$e.MarginBounds\n"
                . "  \$ratio = [Math]::Min(\$area.Width / \$img.Width, \$area.Height / \$img.Height)\n"
                . "  \$dw = [int](\$img.Width * \$ratio); \$dh = [int](\$img.Height * \$ratio)\n"
                . "  \$e.Graphics.DrawImage(\$img, \$area.X, \$area.Y, \$dw, \$dh)\n"
                . "  \$e.HasMorePages = \$false\n"
                . "}\n"
                . "\$pd.add_PrintPage(\$h)\n"
                . "for (\$i = 0; \$i -lt {$copies}; \$i++) { \$pd.Print() }\n"
                . "\$img.Dispose()\n"
                . "Write-Output 'OK'\n";

            $this->runPowerShell($script, 90);
        } finally {
            @unlink($htmlPath);
            @unlink($pngPath ?? '');
            self::rrmdir($profileDir);
        }
    }

    /** أول مسار متاح لمتصفح Edge (موجود افتراضياً على ويندوز 10/11). */
    private static function locateEdge(): string
    {
        $candidates = [
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ];
        foreach ($candidates as $c) {
            if (is_file($c)) {
                return $c;
            }
        }
        throw new \RuntimeException('لم يتم العثور على متصفح Edge على الجهاز.');
    }

    /** حذف مجلد recursively (ملف تعريف Edge المؤقت). */
    private static function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }
        @rmdir($dir);
    }

    /**
     * تعداد الطابعات عبر WMI وتطبيعها إلى شكل موحّد للـ API.
     *
     * Win32_Printer.PrinterStatus:
     * 3 = Idle (جاهزة), 4 = Printing, 5 = Warmup, 7 = Offline.
     */
    private function enumerate(): array
    {
        // المسار الأساسي: المحرك الأصلي (WMI داخلياً) — أسرع وبلا نافذة
        try {
            $rows = $this->runHelper('list', '-', '-', 1, 15);
            $printers = [];
            foreach ((array) $rows as $row) {
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    continue;
                }
                $printers[] = [
                    'name'         => $name,
                    'driver'       => (string) ($row['driver'] ?? ''),
                    'port'         => (string) ($row['port'] ?? ''),
                    'is_default'   => (bool) ($row['is_default'] ?? false),
                    'work_offline' => (bool) ($row['work_offline'] ?? false),
                    'shared'       => (bool) ($row['shared'] ?? false),
                    'local'        => (bool) ($row['local'] ?? true),
                    'status'       => (string) ($row['status'] ?? 'unknown'),
                    'status_label' => (string) ($row['status_label'] ?? 'غير معروفة'),
                ];
            }

            return $this->sortPrinters($printers);
        } catch (PrinterHelperUnavailableException $e) {
            // البنية التحتية للمحرك غير متاحة — نتراجع إلى PowerShell أدناه
        }

        return $this->enumerateViaPowerShell();
    }

    private function sortPrinters(array $printers): array
    {
        // الافتراضية أولاً ثم أبجدياً
        usort($printers, function ($a, $b) {
            if ($a['is_default'] !== $b['is_default']) {
                return $a['is_default'] ? -1 : 1;
            }

            return strcasecmp($a['name'], $b['name']);
        });

        return $printers;
    }

    private function enumerateViaPowerShell(): array
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
     * تنفيذ سكربت PowerShell بشكل مخفي تماماً — بدون وميض نافذة/أيقونة شريط المهام.
     *
     * السكربت يُكتَب في ملف ‎.ps1 مؤقت (UTF-8 مع BOM حتى يقرأه Windows PowerShell
     * 5.1 كـ UTF-8 صحيحاً مع النصوص العربية) ويُشغَّل عبر ‎-File — فلا يمر أي
     * محتوى عبر سطر الأوامر ولا عبر stdin (سطر أوامر ضخم واحد يُفشِل
     * CreateProcess على ويندوز: «Nom de fichier ou extension trop long»).
     *
     * الإخفاء: مشغّل خارجي رقيق يشغّل الملف عبر ‎.NET ProcessStartInfo مع
     * UseShellExecute=false + CreateNoWindow=true — ضمان Win32 لعدم إنشاء أي
     * نافذة أو إدخال في شريط المهام مهما كانت حالة العملية الأب — ثم يقرأ
     * stdout/stderr عبر ReadToEndAsync (تفادياً لقفل الأنابيب) ويمرّر كود الخروج.
     * المشغّل نفسه صغير ثابت الحجم ويُمرَّر عبر ‎-EncodedCommand، ويُطلَق عبر
     * Symfony Process فيرث كونسول الخادم المُصغَّر (لا نافذة جديدة)، وتظل مهلة
     * التنفيذ مطبَّقة عليه من PHP.
     */
    private function runPowerShell(string $script, int $timeout): string
    {        $tmp = rtrim(sys_get_temp_dir(), '\\/');
        $ps1Path = $tmp . DIRECTORY_SEPARATOR . 'posdz_ps_' . bin2hex(random_bytes(6)) . '.ps1';

        try {
            if (file_put_contents($ps1Path, "\xEF\xBB\xBF" . $script) === false) {
                throw new \RuntimeException('تعذر تجهيز ملف الطباعة المؤقت.');
            }

            $escPs1 = str_replace("'", "''", $ps1Path);

            $outer = <<<'PS'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'powershell.exe'
$psi.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "PS1_PATH"'
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$p = [System.Diagnostics.Process]::Start($psi)
$outTask = $p.StandardOutput.ReadToEndAsync()
$errTask = $p.StandardError.ReadToEndAsync()
$p.WaitForExit()
[Console]::Out.Write($outTask.Result)
[Console]::Error.Write($errTask.Result)
exit $p.ExitCode
PS;
            $outer = str_replace('PS1_PATH', $escPs1, $outer);
            $encodedOuter = base64_encode((string) iconv('UTF-8', 'UTF-16LE', $outer));

            $process = new Process([
                'powershell',
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy',
                'Bypass',
                '-EncodedCommand',
                $encodedOuter,
            ]);
            $process->setTimeout(max(10, $timeout));
            $process->run();

            if (!$process->isSuccessful()) {
                $err = trim(preg_replace('/^#\x3C CLIXML\r?\n/', '', $process->getErrorOutput()) ?? '');
                // CLIXML/سطر أوامر ويندوز قد يحمل بايتات غير UTF-8 — تُنظَّف
                // قبل أن تعبر أي استجابة JSON وإلا انهار json_encode (500).
                $err = self::utf8Safe($err !== '' ? $err : 'فشل تنفيذ أمر النظام.');

                throw new \RuntimeException($err);
            }

            return $process->getOutput();
        } finally {
            @unlink($ps1Path);
        }
    }
}

/**
 * فشل البنية التحتية للمحرك الأصلي (لا csc / لا COM / لا نتيجة) —
 * إشارة داخلية للتُراجع إلى مسار PowerShell، وليست خطأً يُعرَض للمستخدم.
 */
class PrinterHelperUnavailableException extends \RuntimeException
{
}
