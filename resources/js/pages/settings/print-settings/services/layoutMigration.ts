import type { PrintTemplate, LayoutRow, HeaderLayout } from '../types/domain';

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

/** Single entry point — call from SettingsSerializer.fromApiResponse() */
export function ensureLayoutFields(tpl: PrintTemplate): PrintTemplate {
  return {
    ...tpl,
    totals_rows: tpl.totals_rows?.length ? tpl.totals_rows : buildDefaultTotalsRows(tpl),
    footer_rows: tpl.footer_rows?.length ? tpl.footer_rows : buildDefaultFooterRows(tpl),
    header_layout: tpl.header_layout ?? buildDefaultHeaderLayout(),
  };
}
