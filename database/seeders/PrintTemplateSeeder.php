<?php

namespace Database\Seeders;

use App\Models\PrintTemplate;
use App\Models\Company;
use Illuminate\Database\Seeder;

class PrintTemplateSeeder extends Seeder
{
    private const DEFAULT_CONFIG = [
        'paper_width_mm'           => 80,
        'page_orientation'         => 'portrait',
        'margin_top'               => 3,
        'margin_bottom'            => 3,
        'margin_sides'             => 3,
        'line_spacing'             => 1.3,
        'base_font_size'           => 10,
        'font_family'              => 'tajawal',

        'show_logo'                => true,
        'logo_source'              => 'company',
        'logo_size'                => 56,
        'logo_align'               => 'center',
        'logo_border_radius'       => 50,
        'custom_logo_url'          => null,

        'show_company_name'        => true,
        'company_name_text'        => '',
        'company_name_size'        => 15,
        'company_name_bold'        => true,
        'company_name_align'       => 'center',
        'company_name_color'       => '#111111',

        'show_address'             => true,
        'show_phone'               => true,
        'show_tax_id'              => true,
        'show_rc'                  => true,
        'show_nis'                 => false,
        'show_ice'                 => false,
        'show_article'             => false,
        'company_info_align'       => 'center',
        'company_info_size'        => 9,
        'override_address'         => '',
        'override_phone'           => '',
        'override_nif'             => '',
        'override_rc'              => '',
        'override_nis'             => '',
        'override_ice'             => '',
        'override_article'         => '',

        'header_custom_text'       => '',
        'header_separator'         => 'dashed',

        'title_text'               => 'فاتورة بيع',
        'title_size'               => 13,
        'title_bold'               => true,
        'title_align'              => 'center',
        'title_color'              => '#111111',
        'show_doc_number'          => true,
        'show_date'                => true,
        'show_time'                => true,
        'show_due_date'            => false,
        'show_cashier'             => true,
        'show_client'              => true,
        'show_client_nif'          => false,
        'show_client_phone'        => false,
        'show_client_address'      => false,
        'show_delivery_address'    => false,
        'show_session'             => false,
        'show_payment_term'        => false,
        'show_bank_details'        => false,
        'bank_details_text'        => '',
        'doc_separator'            => 'dashed',

        'col_order'                => ['name', 'quantity', 'price', 'total'],
        'col_show'                 => ['name' => true, 'quantity' => true, 'price' => true, 'total' => true],
        'col_widths'               => ['name' => 40, 'quantity' => 15, 'price' => 22, 'total' => 23],
        'col_headers'              => ['name' => 'البيان', 'quantity' => 'الكمية', 'price' => 'السعر', 'total' => 'الإجمالي'],
        'col_aligns'               => ['name' => 'right', 'quantity' => 'center', 'price' => 'center', 'total' => 'center'],

        'items_font_size'          => 10,
        'items_font_family'        => 'tajawal',
        'show_col_header'          => true,
        'table_header_bold'        => true,
        'table_header_bg'          => false,
        'table_header_color'       => '#333333',
        'table_border_style'       => 'dashed',
        'alternating_rows'         => false,
        'alternating_color'        => '#f5f5f5',
        'price_display'            => 'ht',
        'show_line_total_ttc'      => false,

        'totals_font_size'         => 10,
        'totals_bold'              => true,
        'totals_align'             => 'right',
        'show_total_ht'            => true,
        'show_total_tva'           => true,
        'show_tva_breakdown'       => false,
        'show_discount_total'      => true,
        'show_fiscal_stamp'        => true,
        'show_total_ttc'           => true,
        'total_ttc_font_size'      => 14,
        'total_ttc_bold'           => true,
        'total_ttc_color'          => '#111111',
        'total_border_style'       => 'double',
        'show_amount_in_words'     => false,
        'show_paid_amount'         => true,
        'show_change'              => true,
        'show_remaining'           => false,
        'show_prev_balance'        => true,
        'show_new_balance'         => true,

        'totals_rows'              => [],
        'footer_rows'              => [],
        'header_layout'            => ['mode' => 'simple', 'columns' => []],

        'show_payment_details'     => true,
        'payment_font_size'        => 9,

        'footer_line1'             => '',
        'footer_line2'             => '',
        'footer_line3'             => '',
        'footer_separator'         => 'solid',
        'show_thank_you'           => true,
        'thank_you_text'           => 'شكراً لزيارتكم!',
        'thank_you_size'           => 11,
        'thank_you_color'          => '#111111',
        'show_returns_policy'      => true,
        'returns_policy_text'      => 'كل الاحتجاجات لا تتعدى 48 ساعة',
        'footer_legal_text'        => '',

        'show_barcode'             => true,
        'barcode_content'          => 'doc-number',
        'barcode_custom_text'      => '',
        'show_qr'                  => false,
        'qr_content'               => 'doc-number',

        'show_cashier_signature'   => false,
        'show_client_signature'    => false,
        'show_stamp'               => false,

        'show_header_section'      => true,
        'show_doc_info_section'    => true,
        'show_items_section'       => true,
        'show_totals_section'      => true,
        'show_payments_section'    => true,
        'show_footer_section'      => true,

        'rules'                    => [],

        'show_report_header'              => true,
        'report_header_text'              => '',
        'show_report_footer'              => true,
        'report_footer_text'              => '',
        'show_charts'                     => true,
        'chart_type'                      => 'bar',
        'chart_title'                     => '',
        'group_by'                        => '',
        'sort_by'                         => '',
        'sort_direction'                  => 'asc',
        'show_report_period'              => true,
        'show_report_cashier'             => true,
        'show_report_summary_cards'       => true,
        'show_report_payment_breakdown'   => true,
        'show_report_top_products'        => true,
        'report_col_widths'               => ['product' => 50, 'quantity' => 20, 'total' => 30],
        'report_col_headers'              => ['product' => 'المنتج', 'quantity' => 'الكمية', 'total' => 'الإجمالي'],
    ];

    private const DOC_TYPES = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS'];

    public function run(): void
    {
        $companies = Company::all();

        if ($companies->isEmpty()) {
            $this->command->warn('No companies found. Skipping PrintTemplateSeeder.');
            return;
        }

        foreach ($companies as $company) {
            self::seedForCompany($company->id, $this->command instanceof \Illuminate\Console\Output\OutputInterface ? $this->command : null);
        }

        $this->command->info('PrintTemplateSeeder completed successfully.');
    }

    /**
     * Seed default print templates for a single company.
     * Called by CompanySeeder via CompanyObserver when a new company is created.
     */
    public static function seedForCompany(int $companyId, ?\Illuminate\Console\Output\OutputInterface $output = null): void
    {
        foreach (self::DOC_TYPES as $docCode) {
            $existing = PrintTemplate::where('company_id', $companyId)
                ->where('doc_type_code', $docCode)
                ->first();

            if ($existing) {
                continue;
            }

            $config = self::DEFAULT_CONFIG;
            $config['title_text'] = $docCode === 'POS' ? 'إيصال بيع' : 'فاتورة بيع';
            $config['show_session'] = $docCode === 'POS';
            $config['show_fiscal_stamp'] = in_array($docCode, ['FV', 'BL', 'FA', 'BR', 'AV']);

            PrintTemplate::create([
                'company_id'    => $companyId,
                'name'          => 'قالب ' . ($docCode === 'POS' ? 'إيصال' : 'فاتورة') . ' افتراضي',
                'doc_type_code' => $docCode,
                'paper_size'    => '80mm',
                'is_default'    => true,
                'is_active'     => true,
                'config'        => $config,
            ]);

            $output?->info("Created default template for company #{$companyId} / {$docCode}");
        }
    }
}
