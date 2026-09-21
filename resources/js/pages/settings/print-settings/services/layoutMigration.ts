import type { PrintTemplate, LayoutRow, HeaderLayout, SectionMeta, TotalsGridConfig, PageFrameConfig, WatermarkConfig } from '../types/domain';

function row(
  id: string,
  field: string,
  order: number,
  overrides: Partial<LayoutRow> = {},
): LayoutRow {
  return {
    id,
    field,
    visible: true,
    order,
    labelSide: 'start',
    valueSide: 'end',
    ...overrides,
  };
}

/** Build totals_rows from legacy show_* flags. */
export function buildDefaultTotalsRows(tpl: PrintTemplate): LayoutRow[] {
  let o = 0;
  const rows: LayoutRow[] = [];

  if (tpl.show_total_ht)
    rows.push(row('total_ht', 'totals.ht', o++));

  if (tpl.show_discount_total)
    rows.push(row('discount', 'totals.discount', o++, { color: '#c00' }));

  if (tpl.show_total_tva)
    rows.push(row('total_tva', 'totals.tva', o++));

  if (tpl.show_tva_breakdown)
    rows.push(row('tva_breakdown', 'totals.tvaBreakdownGroup', o++, { fontSize: (tpl.totals_font_size ?? 10) - 1 }));

  if (tpl.show_fiscal_stamp)
    rows.push(row('fiscal_stamp', 'totals.fiscalStamp', o++));

  if (tpl.show_total_ttc)
    rows.push(row('total_ttc', 'totals.ttc', o++, {
      bold: true,
      fontSize: tpl.total_ttc_font_size,
      color: tpl.total_ttc_color,
      border: { style: tpl.total_border_style, width: 2, color: '#111', sides: { top: true } },
    }));

  if (tpl.show_amount_in_words)
    rows.push(row('amount_in_words', 'totals.amountInWords', o++, { labelSide: 'start', valueSide: 'start' }));

  if (tpl.show_paid_amount)
    rows.push(row('paid', 'totals.paid', o++, { bold: true }));

  if (tpl.show_change)
    rows.push(row('change', 'totals.change', o++));

  if (tpl.show_remaining)
    rows.push(row('remaining', 'totals.remaining', o++, { color: '#c00' }));

  if (tpl.show_prev_balance)
    rows.push(row('prev_balance', 'balance.previous', o++));

  if (tpl.show_new_balance)
    rows.push(row('new_balance', 'balance.current', o++, { bold: true }));

  return rows;
}

/** Build footer_rows from footer_line1/2/3 + thank_you + returns_policy. */
export function buildDefaultFooterRows(tpl: PrintTemplate): LayoutRow[] {
  let o = 0;
  const rows: LayoutRow[] = [];

  const pushLiteral = (id: string, text: string, extra: Partial<LayoutRow> = {}) => {
    if (!text) return;
    rows.push(row(id, 'literal', o++, { literalText: text, labelSide: 'start', valueSide: 'start', ...extra }));
  };

  pushLiteral('footer_line1', tpl.footer_line1);
  pushLiteral('footer_line2', tpl.footer_line2);
  pushLiteral('footer_line3', tpl.footer_line3);

  if (tpl.show_thank_you)
    pushLiteral('thank_you', tpl.thank_you_text, { color: tpl.thank_you_color, fontSize: tpl.thank_you_size, bold: true });

  if (tpl.show_returns_policy)
    pushLiteral('returns_policy', tpl.returns_policy_text);

  if (tpl.footer_legal_text)
    pushLiteral('legal_text', tpl.footer_legal_text);

  return rows;
}

/** No legacy multi-column header — default is always 'simple'. */
export function buildDefaultHeaderLayout(): HeaderLayout {
  return { mode: 'simple', columns: [] };
}

/** Build doc_info_rows from legacy show_doc_number/show_date/etc. flags. */
export function buildDefaultDocInfoRows(tpl: PrintTemplate): LayoutRow[] {
  let o = 0;
  const rows: LayoutRow[] = [];

  if (tpl.show_doc_number)
    rows.push(row('doc_number', 'document.number', o++, { label: 'رقم:' }));
  if (tpl.show_date)
    rows.push(row('doc_date', 'document.date', o++, { label: 'التاريخ:' }));
  if (tpl.show_time)
    rows.push(row('doc_time', 'document.time', o++, { label: 'الوقت:' }));
  if (tpl.show_due_date)
    rows.push(row('doc_due_date', 'document.dueDate', o++, { label: 'تاريخ الاستحقاق:' }));
  if (tpl.show_cashier)
    rows.push(row('doc_cashier', 'customer.cashierName', o++, { label: 'الكاشير:' }));
  if (tpl.show_session)
    rows.push(row('doc_session', 'session.code', o++, { label: 'الجلسة:' }));

  return rows;
}

/** Build customer_info_rows from legacy show_client/show_client_* flags. */
export function buildDefaultCustomerInfoRows(tpl: PrintTemplate): LayoutRow[] {
  let o = 0;
  const rows: LayoutRow[] = [];

  if (tpl.show_client)
    rows.push(row('cust_name', 'customer.name', o++, { label: 'العميل:' }));
  if (tpl.show_client_nif)
    rows.push(row('cust_nif', 'customer.nif', o++, { label: 'NIF العميل:' }));
  if (tpl.show_customer_commercial_name)
    rows.push(row('cust_commercial_name', 'customer.commercialName', o++, { label: 'الاسم التجاري:' }));
  if (tpl.show_customer_rc)
    rows.push(row('cust_rc', 'customer.rc', o++, { label: 'RC:' }));
  if (tpl.show_customer_nis)
    rows.push(row('cust_nis', 'customer.nis', o++, { label: 'NIS:' }));
  if (tpl.show_customer_ai)
    rows.push(row('cust_ai', 'customer.ai', o++, { label: 'المادة الجبائية:' }));
  if (tpl.show_client_phone)
    rows.push(row('cust_phone', 'customer.phone', o++, { label: 'هاتف العميل:' }));
  if (tpl.show_customer_mobile)
    rows.push(row('cust_mobile', 'customer.mobile', o++, { label: 'المحمول:' }));
  if (tpl.show_customer_fax)
    rows.push(row('cust_fax', 'customer.fax', o++, { label: 'الفاكس:' }));
  if (tpl.show_customer_email)
    rows.push(row('cust_email', 'customer.email', o++, { label: 'البريد الإلكتروني:' }));
  if (tpl.show_customer_activity)
    rows.push(row('cust_activity', 'customer.activity', o++, { label: 'النشاط:' }));
  if (tpl.show_client_address)
    rows.push(row('cust_address', 'customer.address', o++, { label: 'العنوان:' }));
  if (tpl.show_delivery_address)
    rows.push(row('cust_delivery', 'customer.deliveryAddress', o++, { label: 'عنوان التسليم:' }));
  if (tpl.show_customer_bank_name)
    rows.push(row('cust_bank_name', 'customer.bankName', o++, { label: 'اسم البنك:' }));
  if (tpl.show_customer_rib)
    rows.push(row('cust_rib', 'customer.rib', o++, { label: 'RIB:' }));

  return rows;
}

/** Build company_info_rows from legacy show_address/show_phone/etc. flags. */
export function buildDefaultCompanyInfoRows(tpl: PrintTemplate): LayoutRow[] {
  let o = 0;
  const rows: LayoutRow[] = [];

  if (tpl.show_commercial_name)
    rows.push(row('co_commercial_name', 'company.commercialName', o++, { label: 'الاسم التجاري' }));
  if (tpl.show_address)
    rows.push(row('co_address', 'company.address', o++));
  if (tpl.show_phone)
    rows.push(row('co_phone', 'company.phone', o++, { label: 'هاتف' }));
  if (tpl.show_mobile)
    rows.push(row('co_mobile', 'company.mobile', o++, { label: 'محمول' }));
  if (tpl.show_fax)
    rows.push(row('co_fax', 'company.fax', o++, { label: 'فاكس' }));
  if (tpl.show_email)
    rows.push(row('co_email', 'company.email', o++, { label: 'بريد' }));
  if (tpl.show_tax_id)
    rows.push(row('co_nif', 'company.nif', o++, { label: 'NIF' }));
  if (tpl.show_rc)
    rows.push(row('co_rc', 'company.rc', o++, { label: 'RC' }));
  if (tpl.show_nis)
    rows.push(row('co_nis', 'company.nis', o++, { label: 'NIS' }));
  if (tpl.show_article)
    rows.push(row('co_article', 'company.article', o++, { label: 'المادة الجبائية' }));
  if (tpl.show_capital)
    rows.push(row('co_capital', 'company.capital', o++, { label: 'رأس المال' }));
  if (tpl.show_bank_name)
    rows.push(row('co_bank_name', 'company.bankName', o++, { label: 'بنك' }));
  if (tpl.show_rib)
    rows.push(row('co_rib', 'company.rib', o++, { label: 'RIB' }));
  if (tpl.show_activity)
    rows.push(row('co_activity', 'company.activity', o++, { label: 'النشاط' }));

  return rows;
}

/** Default sections_order — all 6 sections in standard sequence. */
export function buildDefaultSectionsOrder(): SectionMeta[] {
  return [
    { key: 'header',     visible: true, order: 0 },
    { key: 'doc-info',   visible: true, order: 1 },
    { key: 'items',      visible: true, order: 2 },
    { key: 'totals',     visible: true, order: 3 },
    { key: 'payments',   visible: true, order: 4 },
    { key: 'footer',     visible: true, order: 5 },
  ];
}

/** Single entry point — call from SettingsSerializer.fromApiResponse() */
export function ensureLayoutFields(tpl: PrintTemplate): PrintTemplate {
  const result = {
    ...tpl,
    totals_rows: tpl.totals_rows?.length ? tpl.totals_rows : buildDefaultTotalsRows(tpl),
    footer_rows: tpl.footer_rows?.length ? tpl.footer_rows : buildDefaultFooterRows(tpl),
    header_layout: tpl.header_layout ?? buildDefaultHeaderLayout(),
    doc_info_rows: tpl.doc_info_rows?.length ? tpl.doc_info_rows : buildDefaultDocInfoRows(tpl),
    customer_info_rows: tpl.customer_info_rows?.length ? tpl.customer_info_rows : buildDefaultCustomerInfoRows(tpl),
    company_info_rows: tpl.company_info_rows?.length ? tpl.company_info_rows : buildDefaultCompanyInfoRows(tpl),
    sections_order: tpl.sections_order?.length ? tpl.sections_order : buildDefaultSectionsOrder(),
    col_styles: tpl.col_styles ?? [],
    page_frame: tpl.page_frame ?? { enabled: false } as PageFrameConfig,
    totals_grid: tpl.totals_grid ?? { enabled: false, columns: [] } as TotalsGridConfig,
    watermark: tpl.watermark ?? { enabled: false } as WatermarkConfig,
    element_positions: tpl.element_positions ?? {},
  };
  return result;
}
