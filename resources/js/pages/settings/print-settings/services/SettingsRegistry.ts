import type { DocTypeCode, PaperSize, PrintTemplate, ColumnKey, AlignOption, BorderStyle, PriceMode, PageOrientation, FontFamily } from '../types/domain';

export type SettingComponent = 'toggle' | 'input' | 'select' | 'pills' | 'slider' | 'color' | 'textarea' | 'column-manager' | 'rules-editor' | 'logo-upload';

export interface SettingMeta {
  key: keyof PrintTemplate;
  label: string;
  labelAr: string;
  category: 'global' | 'paper' | 'header' | 'company' | 'document' | 'columns' | 'items' | 'totals' | 'payments' | 'footer' | 'barcode' | 'qr' | 'signature' | 'section-visibility' | 'rules' | 'report' | 'charts' | 'formatting' | 'label';
  component: SettingComponent;
  defaultValue: unknown;
  supportedPapers: PaperSize[];
  supportedDocs: DocTypeCode[];
  description?: string;
  groupKey?: string;
  dependsOn?: keyof PrintTemplate;
  /** When set, the child is only visible when the parent's value equals this value. For toggle parents, falsy parent = hidden. For pills/select/slider parents, parent !== dependsOnValue = hidden. */
  dependsOnValue?: unknown;
  options?: readonly { v: string; l: string }[];
  min?: number;
  max?: number;
  step?: number;
  /** Canonical field ID from PrintFieldRegistry (show_* settings only) */
  field?: string;
  /** Doc-type-specific defaults — applied by the serializer backfill BEFORE the generic defaultValue (e.g. show_qr_code ON for FV). */
  docDefaults?: Partial<Record<DocTypeCode, unknown>>;
}

const ALL_DOCS: DocTypeCode[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT', 'STK'];
const STICKER_DOCS: DocTypeCode[] = ['STK'];
const STICKER_LABEL: PaperSize[] = ['40x20mm', '30x20mm', '60x40mm', '80x50mm', '100x50mm'];
const COMMERCIAL_DOCS: DocTypeCode[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV'];
const POS_DOCS: DocTypeCode[] = ['POS', 'RPT'];
const REPORT_DOC: DocTypeCode[] = ['RPT'];
const THERMAL: PaperSize[] = ['80mm', '58mm'];
const PAGE: PaperSize[] = ['A4', 'A5'];
const ALL_PAPERS: PaperSize[] = ['80mm', '58mm', 'A4', 'A5', '40x20mm', '30x20mm', '60x40mm', '80x50mm', '100x50mm'];

const ALIGN_OPTS = [
  { v: 'right' as const, l: 'يمين' },
  { v: 'center' as const, l: 'وسط' },
  { v: 'left' as const, l: 'يسار' },
];

const BORDER_OPTS = [
  { v: 'solid' as const, l: 'صلبة' },
  { v: 'dashed' as const, l: 'متقطعة' },
  { v: 'double' as const, l: 'مزدوجة' },
  { v: 'none' as const, l: 'بدون' },
];

/** Single source of truth for selectable fonts (Google Fonts families are loaded in app.blade.php / print popup). */
export const FONT_OPTIONS: readonly { v: FontFamily; l: string }[] = [
  { v: 'tajawal',    l: 'Tajawal' },
  { v: 'cairo',      l: 'Cairo' },
  { v: 'almarai',    l: 'Almarai' },
  { v: 'noto_kufi',  l: 'Noto Kufi Arabic' },
  { v: 'el_messiri', l: 'El Messiri' },
  { v: 'zain',       l: 'Zain' },
  { v: 'amiri',      l: 'Amiri' },
  { v: 'monospace',  l: 'Monospace' },
  { v: 'times',      l: 'Times New Roman' },
  { v: 'arial',      l: 'Arial' },
];

export const SETTINGS_REGISTRY: Record<string, SettingMeta> = {
  // ── Global ──
  id:             { key: 'id', label: 'ID', labelAr: 'المعرف', category: 'global', component: 'input', defaultValue: null, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  name:           { key: 'name', label: 'Name', labelAr: 'الاسم', category: 'global', component: 'input', defaultValue: 'قالب جديد', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  doc_type_code:  { key: 'doc_type_code', label: 'Document Type', labelAr: 'نوع المستند', category: 'global', component: 'select', defaultValue: 'FV', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  paper_size:     { key: 'paper_size', label: 'Paper Size', labelAr: 'حجم الورق', category: 'paper', component: 'pills', defaultValue: '80mm' as PaperSize, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  is_default:     { key: 'is_default', label: 'Default', labelAr: 'افتراضي', category: 'global', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  is_active:      { key: 'is_active', label: 'Active', labelAr: 'مفعل', category: 'global', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Paper / Formatting ──
  paper_width_mm:   { key: 'paper_width_mm', label: 'Paper Width (mm)', labelAr: 'عرض الورق (ملم)', category: 'paper', component: 'select', defaultValue: 80, supportedPapers: THERMAL, supportedDocs: ALL_DOCS, options: [{ v: '58', l: '58mm' }, { v: '80', l: '80mm' }] },
  page_orientation: { key: 'page_orientation', label: 'Page Orientation', labelAr: 'اتجاه الصفحة', category: 'paper', component: 'pills', defaultValue: 'portrait' as PageOrientation, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: [{ v: 'portrait', l: 'عمودي' }, { v: 'landscape', l: 'أفقي' }] },
  margin_top:       { key: 'margin_top', label: 'Top Margin (mm)', labelAr: 'الهامش العلوي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  margin_bottom:    { key: 'margin_bottom', label: 'Bottom Margin (mm)', labelAr: 'الهامش السفلي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  margin_sides:     { key: 'margin_sides', label: 'Side Margin (mm)', labelAr: 'الهامش الجانبي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  line_spacing:     { key: 'line_spacing', label: 'Line Spacing', labelAr: 'تباعد الأسطر', category: 'formatting', component: 'slider', defaultValue: 1.3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0.8, max: 3, step: 0.1 },
  base_font_size:   { key: 'base_font_size', label: 'Base Font Size', labelAr: 'حجم الخط الأساسي', category: 'formatting', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 20, step: 0.5 },
  font_family:      { key: 'font_family', label: 'Font Family', labelAr: 'نوع الخط', category: 'formatting', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: FONT_OPTIONS },


  // ── Layout Structure (complex objects managed by dedicated controls) ──
  page_frame:       { key: 'page_frame', label: 'Page Frame', labelAr: 'إطار الصفحة', category: 'formatting', component: 'input', defaultValue: { enabled: false }, supportedPapers: PAGE, supportedDocs: ALL_DOCS },
  sections_order:   { key: 'sections_order', label: 'Section Order', labelAr: 'ترتيب الأقسام', category: 'formatting', component: 'input', defaultValue: [] as unknown[], supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  header_layout:    { key: 'header_layout', label: 'Header Layout', labelAr: 'تخطيط الرأس', category: 'header', component: 'input', defaultValue: { mode: 'simple', columns: [] }, supportedPapers: PAGE, supportedDocs: ALL_DOCS },
  watermark:        { key: 'watermark', label: 'Watermark', labelAr: 'علامة مائية', category: 'formatting', component: 'input', defaultValue: { enabled: false }, supportedPapers: PAGE, supportedDocs: ALL_DOCS },
  // ── Header / Logo ──
  show_logo:          { key: 'show_logo', label: 'Show Logo', labelAr: 'إظهار الشعار', category: 'header', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.logo' },
  logo_source:        { key: 'logo_source', label: 'Logo Source', labelAr: 'مصدر الشعار', category: 'header', component: 'pills', defaultValue: 'company', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', options: [{ v: 'company', l: 'الشركة' }, { v: 'custom', l: 'مخصص' }, { v: 'default', l: 'افتراضي' }] },
  logo_size:          { key: 'logo_size', label: 'Logo Size (px)', labelAr: 'حجم الشعار (بكسل)', category: 'header', component: 'slider', defaultValue: 56, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', min: 20, max: 200, step: 2 },
  logo_align:         { key: 'logo_align', label: 'Logo Alignment', labelAr: 'محاذاة الشعار', category: 'header', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', options: ALIGN_OPTS },
  logo_border_radius: { key: 'logo_border_radius', label: 'Logo Border Radius', labelAr: 'تدوير زوايا الشعار', category: 'header', component: 'slider', defaultValue: 50, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', min: 0, max: 100, step: 5 },
  custom_logo_url:    { key: 'custom_logo_url', label: 'Custom Logo URL', labelAr: 'رابط الشعار المخصص', category: 'header', component: 'input', defaultValue: null, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo' },

  // ── Company ──
  show_company_name:  { key: 'show_company_name', label: 'Show Company Name', labelAr: 'إظهار اسم الشركة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.name' },
  company_name_text:  { key: 'company_name_text', label: 'Company Name Text', labelAr: 'نص اسم الشركة', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },
  company_name_size:  { key: 'company_name_size', label: 'Company Name Size', labelAr: 'حجم اسم الشركة', category: 'company', component: 'slider', defaultValue: 15, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name', min: 8, max: 30, step: 1 },
  company_name_bold:  { key: 'company_name_bold', label: 'Bold Company Name', labelAr: 'تسميك اسم الشركة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },
  company_name_align: { key: 'company_name_align', label: 'Company Name Alignment', labelAr: 'محاذاة اسم الشركة', category: 'company', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name', options: ALIGN_OPTS },
  company_name_color: { key: 'company_name_color', label: 'Company Name Color', labelAr: 'لون اسم الشركة', category: 'company', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },

  // ── Company Info ──
  show_address:       { key: 'show_address', label: 'Show Address', labelAr: 'إظهار العنوان', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.address' },
  show_phone:         { key: 'show_phone', label: 'Show Phone', labelAr: 'إظهار الهاتف', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.phone' },
  show_tax_id:        { key: 'show_tax_id', label: 'Show Tax ID (NIF)', labelAr: 'إظهار رقم الضريبة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.nif' },
  show_rc:            { key: 'show_rc', label: 'Show RC', labelAr: 'إظهار السجل التجاري', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.rc' },
  show_nis:           { key: 'show_nis', label: 'Show NIS', labelAr: 'إظهار رقم NIS', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.nis' },
  show_article:       { key: 'show_article', label: 'Show Article', labelAr: 'إظهار المادة الجبائية', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.article' },
  show_capital:       { key: 'show_capital', label: 'Show Capital', labelAr: 'إظهار الرأس المال', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.capital' },
  show_mobile:        { key: 'show_mobile', label: 'Show Mobile', labelAr: 'إظهار المحمول', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.mobile' },
  show_commercial_name: { key: 'show_commercial_name', label: 'Show Commercial Name', labelAr: 'إظهار الاسم التجاري', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.commercialName' },
  show_email:         { key: 'show_email', label: 'Show Email', labelAr: 'إظهار البريد الإلكتروني', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.email' },
  show_fax:           { key: 'show_fax', label: 'Show Fax', labelAr: 'إظهار الفاكس', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.fax' },
  show_bank_name:     { key: 'show_bank_name', label: 'Show Bank Name', labelAr: 'إظهار اسم البنك', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.bankName' },
  show_rib:           { key: 'show_rib', label: 'Show RIB', labelAr: 'إظهار الحساب البنكي', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.rib' },
  show_activity:      { key: 'show_activity', label: 'Show Activity', labelAr: 'إظهار النشاط', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.activity' },
  company_info_align: { key: 'company_info_align', label: 'Info Alignment', labelAr: 'محاذاة المعلومات', category: 'company', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  company_info_size:  { key: 'company_info_size', label: 'Info Font Size', labelAr: 'حجم خط المعلومات', category: 'company', component: 'slider', defaultValue: 9, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 16, step: 0.5 },
  company_info_bold:  { key: 'company_info_bold', label: 'Bold Info', labelAr: 'تسميك معلومات الشركة', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  company_info_italic:{ key: 'company_info_italic', label: 'Italic Info', labelAr: 'مائل معلومات الشركة', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  company_info_font_family: { key: 'company_info_font_family', label: 'Info Font Family', labelAr: 'نوع خط المعلومات', category: 'company', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: FONT_OPTIONS },
  label_address:      { key: 'label_address', label: 'Label: Address', labelAr: 'تسمية العنوان', category: 'company', component: 'input', defaultValue: 'العنوان', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_address' },
  label_phone:        { key: 'label_phone', label: 'Label: Phone', labelAr: 'تسمية الهاتف', category: 'company', component: 'input', defaultValue: 'الهاتف', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_phone' },
  label_nif:          { key: 'label_nif', label: 'Label: NIF', labelAr: 'تسمية رقم الضريبة', category: 'company', component: 'input', defaultValue: 'NIF', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_tax_id' },
  label_rc:           { key: 'label_rc', label: 'Label: RC', labelAr: 'تسمية السجل التجاري', category: 'company', component: 'input', defaultValue: 'RC', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_rc' },
  label_nis:          { key: 'label_nis', label: 'Label: NIS', labelAr: 'تسمية رقم NIS', category: 'company', component: 'input', defaultValue: 'NIS', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_nis' },
  label_article:      { key: 'label_article', label: 'Label: Article', labelAr: 'تسمية المادة الجبائية', category: 'company', component: 'input', defaultValue: 'المادة الجبائية', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_article' },
  label_capital:      { key: 'label_capital', label: 'Label: Capital', labelAr: 'تسمية الرأس المال', category: 'company', component: 'input', defaultValue: 'الرأس المال', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_capital' },
  label_mobile:       { key: 'label_mobile', label: 'Label: Mobile', labelAr: 'تسمية المحمول', category: 'company', component: 'input', defaultValue: 'المحمول', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_mobile' },
  label_commercial_name: { key: 'label_commercial_name', label: 'Label: Commercial Name', labelAr: 'تسمية الاسم التجاري', category: 'company', component: 'input', defaultValue: 'الاسم التجاري', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_commercial_name' },
  label_email:        { key: 'label_email', label: 'Label: Email', labelAr: 'تسمية البريد الإلكتروني', category: 'company', component: 'input', defaultValue: 'البريد الإلكتروني', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_email' },
  label_fax:          { key: 'label_fax', label: 'Label: Fax', labelAr: 'تسمية الفاكس', category: 'company', component: 'input', defaultValue: 'الفاكس', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_fax' },
  label_bank_name:    { key: 'label_bank_name', label: 'Label: Bank Name', labelAr: 'تسمية اسم البنك', category: 'company', component: 'input', defaultValue: 'اسم البنك', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_bank_name' },
  label_rib:          { key: 'label_rib', label: 'Label: RIB', labelAr: 'تسمية الحساب البنكي', category: 'company', component: 'input', defaultValue: 'RIB', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_rib' },
  label_activity:     { key: 'label_activity', label: 'Label: Activity', labelAr: 'تسمية النشاط', category: 'company', component: 'input', defaultValue: 'النشاط', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_activity' },
  override_address:   { key: 'override_address', label: 'Override Address', labelAr: 'تجاوز العنوان', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_phone:     { key: 'override_phone', label: 'Override Phone', labelAr: 'تجاوز الهاتف', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_nif:       { key: 'override_nif', label: 'Override NIF', labelAr: 'تجاوز رقم الضريبة', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_rc:        { key: 'override_rc', label: 'Override RC', labelAr: 'تجاوز السجل التجاري', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_nis:       { key: 'override_nis', label: 'Override NIS', labelAr: 'تجاوز NIS', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_ice:       { key: 'override_ice', label: 'Override ICE', labelAr: 'تجاوز ICE', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_article:   { key: 'override_article', label: 'Override Article', labelAr: 'تجاوز المادة الجبائية', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_capital:   { key: 'override_capital', label: 'Override Capital', labelAr: 'تجاوز الرأس المال', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_mobile:    { key: 'override_mobile', label: 'Override Mobile', labelAr: 'تجاوز المحمول', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_commercial_name: { key: 'override_commercial_name', label: 'Override Commercial Name', labelAr: 'تجاوز الاسم التجاري', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_email:     { key: 'override_email', label: 'Override Email', labelAr: 'تجاوز البريد الإلكتروني', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_fax:       { key: 'override_fax', label: 'Override Fax', labelAr: 'تجاوز الفاكس', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_bank_name: { key: 'override_bank_name', label: 'Override Bank Name', labelAr: 'تجاوز اسم البنك', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_rib:       { key: 'override_rib', label: 'Override RIB', labelAr: 'تجاوز الحساب البنكي', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_activity:  { key: 'override_activity', label: 'Override Activity', labelAr: 'تجاوز النشاط', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  header_custom_text: { key: 'header_custom_text', label: 'Header Custom Text', labelAr: 'نص مخصص للرأس', category: 'header', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  header_separator:   { key: 'header_separator', label: 'Header Separator', labelAr: 'فاصل الرأس', category: 'header', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },

  // ── Document ──
  title_text:           { key: 'title_text', label: 'Title Text', labelAr: 'نص العنوان', category: 'document', component: 'input', defaultValue: 'فاتورة بيع', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  title_size:           { key: 'title_size', label: 'Title Size', labelAr: 'حجم العنوان', category: 'document', component: 'slider', defaultValue: 13, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 8, max: 30, step: 1 },
  title_bold:           { key: 'title_bold', label: 'Bold Title', labelAr: 'تسميك العنوان', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  title_align:          { key: 'title_align', label: 'Title Alignment', labelAr: 'محاذاة العنوان', category: 'document', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  title_color:          { key: 'title_color', label: 'Title Color', labelAr: 'لون العنوان', category: 'document', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_doc_number:      { key: 'show_doc_number', label: 'Show Document Number', labelAr: 'إظهار رقم المستند', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.number' },
  show_date:            { key: 'show_date', label: 'Show Date', labelAr: 'إظهار التاريخ', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.date' },
  show_time:            { key: 'show_time', label: 'Show Time', labelAr: 'إظهار الوقت', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.time' },
  show_due_date:        { key: 'show_due_date', label: 'Show Due Date', labelAr: 'إظهار تاريخ الاستحقاق', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.dueDate' },
  show_cashier:         { key: 'show_cashier', label: 'Show Cashier', labelAr: 'إظهار الكاشير', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.cashierName' },
  show_client:          { key: 'show_client', label: 'Show Client', labelAr: 'إظهار العميل', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.name' },
  show_client_nif:      { key: 'show_client_nif', label: 'Show Client NIF', labelAr: 'إظهار رقم ضريبة العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.nif' },
  show_client_phone:    { key: 'show_client_phone', label: 'Show Client Phone', labelAr: 'إظهار هاتف العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.phone' },
  show_client_address:  { key: 'show_client_address', label: 'Show Client Address', labelAr: 'إظهار عنوان العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.address' },
  show_delivery_address:{ key: 'show_delivery_address', label: 'Show Delivery Address', labelAr: 'إظهار عنوان التسليم', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS, field: 'customer.deliveryAddress' },
  label_client:          { key: 'label_client', label: 'Label: Client Name', labelAr: 'تسمية اسم العميل', category: 'document', component: 'input', defaultValue: 'العميل', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_client' },
  label_client_nif:      { key: 'label_client_nif', label: 'Label: Client NIF', labelAr: 'تسمية رقم ضريبة العميل', category: 'document', component: 'input', defaultValue: 'NIF العميل', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_client_nif' },
  label_client_phone:    { key: 'label_client_phone', label: 'Label: Client Phone', labelAr: 'تسمية هاتف العميل', category: 'document', component: 'input', defaultValue: 'هاتف العميل', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_client_phone' },
  label_client_address:  { key: 'label_client_address', label: 'Label: Client Address', labelAr: 'تسمية عنوان العميل', category: 'document', component: 'input', defaultValue: 'العنوان', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_client_address' },
  label_delivery_address: { key: 'label_delivery_address', label: 'Label: Delivery Address', labelAr: 'تسمية عنوان التسليم', category: 'document', component: 'input', defaultValue: 'عنوان التسليم', supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS, dependsOn: 'show_delivery_address' },
  override_client_name:  { key: 'override_client_name', label: 'Override Client Name', labelAr: 'تجاوز اسم العميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_client_nif:   { key: 'override_client_nif', label: 'Override Client NIF', labelAr: 'تجاوز رقم ضريبة العميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_client_phone: { key: 'override_client_phone', label: 'Override Client Phone', labelAr: 'تجاوز هاتف العميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_client_address: { key: 'override_client_address', label: 'Override Client Address', labelAr: 'تجاوز عنوان العميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_delivery_address: { key: 'override_delivery_address', label: 'Override Delivery Address', labelAr: 'تجاوز عنوان التسليم', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS },
  show_customer_commercial_name: { key: 'show_customer_commercial_name', label: 'Show Customer Trade Name', labelAr: 'إظهار الاسم التجاري للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.commercialName' },
  show_customer_rc:   { key: 'show_customer_rc', label: 'Show Customer RC', labelAr: 'إظهار السجل التجاري للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.rc' },
  show_customer_nis:  { key: 'show_customer_nis', label: 'Show Customer NIS', labelAr: 'إظهار رقم NIS للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.nis' },
  show_customer_ai:   { key: 'show_customer_ai', label: 'Show Customer AI', labelAr: 'إظهار المادة الجبائية للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.ai' },
  show_customer_mobile: { key: 'show_customer_mobile', label: 'Show Customer Mobile', labelAr: 'إظهار المحمول للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.mobile' },
  show_customer_fax:  { key: 'show_customer_fax', label: 'Show Customer Fax', labelAr: 'إظهار الفاكس للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.fax' },
  show_customer_email: { key: 'show_customer_email', label: 'Show Customer Email', labelAr: 'إظهار البريد الإلكتروني للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.email' },
  show_customer_activity: { key: 'show_customer_activity', label: 'Show Customer Activity', labelAr: 'إظهار نشاط العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.activity' },
  show_customer_bank_name: { key: 'show_customer_bank_name', label: 'Show Customer Bank', labelAr: 'إظهار اسم البنك للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.bankName' },
  show_customer_rib:  { key: 'show_customer_rib', label: 'Show Customer RIB', labelAr: 'إظهار الحساب البنكي للعميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.rib' },
  label_customer_commercial_name: { key: 'label_customer_commercial_name', label: 'Label: Customer Trade Name', labelAr: 'تسمية الاسم التجاري للعميل', category: 'document', component: 'input', defaultValue: 'الاسم التجاري', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_commercial_name' },
  label_customer_rc: { key: 'label_customer_rc', label: 'Label: Customer RC', labelAr: 'تسمية السجل التجاري للعميل', category: 'document', component: 'input', defaultValue: 'RC', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_rc' },
  label_customer_nis: { key: 'label_customer_nis', label: 'Label: Customer NIS', labelAr: 'تسمية رقم NIS للعميل', category: 'document', component: 'input', defaultValue: 'NIS', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_nis' },
  label_customer_ai: { key: 'label_customer_ai', label: 'Label: Customer AI', labelAr: 'تسمية المادة الجبائية للعميل', category: 'document', component: 'input', defaultValue: 'المادة الجبائية', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_ai' },
  label_customer_mobile: { key: 'label_customer_mobile', label: 'Label: Customer Mobile', labelAr: 'تسمية المحمول للعميل', category: 'document', component: 'input', defaultValue: 'المحمول', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_mobile' },
  label_customer_fax: { key: 'label_customer_fax', label: 'Label: Customer Fax', labelAr: 'تسمية الفاكس للعميل', category: 'document', component: 'input', defaultValue: 'الفاكس', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_fax' },
  label_customer_email: { key: 'label_customer_email', label: 'Label: Customer Email', labelAr: 'تسمية البريد الإلكتروني للعميل', category: 'document', component: 'input', defaultValue: 'البريد الإلكتروني', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_email' },
  label_customer_activity: { key: 'label_customer_activity', label: 'Label: Customer Activity', labelAr: 'تسمية نشاط العميل', category: 'document', component: 'input', defaultValue: 'النشاط', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_activity' },
  label_customer_bank_name: { key: 'label_customer_bank_name', label: 'Label: Customer Bank', labelAr: 'تسمية اسم البنك للعميل', category: 'document', component: 'input', defaultValue: 'اسم البنك', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_bank_name' },
  label_customer_rib: { key: 'label_customer_rib', label: 'Label: Customer RIB', labelAr: 'تسمية الحساب البنكي للعميل', category: 'document', component: 'input', defaultValue: 'RIB', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_customer_rib' },
  override_customer_commercial_name: { key: 'override_customer_commercial_name', label: 'Override Customer Trade Name', labelAr: 'تجاوز الاسم التجاري للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_rc: { key: 'override_customer_rc', label: 'Override Customer RC', labelAr: 'تجاوز السجل التجاري للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_nis: { key: 'override_customer_nis', label: 'Override Customer NIS', labelAr: 'تجاوز رقم NIS للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_ai: { key: 'override_customer_ai', label: 'Override Customer AI', labelAr: 'تجاوز المادة الجبائية للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_mobile: { key: 'override_customer_mobile', label: 'Override Customer Mobile', labelAr: 'تجاوز المحمول للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_fax: { key: 'override_customer_fax', label: 'Override Customer Fax', labelAr: 'تجاوز الفاكس للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_email: { key: 'override_customer_email', label: 'Override Customer Email', labelAr: 'تجاوز البريد الإلكتروني للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_activity: { key: 'override_customer_activity', label: 'Override Customer Activity', labelAr: 'تجاوز نشاط العميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_bank_name: { key: 'override_customer_bank_name', label: 'Override Customer Bank', labelAr: 'تجاوز اسم البنك للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_customer_rib: { key: 'override_customer_rib', label: 'Override Customer RIB', labelAr: 'تجاوز الحساب البنكي للعميل', category: 'document', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  customer_info_font_family: { key: 'customer_info_font_family', label: 'Customer Info Font', labelAr: 'نوع خط معلومات العميل', category: 'document', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: FONT_OPTIONS },
  customer_info_size: { key: 'customer_info_size', label: 'Customer Info Size', labelAr: 'حجم خط معلومات العميل', category: 'document', component: 'slider', defaultValue: 9, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 16, step: 0.5 },
  customer_info_bold: { key: 'customer_info_bold', label: 'Customer Info Bold', labelAr: 'تسميك معلومات العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  customer_info_italic: { key: 'customer_info_italic', label: 'Customer Info Italic', labelAr: 'مائل معلومات العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  customer_info_align: { key: 'customer_info_align', label: 'Customer Info Alignment', labelAr: 'محاذاة معلومات العميل', category: 'document', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  doc_info_align:      { key: 'doc_info_align', label: 'Doc Info Alignment', labelAr: 'محاذاة قسم المستند', category: 'document', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  show_session:         { key: 'show_session', label: 'Show Session', labelAr: 'إظهار الجلسة', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: POS_DOCS, field: 'session.code' },
  show_payment_term:    { key: 'show_payment_term', label: 'Show Payment Term', labelAr: 'إظهار شرط الدفع', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS, field: 'document.paymentTerm' },
  show_bank_details:    { key: 'show_bank_details', label: 'Show Bank Details', labelAr: 'إظهار تفاصيل البنك', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: PAGE, supportedDocs: COMMERCIAL_DOCS, field: 'footer.bankDetails' },
  bank_details_text:    { key: 'bank_details_text', label: 'Bank Details Text', labelAr: 'نص تفاصيل البنك', category: 'document', component: 'textarea', defaultValue: '', supportedPapers: PAGE, supportedDocs: COMMERCIAL_DOCS, dependsOn: 'show_bank_details' },
  doc_separator:        { key: 'doc_separator', label: 'Document Separator', labelAr: 'فاصل المستند', category: 'document', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },

  // ── Items / Columns ──
  col_order:            { key: 'col_order', label: 'Column Order', labelAr: 'ترتيب الأعمدة', category: 'columns', component: 'column-manager', defaultValue: ['name', 'quantity', 'price', 'total'] as ColumnKey[], supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_show:             { key: 'col_show', label: 'Column Visibility', labelAr: 'إظهار الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, boolean>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_widths:           { key: 'col_widths', label: 'Column Widths', labelAr: 'عرض الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, number>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_headers:          { key: 'col_headers', label: 'Column Headers', labelAr: 'عناوين الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, string>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_aligns:           { key: 'col_aligns', label: 'Column Alignments', labelAr: 'محاذاة الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, AlignOption>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Items Table ──
  items_font_size:      { key: 'items_font_size', label: 'Items Font Size', labelAr: 'حجم خط الجدول', category: 'items', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 18, step: 0.5 },
  items_font_family:    { key: 'items_font_family', label: 'Items Font Family', labelAr: 'نوع خط الجدول', category: 'items', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: FONT_OPTIONS },
  show_col_header:      { key: 'show_col_header', label: 'Show Column Headers', labelAr: 'إظهار رؤوس الأعمدة', category: 'items', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  table_header_bold:    { key: 'table_header_bold', label: 'Bold Table Header', labelAr: 'تسميك رأس الجدول', category: 'items', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_header_bg:      { key: 'table_header_bg', label: 'Table Header Background', labelAr: 'لون خلفية رأس الجدول', category: 'items', component: 'color', defaultValue: '#f5f5f5', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_header_color:   { key: 'table_header_color', label: 'Table Header Text Color', labelAr: 'لون نص رأس الجدول', category: 'items', component: 'color', defaultValue: '#333333', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_header_radius:  { key: 'table_header_radius', label: 'Table Header Corner Radius', labelAr: 'استدارة أركان رأس الجدول', category: 'items', component: 'slider', defaultValue: 6, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header', min: 0, max: 20, step: 1 },
  table_cell_padding:   { key: 'table_cell_padding', label: 'Cell Padding', labelAr: 'مسافة الخلايا', category: 'items', component: 'slider', defaultValue: 6, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 2, max: 20, step: 1 },
  table_border_style:   { key: 'table_border_style', label: 'Table Border Style', labelAr: 'نمط حدود الجدول', category: 'items', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  alternating_rows:     { key: 'alternating_rows', label: 'Alternating Row Colors', labelAr: 'تلوين الصفوف بالتناوب', category: 'items', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  alternating_color:    { key: 'alternating_color', label: 'Alternating Color', labelAr: 'لون التناوب', category: 'items', component: 'color', defaultValue: '#f5f5f5', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'alternating_rows' },
  price_display:        { key: 'price_display', label: 'Price Display Mode', labelAr: 'طريقة عرض السعر', category: 'items', component: 'pills', defaultValue: 'ht' as PriceMode, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: [{ v: 'ht', l: 'HT' }, { v: 'ttc', l: 'TTC' }] },
  show_line_total_ttc:  { key: 'show_line_total_ttc', label: 'Show Line Total TTC', labelAr: 'إظهار المجموع لكل سطر', category: 'items', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Totals ──
  totals_font_size:     { key: 'totals_font_size', label: 'Totals Font Size', labelAr: 'حجم خط الإجماليات', category: 'totals', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 20, step: 0.5 },
  totals_bold:          { key: 'totals_bold', label: 'Bold Totals', labelAr: 'تسميك الإجماليات', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  totals_align:         { key: 'totals_align', label: 'Totals Alignment', labelAr: 'محاذاة الإجماليات', category: 'totals', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  show_total_ht:        { key: 'show_total_ht', label: 'Show Total HT', labelAr: 'إظهار المجموع HT', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.ht' },
  show_total_tva:       { key: 'show_total_tva', label: 'Show Total TVA', labelAr: 'إظهار مجموع الضريبة', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.tva' },
  show_tva_breakdown:   { key: 'show_tva_breakdown', label: 'Show TVA Breakdown', labelAr: 'تفصيل الضريبة حسب النسبة', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'tvaBreakdown.rate' },
  show_discount_total:  { key: 'show_discount_total', label: 'Show Discount Total', labelAr: 'إظهار مجموع الخصم', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.discount' },
  show_fiscal_stamp:    { key: 'show_fiscal_stamp', label: 'Show Fiscal Stamp', labelAr: 'إظهار الطابع الضريبي', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS , field: 'totals.fiscalStamp' },
  show_total_ttc:       { key: 'show_total_ttc', label: 'Show Total TTC', labelAr: 'إظهار المجموع TTC', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.ttc' },
  total_ttc_font_size:  { key: 'total_ttc_font_size', label: 'TTC Font Size', labelAr: 'حجم خط TTC', category: 'totals', component: 'slider', defaultValue: 14, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 10, max: 30, step: 1 },
  total_ttc_bold:       { key: 'total_ttc_bold', label: 'Bold TTC', labelAr: 'تسميك TTC', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  total_ttc_color:      { key: 'total_ttc_color', label: 'TTC Color', labelAr: 'لون TTC', category: 'totals', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  total_border_style:   { key: 'total_border_style', label: 'Totals Border Style', labelAr: 'نمط حدود الإجماليات', category: 'totals', component: 'pills', defaultValue: 'double' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  show_amount_in_words: { key: 'show_amount_in_words', label: 'Show Amount in Words', labelAr: 'إظهار المبلغ كتابةً', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.amountInWords' },
  show_paid_amount:     { key: 'show_paid_amount', label: 'Show Paid Amount', labelAr: 'إظهار المبلغ المدفوع', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.paid' },
  show_change:          { key: 'show_change', label: 'Show Change', labelAr: 'إظهار الباقي', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.change' },
  show_remaining:       { key: 'show_remaining', label: 'Show Remaining', labelAr: 'إظهار المتبقي', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.remaining' },
  show_prev_balance:    { key: 'show_prev_balance', label: 'Show Previous Balance', labelAr: 'إظهار الرصيد السابق', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'balance.previous' },
  show_new_balance:     { key: 'show_new_balance', label: 'Show New Balance', labelAr: 'إظهار الرصيد الجديد', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'balance.current' },

  // ── Payments ──
  show_payment_details: { key: 'show_payment_details', label: 'Show Payment Details', labelAr: 'إظهار تفاصيل الدفع', category: 'payments', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'payment.method' },
  payment_font_size:    { key: 'payment_font_size', label: 'Payment Font Size', labelAr: 'حجم خط الدفع', category: 'payments', component: 'slider', defaultValue: 9, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 16, step: 0.5 },
  payments_align:       { key: 'payments_align', label: 'Payments Alignment', labelAr: 'محاذاة الدفع', category: 'payments', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  payments_font_family: { key: 'payments_font_family', label: 'Payments Font Family', labelAr: 'نوع خط الدفع', category: 'payments', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: FONT_OPTIONS },

  // ── Footer ──
  footer_line1:         { key: 'footer_line1', label: 'Footer Line 1', labelAr: 'سطر التذييل 1', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_line2:         { key: 'footer_line2', label: 'Footer Line 2', labelAr: 'سطر التذييل 2', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_line3:         { key: 'footer_line3', label: 'Footer Line 3', labelAr: 'سطر التذييل 3', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_separator:     { key: 'footer_separator', label: 'Footer Separator', labelAr: 'فاصل التذييل', category: 'footer', component: 'pills', defaultValue: 'solid' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  footer_align:         { key: 'footer_align', label: 'Footer Alignment', labelAr: 'محاذاة التذييل', category: 'footer', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  footer_text_color:    { key: 'footer_text_color', label: 'Footer Text Color', labelAr: 'لون نص التذييل', category: 'footer', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_thank_you:       { key: 'show_thank_you', label: 'Show Thank You', labelAr: 'إظهار الشكر', category: 'footer', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.thankYou' },
  thank_you_text:       { key: 'thank_you_text', label: 'Thank You Text', labelAr: 'نص الشكر', category: 'footer', component: 'input', defaultValue: 'شكراً لزيارتكم!', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you' },
  thank_you_size:       { key: 'thank_you_size', label: 'Thank You Size', labelAr: 'حجم خط الشكر', category: 'footer', component: 'slider', defaultValue: 11, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you', min: 8, max: 24, step: 1 },
  thank_you_color:      { key: 'thank_you_color', label: 'Thank You Color', labelAr: 'لون الشكر', category: 'footer', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you' },
  show_returns_policy:  { key: 'show_returns_policy', label: 'Show Returns Policy', labelAr: 'إظهار سياسة الإرجاع', category: 'footer', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.returnsPolicy' },
  returns_policy_text:  { key: 'returns_policy_text', label: 'Returns Policy Text', labelAr: 'نص سياسة الإرجاع', category: 'footer', component: 'input', defaultValue: 'كل الاحتجاجات لا تتعدى 48 ساعة', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_returns_policy' },
  footer_legal_text:    { key: 'footer_legal_text', label: 'Footer Legal Text', labelAr: 'نص قانوني', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Barcode / QR ──
  show_barcode:         { key: 'show_barcode', label: 'Show Barcode', labelAr: 'إظهار الباركود', category: 'barcode', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.barcode' },
  barcode_content:      { key: 'barcode_content', label: 'Barcode Content', labelAr: 'محتوى الباركود', category: 'barcode', component: 'pills', defaultValue: 'doc-number', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_barcode', options: [{ v: 'doc-number', l: 'رقم المستند' }, { v: 'total', l: 'المجموع' }, { v: 'custom', l: 'نص مخصص' }] },
  barcode_custom_text:  { key: 'barcode_custom_text', label: 'Barcode Custom Text', labelAr: 'نص الباركود المخصص', category: 'barcode', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'barcode_content', dependsOnValue: 'custom' },
  show_qr:              { key: 'show_qr', label: 'Show QR Code', labelAr: 'إظهار رمز QR', category: 'qr', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.qr' },
  qr_content:           { key: 'qr_content', label: 'QR Content', labelAr: 'محتوى QR', category: 'qr', component: 'pills', defaultValue: 'doc-number', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_qr', options: [{ v: 'doc-number', l: 'رقم المستند' }, { v: 'company-info', l: 'معلومات الشركة' }, { v: 'both', l: 'كلاهما' }] },
  show_qr_code:         { key: 'show_qr_code', label: 'Fiscal QR (E-Invoice)', labelAr: 'رمز QR الجبائي (فاتورة إلكترونية)', category: 'qr', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'footer.qrCode', docDefaults: { FV: true } },
  qr_code_size:         { key: 'qr_code_size', label: 'Fiscal QR Size', labelAr: 'حجم رمز QR', category: 'qr', component: 'slider', defaultValue: 48, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_qr_code', min: 24, max: 160, step: 4 },
  qr_code_align:        { key: 'qr_code_align', label: 'Fiscal QR Position', labelAr: 'موضع رمز QR', category: 'qr', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_qr_code', options: ALIGN_OPTS },

  // ── Signatures ──
  show_cashier_signature: { key: 'show_cashier_signature', label: 'Cashier Signature', labelAr: 'توقيع الكاشير', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.cashier' },
  show_client_signature:  { key: 'show_client_signature', label: 'Client Signature', labelAr: 'توقيع العميل', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.client' },
  show_stamp:             { key: 'show_stamp', label: 'Show Stamp', labelAr: 'إظهار الختم', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.stamp' },

  // ── Section Visibility ──
  show_header_section:    { key: 'show_header_section', label: 'Header Section', labelAr: 'قسم الرأس', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_doc_info_section:  { key: 'show_doc_info_section', label: 'Document Section', labelAr: 'قسم المستند', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_items_section:     { key: 'show_items_section', label: 'Items Section', labelAr: 'قسم الجدول', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_totals_section:    { key: 'show_totals_section', label: 'Totals Section', labelAr: 'قسم الإجماليات', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_payments_section:  { key: 'show_payments_section', label: 'Payments Section', labelAr: 'قسم الدفع', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_footer_section:    { key: 'show_footer_section', label: 'Footer Section', labelAr: 'قسم التذييل', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Label / Sticker (STK) ──
  show_label_barcode:      { key: 'show_label_barcode', label: 'Show Barcode on Label', labelAr: 'إظهار الباركود في الملصق', category: 'label', component: 'toggle', defaultValue: true, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.barcode' },
  label_barcode_height:    { key: 'label_barcode_height', label: 'Barcode Height', labelAr: 'ارتفاع الباركود', category: 'label', component: 'slider', defaultValue: 50, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_barcode', min: 20, max: 120, step: 5 },
  label_barcode_bar_width: { key: 'label_barcode_bar_width', label: 'Barcode Bar Width', labelAr: 'عرض شريط الباركود', category: 'label', component: 'slider', defaultValue: 1.0, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_barcode', min: 0.5, max: 3.0, step: 0.25 },
  show_label_product_name: { key: 'show_label_product_name', label: 'Show Product Name', labelAr: 'إظهار اسم المنتج', category: 'label', component: 'toggle', defaultValue: true, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.name' },
  label_product_name_size: { key: 'label_product_name_size', label: 'Product Name Font Size', labelAr: 'حجم خط اسم المنتج', category: 'label', component: 'slider', defaultValue: 14, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_product_name', min: 8, max: 28, step: 1 },
  label_product_name_bold: { key: 'label_product_name_bold', label: 'Bold Product Name', labelAr: 'تسميك اسم المنتج', category: 'label', component: 'toggle', defaultValue: true, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_product_name' },
  label_product_name_color:{ key: 'label_product_name_color', label: 'Product Name Color', labelAr: 'لون اسم المنتج', category: 'label', component: 'color', defaultValue: '#111111', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_product_name' },
  show_label_price:        { key: 'show_label_price', label: 'Show Price', labelAr: 'إظهار السعر', category: 'label', component: 'toggle', defaultValue: true, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.unitPriceTtc' },
  label_price_text:        { key: 'label_price_text', label: 'Price Label Text', labelAr: 'نص تسمية السعر', category: 'label', component: 'input', defaultValue: 'DA', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price' },
  label_price_size:        { key: 'label_price_size', label: 'Price Font Size', labelAr: 'حجم خط السعر', category: 'label', component: 'slider', defaultValue: 22, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price', min: 12, max: 48, step: 1 },
  label_price_bold:        { key: 'label_price_bold', label: 'Bold Price', labelAr: 'تسميك السعر', category: 'label', component: 'toggle', defaultValue: true, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price' },
  label_price_color:       { key: 'label_price_color', label: 'Price Color', labelAr: 'لون السعر', category: 'label', component: 'color', defaultValue: '#c0392b', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price' },
  label_price_prefix:      { key: 'label_price_prefix', label: 'Price Prefix', labelAr: 'بادئة السعر', category: 'label', component: 'input', defaultValue: '', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price' },
  show_label_ref:          { key: 'show_label_ref', label: 'Show Reference', labelAr: 'إظهار المرجع', category: 'label', component: 'toggle', defaultValue: false, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.ref' },
  label_ref_size:          { key: 'label_ref_size', label: 'Reference Font Size', labelAr: 'حجم خط المرجع', category: 'label', component: 'slider', defaultValue: 8, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_ref', min: 6, max: 14, step: 1 },
  label_ref_color:         { key: 'label_ref_color', label: 'Reference Color', labelAr: 'لون المرجع', category: 'label', component: 'color', defaultValue: '#666666', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_ref' },
  label_border_style:      { key: 'label_border_style', label: 'Label Border Style', labelAr: 'نمط الحدود', category: 'label', component: 'pills', defaultValue: 'solid' as BorderStyle, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, options: BORDER_OPTS },
  label_border_width:      { key: 'label_border_width', label: 'Label Border Width', labelAr: 'سُمك الحدود', category: 'label', component: 'slider', defaultValue: 1, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, min: 0, max: 5, step: 0.5 },
  label_border_color:      { key: 'label_border_color', label: 'Label Border Color', labelAr: 'لون الحدود', category: 'label', component: 'color', defaultValue: '#333333', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS },
  label_border_radius:     { key: 'label_border_radius', label: 'Label Border Radius', labelAr: 'تدوير زوايا الملصق', category: 'label', component: 'slider', defaultValue: 4, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, min: 0, max: 20, step: 1 },

  // ── Label / Sticker — extended ──
  show_label_product_image: { key: 'show_label_product_image', label: 'Show Product Image', labelAr: 'إظهار صورة المنتج', category: 'label', component: 'toggle', defaultValue: false, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.imageUrl' },
  label_product_image_size: { key: 'label_product_image_size', label: 'Product Image Size', labelAr: 'حجم صورة المنتج', category: 'label', component: 'slider', defaultValue: 40, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_product_image', min: 20, max: 80, step: 2 },
  show_label_brand:         { key: 'show_label_brand', label: 'Show Brand', labelAr: 'إظهار الماركة', category: 'label', component: 'toggle', defaultValue: false, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, field: 'item.brand' },
  label_brand_size:         { key: 'label_brand_size', label: 'Brand Font Size', labelAr: 'حجم خط الماركة', category: 'label', component: 'slider', defaultValue: 7, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_brand', min: 6, max: 16, step: 1 },
  label_brand_color:        { key: 'label_brand_color', label: 'Brand Color', labelAr: 'لون الماركة', category: 'label', component: 'color', defaultValue: '#888888', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_brand' },
  label_layout:             { key: 'label_layout', label: 'Label Layout', labelAr: 'تخطيط الملصق', category: 'label', component: 'pills', defaultValue: 'stacked', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, options: [{ v: 'stacked', l: 'عمودي' }, { v: 'side-by-side', l: 'جنباً إلى جنب' }] },
  label_hide_currency:      { key: 'label_hide_currency', label: 'Hide Currency Text', labelAr: 'إخفاء نص العملة', category: 'label', component: 'toggle', defaultValue: false, supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_price' },
  label_barcode_format:     { key: 'label_barcode_format', label: 'Barcode Format', labelAr: 'نوع الباركود', category: 'label', component: 'pills', defaultValue: 'code39', supportedPapers: STICKER_LABEL, supportedDocs: STICKER_DOCS, dependsOn: 'show_label_barcode', options: [{ v: 'code39', l: 'Code 39' }, { v: 'ean13', l: 'EAN-13' }, { v: 'code128', l: 'Code 128' }] },

  // ── Section Dimensions (page papers only) ──
  section_header_width:    { key: 'section_header_width', label: 'Header Width %', labelAr: 'عرض الرأس %', category: 'formatting', component: 'slider', defaultValue: 100, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 50, max: 100, step: 5 },
  section_header_align:    { key: 'section_header_align', label: 'Header Align', labelAr: 'محاذاة الرأس', category: 'formatting', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  section_doc_info_width:  { key: 'section_doc_info_width', label: 'Doc Info Width %', labelAr: 'عرض معلومات المستند %', category: 'formatting', component: 'slider', defaultValue: 100, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 50, max: 100, step: 5 },
  section_doc_info_align:  { key: 'section_doc_info_align', label: 'Doc Info Align', labelAr: 'محاذاة معلومات المستند', category: 'formatting', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  section_items_width:     { key: 'section_items_width', label: 'Items Width %', labelAr: 'عرض الجدول %', category: 'formatting', component: 'slider', defaultValue: 100, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 50, max: 100, step: 5 },
  section_items_align:     { key: 'section_items_align', label: 'Items Align', labelAr: 'محاذاة الجدول', category: 'formatting', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  section_totals_width:    { key: 'section_totals_width', label: 'Totals Width %', labelAr: 'عرض الإجماليات %', category: 'formatting', component: 'slider', defaultValue: 60, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 30, max: 100, step: 5 },
  section_totals_align:    { key: 'section_totals_align', label: 'Totals Align', labelAr: 'محاذاة الإجماليات', category: 'formatting', component: 'pills', defaultValue: 'left' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  section_footer_width:    { key: 'section_footer_width', label: 'Footer Width %', labelAr: 'عرض التذييل %', category: 'formatting', component: 'slider', defaultValue: 100, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 50, max: 100, step: 5 },
  section_footer_align:    { key: 'section_footer_align', label: 'Footer Align', labelAr: 'محاذاة التذييل', category: 'formatting', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  section_payments_width:  { key: 'section_payments_width', label: 'Payments Width %', labelAr: 'عرض وسائل الدفع %', category: 'formatting', component: 'slider', defaultValue: 100, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 50, max: 100, step: 5 },
  section_payments_align:  { key: 'section_payments_align', label: 'Payments Align', labelAr: 'محاذاة وسائل الدفع', category: 'formatting', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  header_columns_gap:      { key: 'header_columns_gap', label: 'Header Columns Gap', labelAr: 'الفجوة بين أعمدة الرأس', category: 'formatting', component: 'slider', defaultValue: 30, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 0, max: 60, step: 5 },
  client_card_width:       { key: 'client_card_width', label: 'Client Card Width %', labelAr: 'عرض بطاقة العميل %', category: 'formatting', component: 'slider', defaultValue: 50, supportedPapers: PAGE, supportedDocs: ALL_DOCS, min: 30, max: 100, step: 5 },

  // ── Rules ──
  rules:                  { key: 'rules', label: 'Rules', labelAr: 'القواعد', category: 'rules', component: 'rules-editor', defaultValue: [] as any[], supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Report ──
  show_report_header:        { key: 'show_report_header', label: 'Show Report Header', labelAr: 'إظهار رأس التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_header_text:        { key: 'report_header_text', label: 'Report Header Text', labelAr: 'نص رأس التقرير', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_report_header' },
  show_report_footer:        { key: 'show_report_footer', label: 'Show Report Footer', labelAr: 'إظهار تذييل التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_footer_text:        { key: 'report_footer_text', label: 'Report Footer Text', labelAr: 'نص تذييل التقرير', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_report_footer' },
  show_charts:               { key: 'show_charts', label: 'Show Charts', labelAr: 'إظهار الرسوم البيانية', category: 'charts', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  chart_type:                { key: 'chart_type', label: 'Chart Type', labelAr: 'نوع الرسم البياني', category: 'charts', component: 'pills', defaultValue: 'bar', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_charts', options: [{ v: 'bar', l: 'أعمدة' }, { v: 'pie', l: 'دائري' }] },
  chart_title:               { key: 'chart_title', label: 'Chart Title', labelAr: 'عنوان الرسم البياني', category: 'charts', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_charts' },
  group_by:                  { key: 'group_by', label: 'Group By', labelAr: 'تجميع حسب', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  sort_by:                   { key: 'sort_by', label: 'Sort By', labelAr: 'ترتيب حسب', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  sort_direction:            { key: 'sort_direction', label: 'Sort Direction', labelAr: 'اتجاه الترتيب', category: 'report', component: 'pills', defaultValue: 'asc', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, options: [{ v: 'asc', l: 'تصاعدي' }, { v: 'desc', l: 'تنازلي' }] },
  show_report_period:        { key: 'show_report_period', label: 'Show Report Period', labelAr: 'إظهار فترة التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.periodStart' },
  show_report_cashier:       { key: 'show_report_cashier', label: 'Show Cashier in Report', labelAr: 'إظهار الكاشير في التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.cashier' },
  show_report_summary_cards: { key: 'show_report_summary_cards', label: 'Show Summary Cards', labelAr: 'إظهار بطاقات الملخص', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.grossSales' },
  show_report_payment_breakdown: { key: 'show_report_payment_breakdown', label: 'Show Payment Breakdown', labelAr: 'إظهار توزيع الدفع', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'payment.method' },
  show_report_top_products:  { key: 'show_report_top_products', label: 'Show Top Products', labelAr: 'إظهار أفضل المنتجات', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'item.name' },
  report_col_widths:         { key: 'report_col_widths', label: 'Report Column Widths', labelAr: 'عرض أعمدة التقرير', category: 'report', component: 'input', defaultValue: {} as any, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_col_headers:        { key: 'report_col_headers', label: 'Report Column Headers', labelAr: 'عناوين أعمدة التقرير', category: 'report', component: 'input', defaultValue: {} as any, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
};

export function getSettingMeta(key: string): SettingMeta | undefined {
  return SETTINGS_REGISTRY[key];
}

export function getSettingsByCategory(category: SettingMeta['category']): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.category === category);
}

export function getSettingsForPaper(paperSize: PaperSize): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.supportedPapers.includes(paperSize));
}

export function getSettingsForDoc(docType: DocTypeCode): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.supportedDocs.includes(docType));
}

export function getVisibleSettings(docType: DocTypeCode, paperSize: PaperSize): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s =>
    s.supportedDocs.includes(docType) &&
    s.supportedPapers.includes(paperSize)
  );
}

// ─── Column-level metadata defaults (single source of truth) ────────────────
export interface ColumnDefault {
  header: string;
  width: number;
  align: AlignOption;
}

export const COLUMN_DEFAULTS: Record<ColumnKey, ColumnDefault> = {
  rowNumber: { header: '#',       width: 8,  align: 'center' },
  barcode:   { header: 'باركود',   width: 14, align: 'right'  },
  ref:       { header: 'مرجع',     width: 12, align: 'right'  },
  name:      { header: 'البيان',    width: 30, align: 'right'  },
  unit:      { header: 'وحدة',     width: 10, align: 'center' },
  quantity:  { header: 'الكمية',   width: 12, align: 'center' },
  price:     { header: 'السعر',    width: 14, align: 'right'  },
  discount:  { header: 'خصم',      width: 12, align: 'center' },
  tva:       { header: 'TVA',      width: 10, align: 'center' },
  total:     { header: 'المجموع',   width: 16, align: 'right'  },
};

export function isSettingVisible(key: string, docType: DocTypeCode, paperSize: PaperSize, tpl?: Partial<PrintTemplate>): boolean {
  const meta = SETTINGS_REGISTRY[key];
  if (!meta) return true;
  if (!meta.supportedDocs.includes(docType)) return false;
  if (!meta.supportedPapers.includes(paperSize)) return false;

  // Walk the dependsOn chain — a setting is only visible when ALL ancestors are satisfied
  let currentKey: string | undefined = key;
  while (currentKey && tpl) {
    const currentMeta: SettingMeta | undefined = SETTINGS_REGISTRY[currentKey];
    if (!currentMeta?.dependsOn) break;

    const parentVal = (tpl as any)[currentMeta.dependsOn];
    if (currentMeta.dependsOnValue !== undefined) {
      if (parentVal !== currentMeta.dependsOnValue) return false;
    } else {
      const parentMeta = SETTINGS_REGISTRY[currentMeta.dependsOn];
      if (parentMeta?.component === 'toggle' && !parentVal) return false;
    }
    currentKey = currentMeta.dependsOn;
  }

  return true;
}
