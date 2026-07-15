import type { PrintTemplate, PaperSize, DocTypeCode, CompanyData, FontFamily } from '../types';
import type { UniversalDocumentData } from '../types/data';
import type { LibraryTemplateEntry, LibraryTemplateMeta } from './types';
import {
  TEMPLATE_AUTHOR, LAYOUT_ENGINE_VERSION, TEMPLATE_COUNTRY_DZ,
} from './constants';
import type { HeaderLayout, SectionMeta, TotalsGridConfig } from '../types';
import {
  INVOICE_COLUMNS, INVOICE_TOTALS, INVOICE_FOOTER,
  DELIVERY_COLUMNS, DELIVERY_TOTALS, DELIVERY_FOOTER,
  DELIVERY_A5_COLUMNS, DELIVERY_A5_TOTALS, DELIVERY_A5_FOOTER,
} from './config';
import { headerConfig, paperConfig, typographyConfig } from './config';
import { categoryFromDocType } from './categories';
import { getMockDocumentData } from './mockData';

// ─── TemplateRegistry — single source of truth for built-in templates ─────────

class TemplateRegistryClass {
  private entries = new Map<string, LibraryTemplateEntry>();

  register(entry: LibraryTemplateEntry): void {
    if (this.entries.has(entry.meta.id)) {
      console.warn(`[TemplateRegistry] Overwriting template: ${entry.meta.id}`);
    }
    this.entries.set(entry.meta.id, entry);
  }

  get(id: string): LibraryTemplateEntry | undefined {
    return this.entries.get(id);
  }

  getAll(): LibraryTemplateEntry[] {
    return Array.from(this.entries.values());
  }

  getByDocType(docType: DocTypeCode): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.documentType === docType);
  }

  getByPaperSize(size: PaperSize): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.paperSize === size);
  }

  getByCategory(category: string): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.category === category);
  }

  getByTag(tag: string): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.tags.includes(tag));
  }

  search(query: string): LibraryTemplateEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(e =>
      e.meta.name.toLowerCase().includes(q) ||
      e.meta.nameAr.includes(q) ||
      e.meta.description.toLowerCase().includes(q) ||
      e.meta.descriptionAr.includes(q) ||
      e.meta.category.includes(q) ||
      e.meta.tags.some(t => t.includes(q)) ||
      e.meta.documentType.toLowerCase().includes(q)
    );
  }

  getCategories(): string[] {
    return [...new Set(this.getAll().map(e => e.meta.category))];
  }

  getTags(): string[] {
    return [...new Set(this.getAll().flatMap(e => e.meta.tags))];
  }

  getPaperSizes(): PaperSize[] {
    return [...new Set(this.getAll().map(e => e.meta.paperSize))];
  }

  getDocTypes(): DocTypeCode[] {
    return [...new Set(this.getAll().map(e => e.meta.documentType))];
  }

  buildPreview(templateId: string, companyOverride?: CompanyData | null): { tpl: PrintTemplate; data: UniversalDocumentData } | null {
    const entry = this.get(templateId);
    if (!entry) return null;
    const tpl = { ...entry.createConfig(), id: -1, is_default: false, is_active: true };
    if (companyOverride) {
      tpl.override_address = companyOverride.address || '';
      tpl.override_phone = companyOverride.phone || '';
      tpl.override_nif = companyOverride.nif || '';
      tpl.override_rc = companyOverride.rc || '';
      tpl.override_nis = companyOverride.nis || '';
      tpl.override_article = companyOverride.article || '';
      tpl.override_capital = companyOverride.capital || '';
      tpl.override_mobile = companyOverride.mobile || '';
      tpl.override_commercial_name = companyOverride.commercialName || '';
      tpl.override_email = companyOverride.email || '';
      tpl.override_fax = companyOverride.fax || '';
      tpl.override_bank_name = companyOverride.bankName || '';
      tpl.override_rib = companyOverride.rib || '';
      tpl.override_activity = companyOverride.activity || '';
    }
    return { tpl, data: this.getMockData() };
  }

  private mockData: UniversalDocumentData | null = null;

  private getMockData(): UniversalDocumentData {
    if (this.mockData) return this.mockData;
    this.mockData = getMockDocumentData();
    return this.mockData!;
  }
}

export const templateRegistry = new TemplateRegistryClass();

// ─── Helper to build a LibraryTemplateMeta from factory configs ────────────────

export function createMeta(overrides: {
  id: string; name: string; nameAr: string;
  description: string; descriptionAr: string;
  documentType: DocTypeCode; paperSize: PaperSize;
  version?: string; tags?: string[]; subcategory?: string;
  revision?: number;
}): LibraryTemplateMeta {
  return {
    id: overrides.id,
    version: overrides.version ?? '1.0.0',
    revision: overrides.revision ?? 1,
    createdAt: '2025-06-28',
    updatedAt: '2025-06-28',
    author: TEMPLATE_AUTHOR,
    country: TEMPLATE_COUNTRY_DZ,
    layoutEngineVersion: LAYOUT_ENGINE_VERSION,
    name: overrides.name,
    nameAr: overrides.nameAr,
    description: overrides.description,
    descriptionAr: overrides.descriptionAr,
    documentType: overrides.documentType,
    paperSize: overrides.paperSize,
    category: categoryFromDocType(overrides.documentType),
    subcategory: overrides.subcategory,
    tags: overrides.tags ?? [],
    readOnly: true as const,
  };
}

// ─── Factory function for building PrintTemplate from layer configs ────────────

export function buildTemplate(
  name: string,
  docTypeCode: DocTypeCode,
  paperSize: PaperSize,
  overrides?: Partial<PrintTemplate>,
): PrintTemplate {
  const paper = paperConfig(paperSize);
  const typo = typographyConfig(paperSize);
  const header = headerConfig(paperSize);

  const isInvoice = docTypeCode === 'FV';
  const isA5 = paperSize === 'A5';

  const table = isInvoice
    ? INVOICE_COLUMNS
    : isA5
      ? DELIVERY_A5_COLUMNS
      : DELIVERY_COLUMNS;

  const totals = isInvoice
    ? INVOICE_TOTALS
    : isA5
      ? DELIVERY_A5_TOTALS
      : DELIVERY_TOTALS;

  const footer = isInvoice
    ? INVOICE_FOOTER
    : isA5
      ? DELIVERY_A5_FOOTER
      : DELIVERY_FOOTER;

  const base: PrintTemplate = {
    id: null,
    name,
    doc_type_code: docTypeCode,
    paper_size: paperSize,
    paper_width_mm: paper.paperWidthMm,
    page_orientation: paper.pageOrientation,
    is_default: false,
    is_active: true,

    margin_top: paper.marginTop,
    margin_bottom: paper.marginBottom,
    margin_sides: paper.marginSides,
    line_spacing: 1.2,
    base_font_size: typo.baseFontSize,
    font_family: typo.fontFamily,

    show_logo: header.showLogo,
    logo_size: header.logoSize,
    logo_align: header.logoAlign,
    logo_border_radius: header.logoBorderRadius,

    show_company_name: header.showCompanyName,
    company_name_text: '',
    company_name_size: header.companyNameSize,
    company_name_bold: header.companyNameBold,
    company_name_align: header.companyNameAlign,
    company_name_color: header.companyNameColor,

    show_address: header.showAddress,
    show_phone: header.showPhone,
    show_tax_id: header.showTaxId,
    show_rc: header.showRc,
    show_nis: header.showNis,
    show_article: header.showArticle,
    show_capital: false,
    show_mobile: false,
    show_commercial_name: false,
    show_email: false,
    show_fax: false,
    show_bank_name: false,
    show_rib: false,
    show_activity: false,
    company_info_align: header.companyInfoAlign,
    company_info_size: header.companyInfoSize,
    company_info_bold: false,
    company_info_italic: false,
    company_info_font_family: 'tajawal' as FontFamily,
    label_address: 'العنوان',
    label_phone: 'الهاتف',
    label_nif: 'NIF',
    label_rc: 'RC',
    label_nis: 'NIS',
    label_article: 'المادة الجبائية',
    label_capital: 'الرأس المال',
    label_mobile: 'المحمول',
    label_commercial_name: 'الاسم التجاري',
    label_email: 'البريد الإلكتروني',
    label_fax: 'الفاكس',
    label_bank_name: 'اسم البنك',
    label_rib: 'RIB',
    label_activity: 'النشاط',

    override_address: '',
    override_phone: '',
    override_nif: '',
    override_rc: '',
    override_nis: '',
    override_article: '',
    override_capital: '',
    override_mobile: '',
    override_commercial_name: '',
    override_email: '',
    override_fax: '',
    override_bank_name: '',
    override_rib: '',
    override_activity: '',
    header_custom_text: '',
    header_separator: header.headerSeparator,

    title_text: isInvoice ? 'فاتورة بيع' : 'وصل تسليم',
    title_size: typo.titleSize,
    title_bold: typo.titleBold,
    title_align: typo.titleAlign,
    title_color: header.companyNameColor,
    show_doc_number: true,
    show_date: true,
    show_time: false,
    show_due_date: isInvoice,
    show_cashier: isInvoice,
    show_client: false,
    show_client_nif: false,
    show_client_phone: false,
    show_client_address: false,
    show_delivery_address: false,
    show_customer_commercial_name: false,
    show_customer_rc: false,
    show_customer_nis: false,
    show_customer_ai: false,
    show_customer_mobile: false,
    show_customer_fax: false,
    show_customer_email: false,
    show_customer_activity: false,
    show_customer_bank_name: false,
    show_customer_rib: false,
    label_client: 'العميل',
    label_client_nif: 'NIF العميل',
    label_client_phone: 'هاتف العميل',
    label_client_address: 'العنوان',
    label_delivery_address: 'عنوان التسليم',
    label_customer_commercial_name: 'الاسم التجاري',
    label_customer_rc: 'RC',
    label_customer_nis: 'NIS',
    label_customer_ai: 'المادة الجبائية',
    label_customer_mobile: 'المحمول',
    label_customer_fax: 'الفاكس',
    label_customer_email: 'البريد الإلكتروني',
    label_customer_activity: 'النشاط',
    label_customer_bank_name: 'اسم البنك',
    label_customer_rib: 'RIB',
    override_client_name: '',
    override_client_nif: '',
    override_client_phone: '',
    override_client_address: '',
    override_delivery_address: '',
    override_customer_commercial_name: '',
    override_customer_rc: '',
    override_customer_nis: '',
    override_customer_ai: '',
    override_customer_mobile: '',
    override_customer_fax: '',
    override_customer_email: '',
    override_customer_activity: '',
    override_customer_bank_name: '',
    override_customer_rib: '',
    customer_info_font_family: 'tajawal' as FontFamily,
    customer_info_size: 9,
    customer_info_bold: false,
    customer_info_italic: false,
    customer_info_align: 'right' as any,
    show_session: false,
    show_payment_term: false,
    show_bank_details: isInvoice,
    bank_details_text: isInvoice ? 'RIB: 007 99999 000012345678 90' : '',
    doc_separator: 'solid',

    col_order: table.columnOrder,
    col_show: table.columnShow,
    col_widths: table.columnWidths,
    col_headers: table.columnHeaders,
    col_aligns: table.columnAligns,

    items_font_size: table.itemsFontSize,
    items_font_family: table.itemsFontFamily,
    show_col_header: table.showColHeader,
    table_header_bold: table.tableHeaderBold,
    table_header_bg: table.tableHeaderBg,
    table_header_color: table.tableHeaderColor,
    table_cell_padding: 6,
    table_border_style: table.tableBorderStyle,
    alternating_rows: table.alternatingRows,
    alternating_color: table.alternatingColor,
    price_display: table.priceDisplay,
    show_line_total_ttc: false,

    totals_font_size: totals.totalsFontSize,
    totals_bold: totals.totalsBold,
    totals_align: totals.totalsAlign,
    show_total_ht: totals.showTotalHt,
    show_total_tva: totals.showTotalTva,
    show_tva_breakdown: totals.showTvaBreakdown,
    show_discount_total: totals.showDiscountTotal,
    show_fiscal_stamp: totals.showFiscalStamp,
    show_total_ttc: totals.showTotalTtc,
    total_ttc_font_size: totals.totalTtcFontSize,
    total_ttc_bold: totals.totalTtcBold,
    total_ttc_color: totals.totalTtcColor,
    total_border_style: totals.totalBorderStyle,
    show_amount_in_words: totals.showAmountInWords,
    show_paid_amount: totals.showPaidAmount,
    show_change: totals.showChange,
    show_remaining: totals.showRemaining,
    show_prev_balance: totals.showPrevBalance,
    show_new_balance: totals.showNewBalance,

    show_payment_details: false,
    payment_font_size: 9,

    footer_line1: footer.footerLine1,
    footer_line2: footer.footerLine2,
    footer_line3: footer.footerLine3,
    footer_separator: footer.footerSeparator,
    show_thank_you: footer.showThankYou,
    thank_you_text: footer.thankYouText,
    thank_you_size: footer.thankYouSize,
    thank_you_color: '#333333',
    show_returns_policy: footer.showReturnsPolicy,
    returns_policy_text: footer.returnsPolicyText,
    footer_legal_text: '',

    show_barcode: footer.showBarcode,
    barcode_content: 'doc-number',
    barcode_custom_text: '',
    show_qr: footer.showQr,
    qr_content: 'both',

    show_cashier_signature: footer.showCashierSignature,
    show_client_signature: footer.showClientSignature,
    show_stamp: footer.showStamp,

    show_header_section: true,
    show_doc_info_section: true,
    show_items_section: true,
    show_totals_section: true,
    show_payments_section: false,
    show_footer_section: true,

    rules: [],

    show_report_header: false,
    report_header_text: '',
    show_report_footer: false,
    report_footer_text: '',
    show_charts: false,
    chart_type: 'bar',
    chart_title: '',
    group_by: '',
    sort_by: '',
    sort_direction: 'asc',
    show_report_period: false,
    show_report_cashier: false,
    show_report_summary_cards: false,
    show_report_payment_breakdown: false,
    show_report_top_products: false,

    totals_rows: [],
    footer_rows: [],
    header_layout: { mode: 'simple', columns: [] } as HeaderLayout,
    doc_info_rows: [],
    customer_info_rows: [],
    company_info_rows: [],
    col_styles: [],
    page_frame: { enabled: false },
    sections_order: [
      { key: 'header',     visible: true, order: 0 },
      { key: 'doc-info',   visible: true, order: 1 },
      { key: 'items',      visible: true, order: 2 },
      { key: 'totals',     visible: true, order: 3 },
      { key: 'payments',   visible: true, order: 4 },
      { key: 'footer',     visible: true, order: 5 },
    ] as SectionMeta[],
    totals_grid: { enabled: false, columns: [] } as TotalsGridConfig,
    watermark: { enabled: false },
  };

  return overrides ? { ...base, ...overrides } : base;
}

// ─── Register all built-in templates ───────────────────────────────────────────

export function registerBuiltinTemplates(): void {
  templateRegistry.register({
    meta: createMeta({
      id: 'dz-invoice-a4',
      name: 'Algerian Invoice A4',
      nameAr: 'الفاتورة الجزائرية A4',
      description: 'Standard Algerian fiscal invoice in A4 format with full TVA breakdown, fiscal stamp, amount in words, signature and QR code.',
      descriptionAr: 'فاتورة بيع جزائرية رسمية بصيغة A4 مع تفصيل TVA والطابع الجبائي والمبلغ كتابة والتوقيع ورمز QR',
      documentType: 'FV',
      paperSize: 'A4',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'tva', 'qrcode', 'barcode', 'signature', 'invoice', 'a4'],
    }),
    createConfig: () => buildTemplate('قالب الفاتورة الجزائري A4', 'FV', 'A4', {
      show_commercial_name: true,
      show_mobile: true,
      show_fax: true,
      show_email: true,
      show_capital: true,
      show_bank_name: true,
      show_rib: true,
      header_layout: {
        mode: 'columns',
        columns: [
          {
            id: 'col_company_info', order: 0, visible: true,
            width: 34, align: 'start',
            padding: { top: 0, end: 6, bottom: 0, start: 10 },
            rows: [
              { id: 'r1', field: 'company.phone',           label: 'هاتف',         visible: true, order: 0,  labelSide: 'start', valueSide: 'end' },
              { id: 'r2', field: 'company.mobile',          label: 'محمول',        visible: true, order: 1,  labelSide: 'start', valueSide: 'end' },
              { id: 'r3', field: 'company.fax',             label: 'فاكس',         visible: true, order: 2,  labelSide: 'start', valueSide: 'end' },
              { id: 'r4', field: 'company.email',           label: 'بريد',          visible: true, order: 3,  labelSide: 'start', valueSide: 'end' },
              { id: 'r5', field: 'company.nif',             label: 'NIF',          visible: true, order: 4,  labelSide: 'start', valueSide: 'end' },
              { id: 'r6', field: 'company.rc',              label: 'RC',           visible: true, order: 5,  labelSide: 'start', valueSide: 'end' },
              { id: 'r7', field: 'company.nis',             label: 'NIS',          visible: true, order: 6,  labelSide: 'start', valueSide: 'end' },
              { id: 'r8', field: 'company.article',         label: 'المادة',       visible: true, order: 7,  labelSide: 'start', valueSide: 'end' },
            ],
          },
          {
            id: 'col_company_name', order: 1, visible: true,
            width: 36, align: 'center',
            padding: { top: 0, end: 6, bottom: 0, start: 6 },
            titleField: 'company.name',
            titleStyle: { bold: true, fontSize: 18 },
            rows: [
              { id: 'cname',  field: 'company.commercialName', label: 'الاسم التجاري', visible: true, order: 0, labelSide: 'start', valueSide: 'start', label: '' },
              { id: 'addr',   field: 'company.address',        visible: true, order: 1, labelSide: 'start', valueSide: 'start', label: '' },
              { id: 'capital', field: 'company.capital',       label: 'رأس المال',     visible: true, order: 2, labelSide: 'start', valueSide: 'end' },
            ],
          },
          {
            id: 'col_reference_box', order: 2, visible: true,
            width: 30, align: 'start',
            border: { style: 'solid', width: 1, color: '#333333', radius: 4 },
            padding: { top: 8, end: 10, bottom: 8, start: 10 },
            rows: [
              { id: 'num',  field: 'document.number', label: 'رقم الفاتورة', visible: true, order: 0, labelSide: 'start', valueSide: 'end' },
              { id: 'date', field: 'document.date',   label: 'التاريخ',      visible: true, order: 1, labelSide: 'start', valueSide: 'end' },
              { id: 'ttc',  field: 'totals.ttc',      label: 'المبلغ',       visible: true, order: 2, labelSide: 'start', valueSide: 'end', bold: true },
            ],
          },
        ],
      },
      totals_grid: {
        enabled: true,
        headerBg: '#f5f5f5',
        headerColor: '#111111',
        borderColor: '#333333',
        columns: [
          { id: 'c1', field: 'grid.baseExcl',      label: 'المبلغ خارج الرسم', order: 0, visible: true, align: 'center' },
          { id: 'c2', field: 'grid.discountPct',    label: 'التخفيض',          order: 1, visible: true, align: 'center' },
          { id: 'c3', field: 'grid.discountAmount', label: 'مبلغ التخفيض',      order: 2, visible: true, align: 'center' },
          { id: 'c4', field: 'grid.tvaRate',        label: 'TVA',              order: 3, visible: true, align: 'center' },
          { id: 'c5', field: 'grid.tvaAmount',      label: 'مبلغ TVA',         order: 4, visible: true, align: 'center' },
        ],
        summaryRows: [
          { id: 'total_ht', field: 'totals.ht',       label: 'المجموع بدون رسوم', visible: true, order: 0, labelSide: 'start', valueSide: 'end' },
          { id: 'discount', field: 'totals.discount',  label: 'مجموع التخفيض',     visible: true, order: 1, labelSide: 'start', valueSide: 'end' },
          { id: 'tva',      field: 'totals.tva',       label: 'مجموع الضريبة',     visible: true, order: 2, labelSide: 'start', valueSide: 'end' },
          { id: 'ttc',      field: 'totals.ttc',       label: 'الصافي للدفع',      visible: true, order: 3, labelSide: 'start', valueSide: 'end', bold: true,
            border: { style: 'double', width: 3, color: '#111', sides: { top: true } } },
        ],
      } as TotalsGridConfig,
    }),
  });

  templateRegistry.register({
    meta: createMeta({
      id: 'dz-delivery-a4',
      name: 'Algerian Delivery Note A4',
      nameAr: 'وصل التسليم الجزائري A4',
      description: 'Standard Algerian delivery note in A4 format with detailed items table, TVA breakdown and signature block.',
      descriptionAr: 'وصل تسليم جزائري رسمي بصيغة A4 مع جدول المواد وتفصيل TVA والتوقيع',
      documentType: 'BL',
      paperSize: 'A4',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'tva', 'qrcode', 'barcode', 'signature', 'delivery', 'a4'],
    }),
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A4', 'BL', 'A4', {
      show_commercial_name: true,
      show_mobile: true,
      show_fax: true,
      show_email: true,
      show_capital: true,
      show_bank_name: true,
      show_rib: true,
      show_activity: true,
    }),
  });

  templateRegistry.register({
    meta: createMeta({
      id: 'dz-delivery-a5',
      name: 'Algerian Delivery Note A5',
      nameAr: 'وصل التسليم الجزائري A5',
      description: 'Compact Algerian delivery note in A5 format with brand header, company contact box, client card, 8-column items table, stamp area, totals card and barcode.',
      descriptionAr: 'وصل تسليم جزائري بصيغة A5 مع رأس الشركة ومعلومات الاتصال وبطاقة العميل وجدول المواد ب8 أعمدة ومساحة الختم وجدول المجاميع والباركود',
      documentType: 'BL',
      paperSize: 'A5',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'delivery', 'a5', 'stamp', 'brand'],
    }),
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A5', 'BL', 'A5', {
      show_commercial_name: false,
      show_mobile: false,
      show_fax: false,
      show_email: false,
      show_capital: false,
      show_bank_name: false,
      show_rib: false,
      show_activity: true,
      show_client: true,
      show_client_phone: true,
      show_client_address: false,
      show_total_ht: false,
      show_total_tva: false,
      show_discount_total: false,
      show_fiscal_stamp: false,
      show_paid_amount: true,
      show_prev_balance: true,
      show_new_balance: true,
      show_stamp: true,
      show_barcode: true,
      show_thank_you: false,
      show_returns_policy: false,
      show_cashier_signature: false,
      show_client_signature: false,
      show_payment_details: false,
      footer_legal_text: 'عزيزي الزبون تأكد من سلعتك قبل التسليم.',
      doc_separator: 'solid',
      title_text: 'وصل تسليم',
      table_header_bg: '#0a0a0a',
      table_header_color: '#ffffff',
      table_header_bold: true,
      alternating_rows: true,
      col_order: ['rowNumber', 'name', 'quantity', 'unit', 'total'],
      col_show: { rowNumber: true, name: true, quantity: true, unit: true, total: true },
      col_headers: { rowNumber: 'رقم', name: 'التعيين', quantity: 'الكمية', unit: 'الوحدة', total: 'المبلغ' },
      col_widths: { rowNumber: 6, name: 28, quantity: 12, unit: 16, total: 18 },
      col_aligns: { rowNumber: 'center', name: 'right', quantity: 'center', unit: 'center', total: 'right' },
      totals_grid: { enabled: false, columns: [] } as any,
    }),
  });
}

// ─── Eagerly register on module load (runs once per page load) ─────────────────
registerBuiltinTemplates();
