// ════════════════════════════════════════════════════════════════════════════
// print-settings/types.ts
// النظام الكامل لإدارة قوالب الطباعة:
//   - كل مستند يدعم أكثر من نموذج
//   - كل نموذج محفوظ في قاعدة البيانات
//   - المستخدم يتحكم في كل شيء
// ════════════════════════════════════════════════════════════════════════════

// ─── Enums & unions ───────────────────────────────────────────────────────────

export type PaperSize       = '80mm' | '58mm' | 'A4' | 'A5' | 'none';
export type AlignOption     = 'right' | 'center' | 'left';
export type BorderStyle     = 'solid' | 'dashed' | 'double' | 'none';
export type PriceMode       = 'ht' | 'ttc';
export type PageOrientation = 'portrait' | 'landscape';
export type FontFamily      = 'tajawal' | 'monospace' | 'times' | 'arial';

export type ColumnKey =
  | 'rowNumber' | 'barcode' | 'ref' | 'name'
  | 'unit' | 'quantity' | 'price' | 'discount' | 'tva' | 'total';

// ─── Document types ───────────────────────────────────────────────────────────

export const DOC_TYPE_LIST = [
  { code: 'FV',  name: 'فاتورة المبيعات',   category: 'sales'     },
  { code: 'BL',  name: 'وصل التسليم',       category: 'sales'     },
  { code: 'DEV', name: 'عرض السعر',         category: 'sales'     },
  { code: 'BCC', name: 'طلب العميل',        category: 'sales'     },
  { code: 'AA',  name: 'مرتجع المبيعات',   category: 'sales'     },
  { code: 'FA',  name: 'فاتورة الشراء',    category: 'purchase'  },
  { code: 'BR',  name: 'وصل الاستلام',     category: 'purchase'  },
  { code: 'AV',  name: 'أمر الشراء',       category: 'purchase'  },
  { code: 'DDP', name: 'إذن التسليم',      category: 'warehouse' },
  { code: 'BT',  name: 'تحويل المخزون',   category: 'warehouse' },
  { code: 'POS', name: 'إيصال POS',        category: 'pos'       },
  { code: 'RPT', name: 'تقرير الجلسة',    category: 'pos'       },
] as const;

export type DocTypeCode = typeof DOC_TYPE_LIST[number]['code'];

// ─── PrintTemplate — القالب الكامل ───────────────────────────────────────────

export interface PrintTemplate {
  id:           number | null;
  name:         string;
  doc_type_code: DocTypeCode;
  paper_size:   PaperSize;
  is_default:   boolean;
  is_active:    boolean;
  created_at?:  string;
  updated_at?:  string;

  paper_width_mm:   58 | 80;
  page_orientation: PageOrientation;
  margin_top:       number;
  margin_bottom:    number;
  margin_sides:     number;
  line_spacing:     number;
  base_font_size:   number;
  font_family:      FontFamily;

  show_logo:         boolean;
  logo_source:       'default' | 'company' | 'custom';
  logo_size:         number;
  logo_align:        AlignOption;
  logo_border_radius: number;
  custom_logo_url:   string | null;

  show_company_name:   boolean;
  company_name_text:   string;
  company_name_size:   number;
  company_name_bold:   boolean;
  company_name_align:  AlignOption;
  company_name_color:  string;

  show_address:        boolean;
  show_phone:          boolean;
  show_tax_id:         boolean;
  show_rc:             boolean;
  show_nis:            boolean;
  show_ice:            boolean;
  show_article:        boolean;
  company_info_align:  AlignOption;
  company_info_size:   number;
  override_address:    string;
  override_phone:      string;
  override_nif:        string;
  override_rc:         string;
  override_nis:        string;
  override_ice:        string;
  override_article:    string;

  header_custom_text:  string;
  header_separator:    BorderStyle;

  title_text:       string;
  title_size:       number;
  title_bold:       boolean;
  title_align:      AlignOption;
  title_color:      string;
  show_doc_number:  boolean;
  show_date:        boolean;
  show_time:        boolean;
  show_due_date:    boolean;
  show_cashier:     boolean;
  show_client:      boolean;
  show_client_nif:  boolean;
  show_client_phone:boolean;
  show_client_address: boolean;
  show_delivery_address: boolean;
  show_session:     boolean;
  show_payment_term:boolean;
  show_bank_details:boolean;
  bank_details_text:string;
  doc_separator:    BorderStyle;

  col_order:   ColumnKey[];
  col_show:    Partial<Record<ColumnKey, boolean>>;
  col_widths:  Partial<Record<ColumnKey, number>>;
  col_headers: Partial<Record<ColumnKey, string>>;
  col_aligns:  Partial<Record<ColumnKey, AlignOption>>;

  items_font_size:    number;
  items_font_family:  FontFamily;
  show_col_header:    boolean;
  table_header_bold:  boolean;
  table_header_bg:    boolean;
  table_header_color: string;
  table_border_style: BorderStyle;
  alternating_rows:   boolean;
  alternating_color:  string;
  price_display:      PriceMode;
  show_line_total_ttc:boolean;

  totals_font_size:    number;
  totals_bold:         boolean;
  totals_align:        AlignOption;
  show_total_ht:       boolean;
  show_total_tva:      boolean;
  show_tva_breakdown:  boolean;
  show_discount_total: boolean;
  show_fiscal_stamp:   boolean;
  show_total_ttc:      boolean;
  total_ttc_font_size: number;
  total_ttc_bold:      boolean;
  total_ttc_color:     string;
  total_border_style:  BorderStyle;
  show_amount_in_words:boolean;
  show_paid_amount:    boolean;
  show_change:         boolean;
  show_remaining:      boolean;
  show_prev_balance:   boolean;
  show_new_balance:    boolean;

  show_payment_details:boolean;
  payment_font_size:   number;

  footer_line1:        string;
  footer_line2:        string;
  footer_line3:        string;
  footer_separator:    BorderStyle;
  show_thank_you:      boolean;
  thank_you_text:      string;
  thank_you_size:      number;
  thank_you_color:     string;
  show_returns_policy: boolean;
  returns_policy_text: string;
  footer_legal_text:   string;

  show_barcode:         boolean;
  barcode_content:      'doc-number' | 'total' | 'custom';
  barcode_custom_text:  string;
  show_qr:              boolean;
  qr_content:           'doc-number' | 'company-info' | 'both';

  show_cashier_signature: boolean;
  show_client_signature:  boolean;
  show_stamp:             boolean;

  show_header_section:    boolean;
  show_doc_info_section:  boolean;
  show_items_section:     boolean;
  show_totals_section:    boolean;
  show_payments_section:  boolean;
  show_footer_section:    boolean;

  rules: ReportRule[];

  show_report_header:        boolean;
  report_header_text:        string;
  show_report_footer:        boolean;
  report_footer_text:        string;
  show_charts:               boolean;
  chart_type:                'bar' | 'pie';
  chart_title:               string;
  group_by:                  string;
  sort_by:                   string;
  sort_direction:            'asc' | 'desc';
  show_report_period:        boolean;
  show_report_cashier:       boolean;
  show_report_summary_cards: boolean;
  show_report_payment_breakdown: boolean;
  show_report_top_products:  boolean;
}

export type SectionTarget = 'header' | 'doc-info' | 'items' | 'totals' | 'payments' | 'footer';

export interface ReportRule {
  id: string;
  condition: string;
  action: 'show' | 'hide' | 'highlight' | 'disable';
  target: string;
  priority?: number;
  highlightStyle?: Record<string, string>;
}

// ─── Default template factory ─────────────────────────────────────────────────

export function createDefaultTemplate(
  docTypeCode: DocTypeCode = 'POS',
  paperSize: PaperSize = '80mm',
  name = 'القالب الافتراضي',
): PrintTemplate {
  const is80mm = paperSize === '80mm' || paperSize === '58mm';
  return {
    id:             null,
    name,
    doc_type_code:  docTypeCode,
    paper_size:     paperSize,
    is_default:     true,
    is_active:      true,

    paper_width_mm:   paperSize === '58mm' ? 58 : 80,
    page_orientation: 'portrait',
    margin_top:       3,
    margin_bottom:    3,
    margin_sides:     3,
    line_spacing:     1.3,
    base_font_size:   10,
    font_family:      'tajawal',

    show_logo:          true,
    logo_source:        'company',
    logo_size:          56,
    logo_align:         'center',
    logo_border_radius: 50,
    custom_logo_url:    null,

    show_company_name:  true,
    company_name_text:  '',
    company_name_size:  15,
    company_name_bold:  true,
    company_name_align: 'center',
    company_name_color: '#111111',

    show_address:       true,
    show_phone:         true,
    show_tax_id:        true,
    show_rc:            true,
    show_nis:           false,
    show_ice:           false,
    show_article:       false,
    company_info_align: 'center',
    company_info_size:  9,
    override_address:   '',
    override_phone:     '',
    override_nif:       '',
    override_rc:        '',
    override_nis:       '',
    override_ice:       '',
    override_article:   '',

    header_custom_text: '',
    header_separator:   'dashed',

    title_text:       docTypeCode === 'POS' ? 'إيصال بيع' : 'فاتورة بيع',
    title_size:       13,
    title_bold:       true,
    title_align:      'center',
    title_color:      '#111111',
    show_doc_number:  true,
    show_date:        true,
    show_time:        true,
    show_due_date:    false,
    show_cashier:     true,
    show_client:      true,
    show_client_nif:  false,
    show_client_phone:false,
    show_client_address: false,
    show_delivery_address: false,
    show_session:     docTypeCode === 'POS',
    show_payment_term:false,
    show_bank_details:false,
    bank_details_text:'',
    doc_separator:    'dashed',

    col_order:   ['name', 'quantity', 'price', 'total'],
    col_show:    { name: true, quantity: true, price: true, total: true },
    col_widths:  { name: 40, quantity: 15, price: 22, total: 23 },
    col_headers: { name: 'البيان', quantity: 'الكمية', price: 'السعر', total: 'الإجمالي' },
    col_aligns:  { name: 'right', quantity: 'center', price: 'center', total: 'center' },

    items_font_size:    10,
    items_font_family:  'tajawal',
    show_col_header:    true,
    table_header_bold:  true,
    table_header_bg:    false,
    table_header_color: '#333333',
    table_border_style: 'dashed',
    alternating_rows:   false,
    alternating_color:  '#f5f5f5',
    price_display:      'ht',
    show_line_total_ttc:false,

    totals_font_size:    10,
    totals_bold:         true,
    totals_align:        'right',
    show_total_ht:       true,
    show_total_tva:      true,
    show_tva_breakdown:  false,
    show_discount_total: true,
    show_fiscal_stamp:   true,
    show_total_ttc:      true,
    total_ttc_font_size: 14,
    total_ttc_bold:      true,
    total_ttc_color:     '#111111',
    total_border_style:  'double',
    show_amount_in_words:false,
    show_paid_amount:    true,
    show_change:         true,
    show_remaining:      false,
    show_prev_balance:   true,
    show_new_balance:    true,

    show_payment_details:true,
    payment_font_size:   9,

    footer_line1:        '',
    footer_line2:        '',
    footer_line3:        '',
    footer_separator:    'solid',
    show_thank_you:      true,
    thank_you_text:      'شكراً لزيارتكم!',
    thank_you_size:      11,
    thank_you_color:     '#111111',
    show_returns_policy: true,
    returns_policy_text: 'كل الاحتجاجات لا تتعدى 48 ساعة',
    footer_legal_text:   '',

    show_barcode:        true,
    barcode_content:     'doc-number',
    barcode_custom_text: '',
    show_qr:             false,
    qr_content:          'doc-number',

    show_cashier_signature: false,
    show_client_signature:  false,
    show_stamp:             false,

    show_header_section:    true,
    show_doc_info_section:  true,
    show_items_section:     true,
    show_totals_section:    true,
    show_payments_section:  true,
    show_footer_section:    true,

    rules: [],

    show_report_header:        true,
    report_header_text:        '',
    show_report_footer:        true,
    report_footer_text:        '',
    show_charts:               true,
    chart_type:                'bar',
    chart_title:               '',
    group_by:                  '',
    sort_by:                   '',
    sort_direction:            'asc',
    show_report_period:        true,
    show_report_cashier:       true,
    show_report_summary_cards: true,
    show_report_payment_breakdown: true,
    show_report_top_products:  true,
  };
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface PrintTemplateApiResponse {
  id:            number;
  name:          string;
  doc_type_code: string;
  paper_size:    string;
  is_default:    boolean;
  is_active:     boolean;
  config:        Omit<PrintTemplate, 'id' | 'name' | 'doc_type_code' | 'paper_size' | 'is_default' | 'is_active' | 'created_at' | 'updated_at'>;
  created_at:    string;
  updated_at:    string;
}

// ─── Live data ───────────────────────────────────────────────────────────────

export interface TemplateLiveData {
  docNumber?:   string;
  docDate?:     string;
  dueDate?:     string;
  cashierName?: string;
  client?:      { name?: string; nif?: string; phone?: string; address?: string } | null;
  items?:       Array<{
    name:               string;
    ref?:               string;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals?: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid?:          number;
    change?:        number;
    remaining?:     number;
  };
  payments?:    Array<{ mode: string; amount: number }>;
  prevBalance?: number;
  newBalance?:  number;
}

export interface CompanyData {
  name:     string;
  address:  string;
  phone:    string;
  nif:      string;
  rc:       string;
  nis:      string;
  ice:      string;
  article:  string;
  logoUrl?: string | null;
}

// ─── Detected printer & doc config (لإعدادات الطابعات) ─────────────────────

export interface DetectedPrinter {
  id:        string;
  name:      string;
  isDefault: boolean;
  status:    'ready' | 'offline' | 'unknown';
  source?:   'usb' | 'demo' | 'manual';
}

export interface DocumentPrintConfig {
  docTypeCode:   string;
  docTypeName:   string;
  enabled:       boolean;
  paperSize:     PaperSize;
  printerId:     string | null;
  copies:        number;
  autoPrint:     boolean;
  showPreview:   boolean;
  templates:     PaperSize[];
}

// ─── Backward-compat aliases ──────────────────────────────────────────────────
// تُستخدم في POS والمكونات القديمة

export type ReceiptTemplate80mm = PrintTemplate;
export type CompanyPreviewData = CompanyData;
export type ReceiptLiveData = TemplateLiveData;

export function defaultTemplate(): PrintTemplate {
  return createDefaultTemplate('FV', '80mm');
}
