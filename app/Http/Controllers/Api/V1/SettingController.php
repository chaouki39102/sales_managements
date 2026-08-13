<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\SettingService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ════════════════════════════════════════════════════════════════════
 * SettingController — النسخة المُصلحة
 *
 * المسارات:
 * GET    /{company}/settings              → index()    — dictionary
 * PATCH  /{company}/settings              → update()   — تحديث متعدد
 * PUT    /{company}/settings              → update()   — تحديث متعدد
 * GET    /{company}/settings/group/{grp}  → byGroup()  — array
 * GET    /{company}/settings/{key}        → getValue() — object واحد
 * ════════════════════════════════════════════════════════════════════
 */
class SettingController extends BaseApiController
{
    protected string  $resourceName  = 'setting';
    protected ?string $resourceClass = null;

    public function __construct(private SettingService $settingService)
    {
        parent::__construct();
    }

    // ─── GET /{company}/settings ──────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $dict = $this->settingService->getAllAsDict();
            return $this->successResponse($dict, 'تم جلب الإعدادات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ─── PATCH|PUT /{company}/settings ───────────────────────────────

    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $allData     = $request->all();
            $settingData = $this->filterSettingData($allData);

            if (empty($settingData)) {
                return $this->errorResponse(
                    'لم يتم تقديم إعدادات صحيحة — تأكد من صحة المفاتيح',
                    422,
                    'EMPTY_SETTINGS'
                );
            }

            $result = $this->settingService->upsertSettings($settingData);

            $response = $result->map(fn($s) => [
                'key'   => $s->key,
                'value' => $this->settingService->castValue($s),
                'group' => $s->group,
                'type'  => $s->type,
            ])->values()->toArray();

            return $this->successResponse($response, 'تم تحديث الإعدادات بنجاح');

        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // ─── GET /{company}/settings/group/{group} ────────────────────────

    public function byGroup(Request $request, string $group): JsonResponse
    {
        try {
            $group = $request->route('group');
            $settings = $this->settingService->getGroupAsArray($group);
            return $this->successResponse($settings, "إعدادات المجموعة: {$group}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byGroup');
        }
    }

    // ─── GET /{company}/settings/{key} ────────────────────────────────

    public function getValue(Request $request, string $key): JsonResponse
    {
        try {
            $key = $request->route('key');
            $setting = $this->settingService->findByKey($key);

            if (!$setting) {
                return $this->successResponse([
                    'key'   => $key,
                    'value' => null,
                    'group' => null,
                    'type'  => 'string',
                ]);
            }

            return $this->successResponse([
                'key'   => $setting->key,
                'value' => $this->settingService->castValue($setting),
                'group' => $setting->group,
                'type'  => $setting->type,
            ]);

        } catch (\Throwable $e) {
            return $this->handleError($e, 'getValue');
        }
    }

    // ─── Disabled endpoints ───────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        return $this->errorResponse('استخدم PATCH /settings', 405, 'METHOD_NOT_ALLOWED');
    }

    public function show($id): JsonResponse
    {
        return $this->errorResponse('استخدم GET /settings/{key}', 405, 'METHOD_NOT_ALLOWED');
    }

    public function destroy($id): JsonResponse
    {
        return $this->errorResponse('لا يمكن حذف الإعدادات', 405, 'METHOD_NOT_ALLOWED');
    }

    // ─── Required by BaseApiController ───────────────────────────────

    protected function getService(): SettingService
    {
        return $this->settingService;
    }

    protected function getModelClass(): string
    {
        return Setting::class;
    }

    // ─── Whitelist ────────────────────────────────────────────────────

    private function filterSettingData(array $data): array
    {
        $allowedKeys = [
            // invoice
            'invoice_design', 'invoice_header_color', 'invoice_paper_size',
            'invoice_font_size', 'price_mode', 'invoice_show_logo',
            'invoice_show_stamp', 'invoice_show_sign', 'invoice_show_watermark',
            'invoice_footer_text', 'invoice_legal_text', 'invoice_format',
            'invoice_number_prefix',

            // fiscal
            'tax_regime', 'entity_type', 'ifu_rate', 'default_tva_rate',
            'fiscal_stamp_enabled', 'fiscal_stamp_threshold', 'default_currency',
            'year_regimes', 'tax_rate', 'tax_number', 'currency_code', 'decimal_places',

            // inventory
            'default_valuation_method', 'allow_negative_stock', 'manage_lots',
            'manage_expiry', 'low_stock_default_threshold', 'auto_adjust_on_document',

            // alerts
            'alert_low_stock', 'alert_out_of_stock', 'low_stock_threshold',
            'alert_debt_due', 'debt_due_days', 'alert_overdue_debts',
            'alert_fiscal_close', 'fiscal_close_days', 'alert_g50', 'g50_days_before',
            'alert_g12', 'alert_g12bis', 'alert_draft_docs', 'draft_docs_days',
            'email_notifications', 'notif_email',

            // documents
            'default_warehouse_id', 'default_currency_id', 'default_price_level_id',
            'default_payment_mode_id', 'default_treasury_account_id',
            'default_fiscal_year_behavior',
            'documents_default_line_mode', 'documents_default_visible_cols',

            // inventory (expansion)
            'allow_negative_stock_on_sale', 'auto_create_lot_on_purchase',

            // portal — بوابة الزبائن (اطلب سلعة)
            'portal_enabled', 'portal_allow_guest_orders',
            'portal_allow_registered_orders', 'portal_min_order_amount',
            'portal_max_order_amount', 'portal_order_confirmation_message',

            // portal — إعدادات عرض الكتالوج
            'portal_show_stock', 'portal_show_price', 'portal_show_ref',
            'portal_show_unit', 'portal_show_packaging',
            'portal_allow_change_packaging', 'portal_show_discounts',
            'portal_show_tva', 'portal_show_search',
            'portal_hide_out_of_stock', 'portal_show_incart_badge',
            'portal_show_notes',

            // portal — الدفع الإلكتروني
            'online_payment_enabled', 'online_payment_provider',
            'online_payment_mode', 'online_payment_merchant_id',
            'online_payment_secret_key',

            // import — القيم الافتراضية عند استيراد المنتجات
            'import_default_family_id', 'import_default_brand_id',
            'import_default_unit_id', 'import_default_tva_id',
            'import_default_active', 'import_default_manages_stock',
            'import_default_product_type_id', 'import_default_min_margin_percentage',

            // general
            'app_name', 'app_logo', 'app_color', 'theme_mode', 'language',
            'timezone', 'date_format', 'time_format',

            // print — تخصيص قوالب الطباعة (80mm, A4, A5)
            'print_doc_configs', 'print_printers',
            'print:templates', 'print:doc_configs',
        ];

        // إضافة المفاتيح الديناميكية التي تبدأ بـ print_tpl_ أو print:
        foreach ($data as $key => $value) {
            if ($value === null) continue;
            if (str_starts_with($key, 'print_tpl_') || str_starts_with($key, 'print:')) {
                $allowedKeys[] = $key;
            }
        }

        return array_filter(
            array_intersect_key($data, array_flip($allowedKeys)),
            fn($v) => $v !== null
        );
    }
}
