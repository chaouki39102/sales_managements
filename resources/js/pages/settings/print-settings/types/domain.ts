export type PaperSize       = '80mm' | '58mm' | 'A4' | 'A5' | '40x20mm' | 'none';
export type AlignOption     = 'right' | 'center' | 'left';
export type BorderStyle     = 'solid' | 'dashed' | 'double' | 'none';
export type PriceMode       = 'ht' | 'ttc';
export type PageOrientation = 'portrait' | 'landscape';
export type FontFamily      = 'tajawal' | 'monospace' | 'times' | 'arial' | 'cairo' | 'almarai' | 'noto_kufi' | 'el_messiri' | 'amiri' | 'zain';

// ─── Sticker Label Designer Geometry ─────────────────────────────────────────

/** Per-element geometry persisted by the sticker label designer (Moveable). */
export interface StickerElementGeometry {
  x: number;
  y: number;
  /** Explicit box width in canvas px — set once the element has been resized. */
  width?: number;
  /** Explicit box height in canvas px — set once the element has been resized. */
  height?: number;
  /** Rotation in degrees (Moveable `onRotate`). */
  rotate?: number;
  /** Uniform content scale (natural-size → box) applied at design time. */
  scale?: number;
  /**
   * Horizontal alignment anchor. `(x, y)` is the anchor point of the element
   * box: 'left' → left edge at x, 'center' → center at x, 'right' → right edge at x.
   * Content inside an explicitly-sized box is aligned to the same value.
   * Undefined = 'left'.
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Vertical alignment anchor. `(x, y)` is the anchor point of the element
   * box: 'top' → top edge at y, 'middle' → center at y, 'bottom' → bottom edge at y.
   * Content inside an explicitly-sized box is aligned to the same value.
   * Undefined = 'top'.
   */
  valign?: 'top' | 'middle' | 'bottom';
}

export type StickerElementPosition = StickerElementGeometry;

// ─── CellStyle (v2) ────────────────────────────────────────────────────────────

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: FontFamily;
  align?: AlignOption;
}

// ─── Layout Row System ────────────────────────────────────────────────────────

/** Logical side: start = right in RTL, end = left. No explicit left/right so design stays correct for future LTR. */
export type LogicalSide = 'start' | 'end';
export type LogicalAlign = 'start' | 'center' | 'end';

export interface BoxBorder {
  style: BorderStyle;
  width: number;      // px
  color: string;       // hex
  radius?: number;     // px
  sides?: {
    top?: boolean; end?: boolean; bottom?: boolean; start?: boolean;
  };
}

export interface BoxSpacing { top: number; end: number; bottom: number; start: number; }

/** A single column within a layout row — holds one field + its display config. */
export interface LayoutColumn {
  id: string;              // unique within the row: 'col_0', 'col_1', …
  field: string;           // PrintFieldRegistry ID or 'literal'
  literalText?: string;
  label?: string;
  width: number;           // flex weight 1–12 (default 1)
  alignment: AlignOption;
  labelSide: LogicalSide;
  valueSide: LogicalSide;
  bold?: boolean;
  color?: string;
  fontSize?: number;
}

/** A layout row — holds 1+ columns (multi-column) or uses legacy single-field mode. */
export interface LayoutRow {
  id: string;
  order: number;
  visible: boolean;
  /** Multi-column mode: when present and non-empty, columns define the row content. */
  columns?: LayoutColumn[];
  /** Legacy single-field mode (backward compatible, used when columns is absent/empty). */
  field?: string;
  literalText?: string;
  label?: string;
  labelSide?: LogicalSide;
  valueSide?: LogicalSide;
  bold?: boolean;
  color?: string;
  fontSize?: number;
  indent?: number;
  border?: Partial<BoxBorder>;
}

/** A box/container holding a group of rows with its own positioning — for A4 header columns. */
export interface LayoutBlock {
  id: string;
  order: number;
  visible: boolean;
  width?: number;       // % of paper width (for side-by-side columns)
  align: LogicalAlign;
  border?: BoxBorder;
  padding?: BoxSpacing;
  background?: string;
  rows: LayoutRow[];
  titleField?: string;   // PrintFieldRegistry ID — rendered as heading above rows
  titleStyle?: CellStyle;
}

export interface HeaderLayout {
  mode: 'simple' | 'columns';
  columns: LayoutBlock[]; // Empty when mode === 'simple'
}

export type ColumnKey =
  | 'rowNumber' | 'barcode' | 'ref' | 'name'
  | 'unit' | 'quantity' | 'price' | 'discount' | 'tva' | 'total';

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
  { code: 'STK', name: 'ملصق المنتج',      category: 'product'   },
] as const;

export type DocTypeCode = typeof DOC_TYPE_LIST[number]['code'];

export interface PrintTemplate {
  id:           number | null;
  name:         string;
  doc_type_code: DocTypeCode;
  paper_size:   PaperSize;
  is_default:   boolean;
  is_active:    boolean;
  template_version?: number;
  created_at?:  string;
  updated_at?:  string;

  paper_width_mm:   number;
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
  show_article:        boolean;
  show_capital:        boolean;
  show_mobile:         boolean;
  show_commercial_name: boolean;
  show_email:          boolean;
  show_fax:            boolean;
  show_bank_name:      boolean;
  show_rib:            boolean;
  show_activity:       boolean;
  company_info_align:  AlignOption;
  company_info_size:   number;
  company_info_bold:   boolean;
  company_info_italic: boolean;
  company_info_font_family: FontFamily;
  label_address:       string;
  label_phone:         string;
  label_nif:           string;
  label_rc:            string;
  label_nis:           string;
  label_article:       string;
  label_capital:       string;
  label_mobile:        string;
  label_commercial_name: string;
  label_email:         string;
  label_fax:           string;
  label_bank_name:     string;
  label_rib:           string;
  label_activity:      string;
  override_address:    string;
  override_phone:      string;
  override_nif:        string;
  override_rc:         string;
  override_nis:        string;
  override_ice:        string;
  override_article:    string;
  override_capital:    string;
  override_mobile:     string;
  override_commercial_name: string;
  override_email:      string;
  override_fax:        string;
  override_bank_name:  string;
  override_rib:        string;
  override_activity:   string;

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
  label_client:          string;
  label_client_nif:      string;
  label_client_phone:    string;
  label_client_address:  string;
  label_delivery_address: string;
  override_client_name:  string;
  override_client_nif:   string;
  override_client_phone: string;
  override_client_address: string;
  override_delivery_address: string;
  show_customer_commercial_name: boolean;
  show_customer_rc:    boolean;
  show_customer_nis:   boolean;
  show_customer_ai:    boolean;
  show_customer_mobile: boolean;
  show_customer_fax:   boolean;
  show_customer_email: boolean;
  show_customer_activity: boolean;
  show_customer_bank_name: boolean;
  show_customer_rib:   boolean;
  label_customer_commercial_name: string;
  label_customer_rc:  string;
  label_customer_nis: string;
  label_customer_ai:  string;
  label_customer_mobile: string;
  label_customer_fax: string;
  label_customer_email: string;
  label_customer_activity: string;
  label_customer_bank_name: string;
  label_customer_rib: string;
  override_customer_commercial_name: string;
  override_customer_rc: string;
  override_customer_nis: string;
  override_customer_ai: string;
  override_customer_mobile: string;
  override_customer_fax: string;
  override_customer_email: string;
  override_customer_activity: string;
  override_customer_bank_name: string;
  override_customer_rib: string;
  customer_info_font_family: FontFamily;
  customer_info_size:   number;
  customer_info_bold:   boolean;
  customer_info_italic: boolean;
  customer_info_align:  AlignOption;
  doc_info_align:       AlignOption;
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
  table_header_bg:    string;
  table_header_color: string;
  table_header_radius:number;
  table_cell_padding: number;
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

  totals_rows:   LayoutRow[];
  footer_rows:   LayoutRow[];
  header_layout: HeaderLayout;

  doc_info_rows:    LayoutRow[];
  customer_info_rows: LayoutRow[];
  company_info_rows:  LayoutRow[];
  col_styles:       ColumnStyleConfig[];
  page_frame:       PageFrameConfig;
  sections_order:   SectionMeta[];
  totals_grid:      TotalsGridConfig;
  watermark:        WatermarkConfig;

  show_payment_details:boolean;
  payment_font_size:   number;
  payments_align:      AlignOption;
  payments_font_family: FontFamily;

  footer_line1:        string;
  footer_line2:        string;
  footer_line3:        string;
  footer_separator:    BorderStyle;
  footer_align:        AlignOption;
  footer_text_color:   string;
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

  section_header_width:   number;
  section_header_align:   AlignOption;
  section_doc_info_width: number;
  section_doc_info_align: AlignOption;
  section_items_width:    number;
  section_items_align:    AlignOption;
  section_totals_width:   number;
  section_totals_align:   AlignOption;
  section_footer_width:   number;
  section_footer_align:   AlignOption;
  header_columns_gap:     number;
  client_card_width:      number;

  rules: ReportRule[];

  // ── ملصق المنتج (STK) ──
  show_label_barcode:      boolean;
  label_barcode_height:    number;
  label_barcode_bar_width: number;
  show_label_product_name: boolean;
  label_product_name_size: number;
  label_product_name_bold: boolean;
  label_product_name_color:string;
  show_label_price:        boolean;
  label_price_text:        string;
  label_price_size:        number;
  label_price_bold:        boolean;
  label_price_color:       string;
  label_price_prefix:      string;
  show_label_ref:          boolean;
  label_ref_size:          number;
  label_ref_color:         string;
  label_border_style:      BorderStyle;
  label_border_width:      number;
  label_border_color:      string;
  label_border_radius:     number;
  show_label_product_image: boolean;
  label_product_image_size: number;
  show_label_brand:         boolean;
  label_brand_size:         number;
  label_brand_color:        string;
  label_layout:             'stacked' | 'side-by-side';
  label_hide_currency:      boolean;
  label_barcode_format:     'code39' | 'ean13' | 'code128';
  label_barcode_show_text:  boolean;
  label_positions:          Record<string, StickerElementGeometry>;

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

  report_col_widths:  Partial<Record<'product' | 'quantity' | 'total', number>>;
  report_col_headers: Partial<Record<'product' | 'quantity' | 'total', string>>;
}

export type SectionTarget = 'header' | 'doc-info' | 'items' | 'totals' | 'payments' | 'footer';

export type SectionMeta = {
  key: SectionTarget;
  visible: boolean;
  order: number;
  width?: number;         // percentage of paper width (default 100)
  align?: AlignOption;    // horizontal alignment
  marginTop?: number;     // px
  marginBottom?: number;  // px
  minHeight?: number;     // px
};

export interface ColumnStyleConfig {
  key: ColumnKey;
  style?: Partial<CellStyle>;
}

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  fontSize?: number;
  color?: string;
  rotation?: number;
}

export interface PageFrameConfig {
  enabled: boolean;
  borderStyle?: BorderStyle;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  margin?: number;
}

export interface TotalsGridColumn {
  id: string;
  field: string;
  label: string;
  order: number;
  visible: boolean;
  align: AlignOption;
}

export interface TotalsGridConfig {
  enabled: boolean;
  headerBg?: string;
  headerColor?: string;
  borderColor?: string;
  columns: TotalsGridColumn[];
  summaryRows?: LayoutRow[];
}

export interface ReportRule {
  id: string;
  condition: string;
  action: 'show' | 'hide' | 'highlight' | 'disable';
  target: string;
  priority?: number;
  highlightStyle?: Record<string, string>;
}
