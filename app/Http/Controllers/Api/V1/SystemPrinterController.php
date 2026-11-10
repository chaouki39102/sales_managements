<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\Setting;
use App\Services\CompanyContextService;
use App\Services\System\WindowsPrinterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SystemPrinterController — اكتشاف الطابعات المثبتة على نظام التشغيل (ويندوز).
 *
 * مثل BackupController: عملية على مستوى النظام وليست خاصة بشركة، لكن المسار
 * داخل {company} بصلاحية can:update_company لأنها معلومات بيئة الخادم.
 */
class SystemPrinterController extends BaseApiController
{
    protected string $resourceName = 'system-printer';

    public function __construct(private WindowsPrinterService $service)
    {
        parent::__construct();
    }

    /**
     * GET /{company}/system/printers — قائمة الطابعات المثبتة على ويندوز.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->successResponse(
            $this->service->list(),
            'تم جلب قائمة طابعات النظام بنجاح',
        );
    }

    /**
     * POST /{company}/system/printers/test — طباعة صفحة اختبار عبر spooler ويندوز.
     */
    public function testPrint(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:255']);

        try {
            $this->service->testPrint((string) $request->input('name'));

            return $this->successResponse(
                ['sent' => true],
                "تم إرسال صفحة اختبار إلى «" . $request->input('name') . "»",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشلت الطباعة التجريبية: ' . $e->getMessage(),
                500,
                'PRINTER_TEST_FAILED',
            );
        }
    }

    /**
     * POST /{company}/system/printers/raw — إرسال بايتات خام (ESC/POS)
     * إلى طابعة ويندوز عبر spooler. يُستخدم كمسار احتياطي عندما يفشل
     * WebUSB (حجز تعريف النظام لواجهة الطابعة).
     */
    public function rawPrint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'   => ['required', 'string', 'max:255'],
            'data'   => ['required', 'string'],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        try {
            $this->service->rawPrint(
                (string) $validated['name'],
                (string) $validated['data'],
                (int) ($validated['copies'] ?? 1),
            );

            return $this->successResponse(
                ['printed' => true],
                "تمت الطباعة على «" . $validated['name'] . "»",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشل الإرسال إلى الطابعة: ' . $e->getMessage(),
                422,
                'PRINTER_RAW_FAILED',
            );
        }
    }

    /**
     * POST /{company}/system/printers/raw-tcp — إرسال بايتات ESC/POS مباشرة
     * عبر منفذ RAW TCP إلى طابعة شبكية.
     *
     * الهدف مخالف لطابعات ويندوز: الطابعة الشبكية (Ethernet/Wi-Fi) لا تحتاج
     * ولا تُعرَّف في ويندوز، فـ spooler و WebUSB كلاهما يفشل معها. هذا
     * المسار يفتح مقبساً على 192.168.x.x:9100 (افتراضياً) ويرسل البايتات كما هي.
     *
     * المضيف/المنفذ/المهلة تُؤخذ من إعدادات المؤسسة (print:raw_tcp_*)، ويمكن
     * تجاوزها في الطلب للاختبار. لا يوجد اختيار طابعة لكل عملية.
     */
    public function rawTcp(Request $request): JsonResponse
    {
        $settings = $this->rawTcpSettings();

        if (!$settings['enabled']) {
            return $this->errorResponse(
                'الطباعة عبر RAW TCP معطّلة لهذه المؤسسة. فعّلها من إعدادات الطباعة أولاً.',
                409,
                'PRINTER_RAW_TCP_DISABLED',
            );
        }

        $validated = $request->validate([
            'host'    => ['nullable', 'string', 'max:255'],
            'port'    => ['nullable', 'integer', 'min:1', 'max:65535'],
            'timeout' => ['nullable', 'integer', 'min:1', 'max:30'],
            'data'    => ['required', 'string'],
        ]);

        $host    = trim((string) ($validated['host'] ?? $settings['host']));
        $port    = (int) ($validated['port'] ?? $settings['port']);
        $timeout = (int) ($validated['timeout'] ?? $settings['timeout']);

        try {
            $written = $this->service->rawTcpPrint(
                $host,
                $port,
                (string) $validated['data'],
                $timeout,
            );

            return $this->successResponse(
                [
                    'printed' => true,
                    'method'  => 'raw_tcp',
                    'host'    => $host,
                    'port'    => $port,
                    'bytes'   => $written,
                ],
                "تم الإرسال عبر RAW TCP إلى {$host}:{$port}",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشل الإرسال عبر RAW TCP: ' . $e->getMessage(),
                422,
                'PRINTER_RAW_TCP_FAILED',
            );
        }
    }

    /**
     * GET /{company}/system/printers/raw-tcp — إعدادات RAW TCP المحفوظة.
     *
     * الواجهة تقرأ هذه القيم لتقرر هل تُحاول المسار الشبكي قبل spooler ويندوز.
     * القراءة لا تُفعّل المسار: `enabled=false` يعني أن العميل يتخطّاه تماماً.
     */
    public function rawTcpConfig(): JsonResponse
    {
        $settings = $this->rawTcpSettings();

        // Without a host there is nothing to dial; report it as disabled so the
        // client never opens a socket to '' and waits for a bogus connection.
        if (!$settings['enabled'] || $settings['host'] === '') {
            $settings['enabled'] = false;
        }

        return $this->successResponse(
            $settings,
            'تم جلب إعدادات RAW TCP بنجاح',
        );
    }

    /**
     * إعدادات RAW TCP المحفوظة للمؤسسة الحالية، مع القيم الافتراضية.
     *
     * @return array{host: string, port: int, timeout: int, printer_id: ?string, enabled: bool}
     */
    private function rawTcpSettings(): array
    {
        $companyId = app(CompanyContextService::class)->get();

        $get = static function (string $key, mixed $fallback = null) use ($companyId) {
            $value = Setting::getSetting($key, $fallback, $companyId);

            return ($value === null || $value === '') ? $fallback : $value;
        };

        return [
            'enabled'    => (bool) $get('print:raw_tcp_enabled', false),
            'host'       => (string) $get('print:raw_tcp_host', ''),
            'port'       => (int) $get('print:raw_tcp_port', 9100),
            'timeout'    => (int) $get('print:raw_tcp_timeout', 5),
            'printer_id' => $get('print:raw_tcp_printer_id'),
        ];
    }

    /**
     * POST /{company}/system/printers/raw-text — طباعة نص عادي (GDI)
     * على أي طابعة مثبتة، صامتةً بدون معاينة. للطابعات العادية
     * (ليزر/حبر) التي لا تفهم بايتات ESC/POS.
     */
    public function rawText(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'   => ['required', 'string', 'max:255'],
            'data'   => ['required', 'string'],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        try {
            $this->service->rawTextPrint(
                (string) $validated['name'],
                (string) $validated['data'],
                (int) ($validated['copies'] ?? 1),
            );

            return $this->successResponse(
                ['printed' => true],
                "تمت الطباعة على «" . $validated['name'] . "»",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشل الإرسال إلى الطابعة: ' . $e->getMessage(),
                422,
                'PRINTER_RAW_TEXT_FAILED',
            );
        }
    }

    /**
     * POST /{company}/system/printers/html — طباعة HTML بدقة كاملة
     * (Edge headless → PDF → SumatraPDF صامتاً). للطابعات العادية
     * حيث يُريد الإيصال بنفس تنسيق المعاينة وليس نصاً عادياً.
     */
    public function htmlPrint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'   => ['required', 'string', 'max:255'],
            'data'   => ['required', 'string'],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        try {
            $this->service->htmlPrint(
                (string) $validated['name'],
                (string) $validated['data'],
                (int) ($validated['copies'] ?? 1),
            );

            return $this->successResponse(
                ['printed' => true],
                "تمت الطباعة على «" . $validated['name'] . "»",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشل الإرسال إلى الطابعة: ' . $e->getMessage(),
                422,
                'PRINTER_HTML_FAILED',
            );
        }
    }
}
