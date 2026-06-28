import type { PrintTemplate, AlignOption } from '../../../../reporting/core/domain/PrintTemplate';
import type { DesignerElement } from './useDesignerStore';

export const DESIGNER_ELEMENT_TYPES = {
  SECTION: 'section',
  LOGO: 'logo',
  COMPANY_NAME: 'company-name',
  COMPANY_INFO: 'company-info',
  DOC_TITLE: 'doc-title',
  DOC_INFO_ROW: 'doc-info-row',
  ITEMS_TABLE: 'items-table',
  TOTALS_AREA: 'totals-area',
  PAYMENTS: 'payments',
  BARCODE: 'barcode',
  QR_CODE: 'qr-code',
  FOOTER_TEXT: 'footer-text',
  THANK_YOU: 'thank-you',
  SEPARATOR: 'separator',
  HEADER_CUSTOM_TEXT: 'header-custom-text',
  BANK_DETAILS: 'bank-details',
  LEGAL_TEXT: 'legal-text',
  SIGNATURE: 'signature',
} as const;

export const SECTION_TYPES = [
  'header',
  'doc-info',
  'items',
  'totals',
  'payments',
  'footer',
] as const;

export type SectionType = typeof SECTION_TYPES[number];

const SECTION_LABELS: Record<SectionType, string> = {
  'header': '╪▒╪ث╪│ ╪د┘┘à╪│╪ز┘╪»',
  'doc-info': '┘à╪╣┘┘ê┘à╪د╪ز ╪د┘┘à╪│╪ز┘╪»',
  'items': '╪ش╪»┘ê┘ ╪د┘╪ث╪╡┘╪د┘',
  'totals': '╪د┘╪ح╪ش┘à╪د┘┘è╪د╪ز',
  'payments': '╪د┘┘à╪»┘┘ê╪╣╪د╪ز',
  'footer': '╪ز╪░┘è┘è┘ ╪د┘┘à╪│╪ز┘╪»',
};

const DEFAULT_SECTION_SIZE: Record<SectionType, { width: number; height: number }> = {
  'header':       { width: 750, height: 160 },
  'doc-info':     { width: 750, height: 140 },
  'items':        { width: 750, height: 250 },
  'totals':       { width: 750, height: 120 },
  'payments':     { width: 750, height: 80 },
  'footer':       { width: 750, height: 150 },
};

let _idCounter = 0;
function nextId(): string {
  _idCounter++;
  return `el-${_idCounter}-${Date.now().toString(36)}`;
}

function mmToPx(mm: number, dpi = 96): number {
  return Math.round((mm * dpi) / 25.4);
}

function alignToFlex(align: AlignOption | string): string {
  if (align === 'center') return 'center';
  if (align === 'left') return 'flex-start';
  return 'flex-end';
}

interface SectionElements {
  el: DesignerElement;
  children: DesignerElement[];
}

function buildHeaderSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  let y = 4;

  if (tpl.show_logo) {
    const logoAlign = tpl.logo_align || 'center';
    const logoW = tpl.logo_size || 56;
    const logoStyleWidth = `${logoW}px`;
    const xOffset = alignToFlex(logoAlign) === 'center'
      ? (750 - logoW) / 2
      : alignToFlex(logoAlign) === 'flex-end' ? 750 - logoW - 8 : 8;
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.LOGO,
      label: '╪د┘╪┤╪╣╪د╪▒', sectionType: 'header',
      x: Math.round(xOffset), y, width: logoW, height: logoW,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { width: logoStyleWidth, height: `${logoW}px`, objectFit: 'contain', alignSelf: logoAlign },
      data: { logo_size: tpl.logo_size, logo_align: tpl.logo_align, logo_border_radius: tpl.logo_border_radius, show_logo: true },
    });
    y += logoW + 6;
  }

  if (tpl.show_company_name) {
    const fontSize = tpl.company_name_size || 15;
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.COMPANY_NAME,
      label: '╪د╪│┘à ╪د┘╪┤╪▒┘â╪ر', sectionType: 'header',
      x: 8, y, width: 734, height: fontSize + 8,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: `${fontSize}px`, fontWeight: tpl.company_name_bold ? 'bold' : 'normal', textAlign: tpl.company_name_align, color: tpl.company_name_color || '#111' },
      data: {
        company_name_text: tpl.company_name_text, company_name_size: tpl.company_name_size,
        company_name_bold: tpl.company_name_bold, company_name_align: tpl.company_name_align,
        company_name_color: tpl.company_name_color, show_company_name: true,
      },
    });
    y += (tpl.company_name_size || 15) + 10;
  }

  const infoItems: string[] = [];
  if (tpl.show_address) infoItems.push('╪د┘╪╣┘┘ê╪د┘');
  if (tpl.show_phone) infoItems.push('╪د┘┘ç╪د╪ز┘');
  if (tpl.show_tax_id) infoItems.push('╪▒┘é┘à ╪د┘╪ش╪ذ╪د┘è╪ر');
  if (tpl.show_rc) infoItems.push('╪▒.╪│.╪ز');
  if (tpl.show_nis) infoItems.push('┘.╪ح.╪╢');
  if (tpl.show_ice) infoItems.push('I.C.E');
  if (tpl.show_article) infoItems.push('╪د┘┘à╪د╪»╪ر');

  if (infoItems.length > 0 || tpl.override_address || tpl.override_phone || tpl.override_nif) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.COMPANY_INFO,
      label: '┘à╪╣┘┘ê┘à╪د╪ز ╪د┘╪┤╪▒┘â╪ر', sectionType: 'header',
      x: 8, y, width: 734, height: Math.max(infoItems.length * 18 + 12, 40),
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: `${tpl.company_info_size || 9}px`, textAlign: tpl.company_info_align || 'center' },
      data: {
        show_address: tpl.show_address, show_phone: tpl.show_phone,
        show_tax_id: tpl.show_tax_id, show_rc: tpl.show_rc,
        show_nis: tpl.show_nis, show_ice: tpl.show_ice,
        show_article: tpl.show_article, company_info_align: tpl.company_info_align,
        company_info_size: tpl.company_info_size, override_address: tpl.override_address,
        override_phone: tpl.override_phone, override_nif: tpl.override_nif,
        override_rc: tpl.override_rc, override_nis: tpl.override_nis,
        override_ice: tpl.override_ice, override_article: tpl.override_article,
      },
    });
    y += Math.max(infoItems.length * 18 + 12, 40) + 4;
  }

  if (tpl.header_custom_text) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.HEADER_CUSTOM_TEXT,
      label: '┘╪╡ ┘à╪«╪╡╪╡', sectionType: 'header',
      x: 8, y, width: 734, height: 30,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: '10px', textAlign: 'center' },
      data: { header_custom_text: tpl.header_custom_text },
    });
  }

  y += 30;
  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.SEPARATOR,
    label: '┘╪د╪╡┘ ╪د┘╪▒╪ث╪│', sectionType: 'header',
    x: 8, y, width: 734, height: 2,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: {},
    data: { header_separator: tpl.header_separator },
  });

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS.header, sectionType: 'header',
      x: 0, y: 0, width: 750, height: y + 10,
      rotation: 0, locked: false, visible: tpl.show_header_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_header_section: true },
    },
    children,
  };
}

function buildDocInfoSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  let y = 4;

  const rows: { label: string; key: string; visible: boolean }[] = [
    { label: '╪╣┘┘ê╪د┘ ╪د┘┘à╪│╪ز┘╪»', key: 'title_text', visible: true },
    { label: '╪▒┘é┘à ╪د┘┘à╪│╪ز┘╪»', key: 'show_doc_number', visible: tpl.show_doc_number },
    { label: '╪د┘╪ز╪د╪▒┘è╪«', key: 'show_date', visible: tpl.show_date },
    { label: '╪د┘┘ê┘é╪ز', key: 'show_time', visible: tpl.show_time },
    { label: '╪ز╪د╪▒┘è╪« ╪د┘╪د╪│╪ز╪ص┘é╪د┘é', key: 'show_due_date', visible: tpl.show_due_date },
    { label: '╪د┘┘â╪د╪┤┘è╪▒', key: 'show_cashier', visible: tpl.show_cashier },
    { label: '╪د┘╪╣┘à┘è┘', key: 'show_client', visible: tpl.show_client },
    { label: '╪▒┘é┘à ╪ش╪ذ╪د┘è╪ر ╪د┘╪╣┘à┘è┘', key: 'show_client_nif', visible: tpl.show_client_nif },
    { label: '┘ç╪د╪ز┘ ╪د┘╪╣┘à┘è┘', key: 'show_client_phone', visible: tpl.show_client_phone },
    { label: '╪╣┘┘ê╪د┘ ╪د┘╪╣┘à┘è┘', key: 'show_client_address', visible: tpl.show_client_address },
    { label: '╪╣┘┘ê╪د┘ ╪د┘╪ز╪│┘┘è┘à', key: 'show_delivery_address', visible: tpl.show_delivery_address },
    { label: '╪د┘╪ش┘╪│╪ر', key: 'show_session', visible: tpl.show_session },
    { label: '╪┤╪▒┘ê╪╖ ╪د┘╪»┘╪╣', key: 'show_payment_term', visible: tpl.show_payment_term },
  ];

  const titleSize = tpl.title_size || 13;
  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.DOC_TITLE,
    label: '╪╣┘┘ê╪د┘ ╪د┘┘à╪│╪ز┘╪»', sectionType: 'doc-info',
    x: 8, y, width: 734, height: titleSize + 8,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: { fontSize: `${titleSize}px`, fontWeight: tpl.title_bold ? 'bold' : 'normal', textAlign: tpl.title_align || 'center', color: tpl.title_color || '#111' },
    data: {
      title_text: tpl.title_text, title_size: tpl.title_size,
      title_bold: tpl.title_bold, title_align: tpl.title_align,
      title_color: tpl.title_color,
    },
  });
  y += titleSize + 12;

  const visibleRows = rows.filter(r => r.visible);
  const rowH = Math.max(visibleRows.length * 20, 20);
  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.DOC_INFO_ROW,
    label: '┘à╪╣┘┘ê┘à╪د╪ز ╪د┘┘à╪│╪ز┘╪»', sectionType: 'doc-info',
    x: 8, y, width: 734, height: rowH,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: { fontSize: '10px' },
    data: Object.fromEntries(rows.map(r => [r.key, r.visible])),
  });
  y += rowH + 6;

  if (tpl.show_bank_details) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.BANK_DETAILS,
      label: '┘à╪╣┘┘ê┘à╪د╪ز ╪ذ┘┘â┘è╪ر', sectionType: 'doc-info',
      x: 8, y, width: 734, height: 30,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: '9px' },
      data: { show_bank_details: true, bank_details_text: tpl.bank_details_text },
    });
    y += 36;
  }

  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.SEPARATOR,
    label: '┘╪د╪╡┘ ╪د┘┘à╪│╪ز┘╪»', sectionType: 'doc-info',
    x: 8, y, width: 734, height: 2,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: {},
    data: { doc_separator: tpl.doc_separator },
  });

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS['doc-info'], sectionType: 'doc-info',
      x: 0, y: 0, width: 750, height: y + 10,
      rotation: 0, locked: false, visible: tpl.show_doc_info_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_doc_info_section: true },
    },
    children,
  };
}

function buildItemsSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  const fontSize = tpl.items_font_size || 10;
  const headerH = 28;
  const rowH = Math.max(fontSize + 16, 24);
  const visibleRows = 5;
  const tableH = (tpl.show_col_header ? headerH : 0) + rowH * visibleRows;

  if (tpl.show_col_header) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.SEPARATOR,
      label: '╪▒╪ث╪│ ╪د┘╪ش╪»┘ê┘', sectionType: 'items',
      x: 8, y: 4, width: 734, height: headerH,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: `${fontSize}px`, fontWeight: tpl.table_header_bold ? 'bold' : 'normal', backgroundColor: tpl.table_header_bg ? tpl.table_header_color || '#e0e0e0' : 'transparent', color: tpl.table_header_color || '#333' },
      data: {
        show_col_header: true, table_header_bold: tpl.table_header_bold,
        table_header_bg: tpl.table_header_bg, table_header_color: tpl.table_header_color,
        col_order: tpl.col_order, col_headers: tpl.col_headers,
        col_widths: tpl.col_widths, col_aligns: tpl.col_aligns,
      },
    });
  }

  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.ITEMS_TABLE,
    label: '╪ش╪»┘ê┘ ╪د┘╪ث╪╡┘╪د┘', sectionType: 'items',
    x: 8, y: (tpl.show_col_header ? headerH + 4 : 4), width: 734, height: tableH,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: { fontSize: `${fontSize}px`, fontFamily: tpl.items_font_family || 'tajawal' },
    data: {
      col_order: tpl.col_order, col_show: tpl.col_show,
      col_widths: tpl.col_widths, col_headers: tpl.col_headers,
      col_aligns: tpl.col_aligns, items_font_size: tpl.items_font_size,
      items_font_family: tpl.items_font_family,
      show_col_header: tpl.show_col_header, table_border_style: tpl.table_border_style,
      alternating_rows: tpl.alternating_rows, alternating_color: tpl.alternating_color,
      price_display: tpl.price_display, show_line_total_ttc: tpl.show_line_total_ttc,
    },
  });

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS.items, sectionType: 'items',
      x: 0, y: 0, width: 750, height: tableH + 12,
      rotation: 0, locked: false, visible: tpl.show_items_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_items_section: true },
    },
    children,
  };
}

function buildTotalsSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  const fontSize = tpl.totals_font_size || 10;

  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.TOTALS_AREA,
    label: '╪د┘╪ح╪ش┘à╪د┘┘è╪د╪ز', sectionType: 'totals',
    x: 8, y: 4, width: 734, height: 100,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: { fontSize: `${fontSize}px`, fontWeight: tpl.totals_bold ? 'bold' : 'normal', textAlign: tpl.totals_align || 'right' },
    data: {
      totals_font_size: tpl.totals_font_size, totals_bold: tpl.totals_bold,
      totals_align: tpl.totals_align, show_total_ht: tpl.show_total_ht,
      show_total_tva: tpl.show_total_tva, show_tva_breakdown: tpl.show_tva_breakdown,
      show_discount_total: tpl.show_discount_total, show_fiscal_stamp: tpl.show_fiscal_stamp,
      show_total_ttc: tpl.show_total_ttc, total_ttc_font_size: tpl.total_ttc_font_size,
      total_ttc_bold: tpl.total_ttc_bold, total_ttc_color: tpl.total_ttc_color,
      total_border_style: tpl.total_border_style, show_amount_in_words: tpl.show_amount_in_words,
      show_paid_amount: tpl.show_paid_amount, show_change: tpl.show_change,
      show_remaining: tpl.show_remaining, show_prev_balance: tpl.show_prev_balance,
      show_new_balance: tpl.show_new_balance,
    },
  });

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS.totals, sectionType: 'totals',
      x: 0, y: 0, width: 750, height: 110,
      rotation: 0, locked: false, visible: tpl.show_totals_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_totals_section: true },
    },
    children,
  };
}

function buildPaymentsSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  const fontSize = tpl.payment_font_size || 9;

  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.PAYMENTS,
    label: '╪د┘┘à╪»┘┘ê╪╣╪د╪ز', sectionType: 'payments',
    x: 8, y: 4, width: 734, height: 50,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: { fontSize: `${fontSize}px` },
    data: { show_payment_details: tpl.show_payment_details, payment_font_size: tpl.payment_font_size },
  });

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS.payments, sectionType: 'payments',
      x: 0, y: 0, width: 750, height: 60,
      rotation: 0, locked: false, visible: tpl.show_payments_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_payments_section: true },
    },
    children,
  };
}

function buildFooterSection(tpl: PrintTemplate): SectionElements {
  const id = nextId();
  const children: DesignerElement[] = [];
  let y = 4;

  children.push({
    id: nextId(), type: DESIGNER_ELEMENT_TYPES.SEPARATOR,
    label: '┘╪د╪╡┘ ╪د┘╪ز╪░┘è┘è┘', sectionType: 'footer',
    x: 8, y, width: 734, height: 2,
    rotation: 0, locked: false, visible: true,
    parentId: id, children: [],
    styles: {},
    data: { footer_separator: tpl.footer_separator },
  });
  y += 10;

  if (tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.FOOTER_TEXT,
      label: '┘╪╡ ╪د┘╪ز╪░┘è┘è┘', sectionType: 'footer',
      x: 8, y, width: 734, height: 50,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: '9px', textAlign: 'center' },
      data: { footer_line1: tpl.footer_line1, footer_line2: tpl.footer_line2, footer_line3: tpl.footer_line3 },
    });
    y += 56;
  }

  if (tpl.show_thank_you) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.THANK_YOU,
      label: '╪┤┘â╪▒', sectionType: 'footer',
      x: 8, y, width: 734, height: (tpl.thank_you_size || 11) + 8,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: `${tpl.thank_you_size || 11}px`, color: tpl.thank_you_color || '#111', textAlign: 'center' },
      data: { show_thank_you: true, thank_you_text: tpl.thank_you_text, thank_you_size: tpl.thank_you_size, thank_you_color: tpl.thank_you_color },
    });
    y += (tpl.thank_you_size || 11) + 14;
  }

  if (tpl.show_returns_policy) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.LEGAL_TEXT,
      label: '╪│┘è╪د╪│╪ر ╪د┘╪ح╪▒╪ش╪د╪╣', sectionType: 'footer',
      x: 8, y, width: 734, height: 24,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: { fontSize: '8px', textAlign: 'center' },
      data: { show_returns_policy: true, returns_policy_text: tpl.returns_policy_text, footer_legal_text: tpl.footer_legal_text },
    });
    y += 30;
  }

  if (tpl.show_barcode) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.BARCODE,
      label: '╪ذ╪د╪▒┘â┘ê╪»', sectionType: 'footer',
      x: 8, y, width: 200, height: 50,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: {},
      data: { show_barcode: true, barcode_content: tpl.barcode_content, barcode_custom_text: tpl.barcode_custom_text },
    });
  }

  if (tpl.show_qr) {
    const qrX = tpl.show_barcode ? 220 : 8;
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.QR_CODE,
      label: 'QR', sectionType: 'footer',
      x: qrX, y, width: 50, height: 50,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: {},
      data: { show_qr: true, qr_content: tpl.qr_content },
    });
  }

  if (tpl.show_barcode || tpl.show_qr) y += 56;

  if (tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp) {
    children.push({
      id: nextId(), type: DESIGNER_ELEMENT_TYPES.SIGNATURE,
      label: '╪د┘╪ز┘ê┘é┘è╪╣╪د╪ز', sectionType: 'footer',
      x: 8, y, width: 734, height: 30,
      rotation: 0, locked: false, visible: true,
      parentId: id, children: [],
      styles: {},
      data: { show_cashier_signature: tpl.show_cashier_signature, show_client_signature: tpl.show_client_signature, show_stamp: tpl.show_stamp },
    });
  }

  return {
    el: {
      id, type: DESIGNER_ELEMENT_TYPES.SECTION,
      label: SECTION_LABELS.footer, sectionType: 'footer',
      x: 0, y: 0, width: 750, height: y + 10,
      rotation: 0, locked: false, visible: tpl.show_footer_section,
      parentId: null, children: children.map(c => c.id),
      styles: { padding: '4px 8px' },
      data: { show_footer_section: true },
    },
    children,
  };
}

function readSectionData(el: DesignerElement, target: Partial<PrintTemplate>): void {
  const data = el.data;
  if (!data) return;
  (Object.keys(data) as (keyof typeof data)[]).forEach(key => {
    const val = data[key];
    if (val !== undefined && val !== null) {
      (target as any)[key] = val;
    }
  });
}

function readElementsFromSections(sections: DesignerElement[], allElements: Record<string, DesignerElement>): Partial<PrintTemplate> {
  const result: Partial<PrintTemplate> = {};

  for (const section of sections) {
    const sectionType = section.sectionType as SectionType | undefined;
    if (sectionType === 'header') {
      result.show_header_section = section.visible;
    } else if (sectionType === 'doc-info') {
      result.show_doc_info_section = section.visible;
    } else if (sectionType === 'items') {
      result.show_items_section = section.visible;
    } else if (sectionType === 'totals') {
      result.show_totals_section = section.visible;
    } else if (sectionType === 'payments') {
      result.show_payments_section = section.visible;
    } else if (sectionType === 'footer') {
      result.show_footer_section = section.visible;
    }

    readSectionData(section, result);

    for (const childId of section.children) {
      const child = allElements[childId];
      if (child) readSectionData(child, result);
    }
  }

  return result;
}

export function printTemplateToDesignerElements(tpl: PrintTemplate): Record<string, DesignerElement> {
  _idCounter = 0;
  const sections: SectionElements[] = [
    buildHeaderSection(tpl),
    buildDocInfoSection(tpl),
    buildItemsSection(tpl),
    buildTotalsSection(tpl),
    buildPaymentsSection(tpl),
    buildFooterSection(tpl),
  ];

  const elements: Record<string, DesignerElement> = {};
  for (const sec of sections) {
    elements[sec.el.id] = sec.el;
    for (const child of sec.children) {
      elements[child.id] = child;
    }
  }
  return elements;
}

export function designerElementsToPrintTemplate(elements: Record<string, DesignerElement>): Partial<PrintTemplate> {
  const sections = Object.values(elements).filter(el => el.type === DESIGNER_ELEMENT_TYPES.SECTION && el.parentId === null);
  return readElementsFromSections(sections, elements);
}
