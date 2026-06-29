import type { PrintTemplate, PaperSize, DocTypeCode, CompanyData } from '../types';
import type { UniversalDocumentData } from '../types/data';
import type { LibraryTemplateEntry, LibraryTemplateMeta } from './types';
import {
  TEMPLATE_AUTHOR, LAYOUT_ENGINE_VERSION, TEMPLATE_COUNTRY_DZ,
} from './constants';
import {
  INVOICE_COLUMNS, INVOICE_TOTALS, INVOICE_FOOTER,
  DELIVERY_COLUMNS, DELIVERY_TOTALS, DELIVERY_FOOTER,
  DELIVERY_A5_COLUMNS, DELIVERY_A5_TOTALS, DELIVERY_A5_FOOTER,
} from './config';
import { headerConfig, paperConfig, typographyConfig } from './config';
import { categoryFromDocType } from './categories';

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
      tpl.override_ice = companyOverride.ice || '';
      tpl.override_article = companyOverride.article || '';
    }
    return { tpl, data: this.getMockData() };
  }

  private mockData: UniversalDocumentData | null = null;

  private getMockData(): UniversalDocumentData {
    if (this.mockData) return this.mockData;
    const { getMockDocumentData } = require('./mockData');
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
    show_ice: header.showIce,
    show_article: header.showArticle,
    company_info_align: header.companyInfoAlign,
    company_info_size: header.companyInfoSize,

    override_address: '',
    override_phone: '',
    override_nif: '',
    override_rc: '',
    override_nis: '',
    override_ice: '',
    override_article: '',
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
    show_client: true,
    show_client_nif: true,
    show_client_phone: true,
    show_client_address: true,
    show_delivery_address: !isInvoice,
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
    createConfig: () => buildTemplate('قالب الفاتورة الجزائري A4', 'FV', 'A4'),
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
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A4', 'BL', 'A4'),
  });

  templateRegistry.register({
    meta: createMeta({
      id: 'dz-delivery-a5',
      name: 'Algerian Delivery Note A5',
      nameAr: 'وصل التسليم الجزائري A5',
      description: 'Compact Algerian delivery note in A5 half-page format with items table, TVA and signature block.',
      descriptionAr: 'وصل تسليم جزائري بصيغة A5 بنصف صفحة مع جدول المواد و TVA والتوقيع',
      documentType: 'BL',
      paperSize: 'A5',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'delivery', 'a5'],
    }),
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A5', 'BL', 'A5'),
  });
}

// ─── Eagerly register on module load (runs once per page load) ─────────────────
registerBuiltinTemplates();
