import React from 'react';
import type { DocumentLine } from '../../types/data';
import type {
  PrintTemplate,
  ColumnKey,
  AlignOption,
  BorderStyle,
  FontFamily,
  LayoutRow,
  LayoutColumn,
  BoxBorder,
  CellStyle,
} from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { printFieldRegistry } from '../../services/PrintFieldRegistry';
import { printFieldResolver } from '../../services/PrintFieldResolver';

export function formatDate(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ─── Styling helpers ────────────────────────────────────────────────────────────

export function mm(v: number): number {
  return v * 3.78;
}

export function align(a: AlignOption): React.CSSProperties['textAlign'] {
  return a === 'right' ? 'right' : a === 'left' ? 'left' : 'center';
}

export function fontFamily(f: FontFamily): string {
  switch (f) {
    case 'monospace': return "'Courier New', monospace";
    case 'times':     return "'Times New Roman', serif";
    case 'arial':     return "Arial, sans-serif";
    default:          return "'Tajawal', sans-serif";
  }
}

import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';

export function colDefaultHeader(col: ColumnKey): string {
  return COLUMN_DEFAULTS[col]?.header ?? col;
}

export function borderStyle(s: BorderStyle): string {
  switch (s) {
    case 'solid':  return 'solid';
    case 'dashed': return 'dashed';
    case 'double': return 'double';
    default:       return 'none';
  }
}

const BORDER_MAP: Record<BorderStyle, string> = {
  solid:  'solid',
  dashed: 'dashed',
  double: 'double',
  none:   'none',
};

export function Separator({ style }: { style: BorderStyle }): JSX.Element {
  if (style === 'none') return <div />;
  const thickness = style === 'double' ? 3 : 1;
  return <div style={{ borderBottom: `${thickness}px ${BORDER_MAP[style]} #999`, margin: '4px 0' }} />;
}

export const MemoizedSeparator = React.memo(Separator);

// ─── Data extraction helpers ────────────────────────────────────────────────────

export function getVisibleCols(tpl: PrintTemplate): ColumnKey[] {
  return tpl.col_order.filter(k => tpl.col_show[k] !== false);
}

export function colWidth(
  tpl: PrintTemplate,
  col: ColumnKey,
  defaults?: Partial<Record<ColumnKey, number>>,
): number {
  return tpl.col_widths[col] ?? defaults?.[col] ?? COLUMN_DEFAULTS[col]?.width ?? 20;
}

export function colAlign(tpl: PrintTemplate, col: ColumnKey): AlignOption {
  return tpl.col_aligns[col] ?? COLUMN_DEFAULTS[col]?.align ?? 'right';
}

export interface CompanyData {
  name:            string;
  commercialName:  string;
  address:         string;
  phone:           string;
  mobile:          string;
  fax:             string;
  email:           string;
  nif:             string;
  rc:              string;
  nis:             string;
  article:         string;
  capital:         string;
  bankName:        string;
  rib:             string;
  activity:        string;
  logoUrl?:        string | null;
}

export function buildTvaByRate(
  lines: DocumentLine[],
): Array<{ rate: number; base: number; amount: number }> {
  const map = new Map<number, { base: number; amount: number }>();
  for (const line of lines) {
    const pct = line.tvaPct;
    const prev = map.get(pct) ?? { base: 0, amount: 0 };
    map.set(pct, {
      base:   prev.base   + line.totalHt,
      amount: prev.amount + line.totalTva,
    });
  }
  return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
}

// ─── Simple presentational components ──────────────────────────────────────────

interface DocRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DocRowFn({ label, value, mono }: DocRowProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Courier New', monospace" : undefined }}>{value}</span>
    </div>
  );
}

export const DocRow = React.memo(DocRowFn);

interface TotalRowProps {
  label: string;
  val: string;
  red?: boolean;
  bold?: boolean;
}

function TotalRowFn({ label, val, red, bold }: TotalRowProps): JSX.Element {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      fontWeight: bold ? 800 : 'inherit',
      color: red ? '#c00' : 'inherit',
    }}>
      <span>{label}</span>
      <span dir="ltr">{Number(val).toFixed(2)}</span>
    </div>
  );
}

export const TotalRow = React.memo(TotalRowFn);

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRowFn({ label, value }: InfoRowProps): JSX.Element {
  return (
    <tr>
      <td style={{ color: '#555', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>
        {label}:
      </td>
      <td style={{ padding: '2px 0', paddingRight: 12 }}>
        {value}
      </td>
    </tr>
  );
}

export const InfoRow = React.memo(InfoRowFn);

// ─── SectionWrap — applies highlight styling from rules ──────────────────────

export function SectionWrap({ highlight, children }: {
  highlight: Record<string, string> | null;
  children: React.ReactNode;
}) {
  if (!highlight) return <>{children}</>;
  return <div style={highlight}>{children}</div>;
}

// ─── Box border helper (any side, color, width, radius) ───────────────────────

const BORDER_STYLE_CSS: Record<string, string> = {
  solid: 'solid', dashed: 'dashed', double: 'double', none: 'none',
};

export function boxBorderCss(b?: Partial<BoxBorder>): React.CSSProperties {
  if (!b || !b.style || b.style === 'none') return {};
  const w = b.width ?? 1;
  const c = b.color ?? '#111';
  const st = BORDER_STYLE_CSS[b.style] ?? 'solid';
  const sides = b.sides ?? {};
  const css: React.CSSProperties = {};
  if (sides.top !== false)    css.borderTop = `${w}px ${st} ${c}`;
  if (sides.bottom !== false) css.borderBottom = `${w}px ${st} ${c}`;
  if (sides.start !== false)  css.borderRight = `${w}px ${st} ${c}`;
  if (sides.end !== false)    css.borderLeft = `${w}px ${st} ${c}`;
  if (b.radius) css.borderRadius = b.radius;
  return css;
}

export function cellStyleCss(s?: CellStyle): React.CSSProperties {
  if (!s) return {};
  const css: React.CSSProperties = {};
  if (s.bold)      css.fontWeight = 800;
  if (s.italic)    css.fontStyle = 'italic';
  if (s.fontSize)   css.fontSize = s.fontSize;
  if (s.color)      css.color = s.color;
  if (s.fontFamily) css.fontFamily = fontFamily(s.fontFamily);
  if (s.align)      css.textAlign = align(s.align);
  return css;
}

// ─── Format field value by type from PrintFieldRegistry ───────────────────────

function formatFieldValue(fieldId: string, value: unknown): string {
  if (fieldId === 'literal') return String(value ?? '');
  const def = printFieldRegistry.get(fieldId);
  if (!def) return String(value ?? '');
  if (def.type === 'currency') return Number(value ?? 0).toFixed(2);
  if (def.type === 'number')   return String(Number(value ?? 0));
  if (def.type === 'date')     return formatDate(String(value ?? ''));
  return String(value ?? '');
}

const sideToOrder = (side: 'start' | 'end') => (side === 'start' ? 0 : 1);

// ─── LayoutRowPair: label + value row from LayoutRow ──────────────────────────

function LayoutRowPairFn({
  row, label, value,
}: { row: LayoutRow; label: string; value: unknown }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '3px 2px',
      marginRight: row.indent ?? 0,
      fontWeight: row.bold ? 800 : 'inherit',
      color: row.color ?? 'inherit',
      fontSize: row.fontSize,
      ...boxBorderCss(row.border),
    }}>
      <span style={{ order: sideToOrder(row.labelSide ?? 'start'), flexShrink: 0 }}>{label}</span>
      <span style={{ order: sideToOrder(row.valueSide ?? 'end'), unicodeBidi: 'isolate', minWidth: 0, overflow: 'hidden' }} dir="auto">
        {formatFieldValue(row.field ?? '', value)}
      </span>
    </div>
  );
}
export const LayoutRowPair = React.memo(LayoutRowPairFn);

// ─── LayoutRowLine: free-text line (footer etc.) ──────────────────────────────

function LayoutRowLineFn({ row, text }: { row: LayoutRow; text: string }) {
  return (
    <div style={{
      textAlign: row.labelSide === 'start' ? 'right' : row.labelSide === 'end' ? 'left' : 'center',
      fontWeight: row.bold ? 800 : 'inherit',
      color: row.color ?? 'inherit',
      fontSize: row.fontSize,
      padding: '2px 0',
      ...boxBorderCss(row.border),
    }}>
      {text}
    </div>
  );
}
export const LayoutRowLine = React.memo(LayoutRowLineFn);

// ─── LayoutColumnCell: renders one column within a multi-column row ────────────

function LayoutColumnCellFn({
  column, data, tpl,
}: { column: LayoutColumn; data: UniversalDocumentData; tpl: PrintTemplate }) {
  const def = printFieldRegistry.get(column.field);
  const value = printFieldResolver.resolve(column.field, data, tpl);

  const isEmpty = value === null || value === undefined || value === '';
  const shouldHideWhenEmpty = def ? (def.type === 'string' || def.type === 'date') : true;
  if (isEmpty && shouldHideWhenEmpty) return null;

  const labelSetting = COMPANY_FIELD_LABEL_SETTING[column.field] || CUSTOMER_FIELD_LABEL_SETTING[column.field];
  const label = (labelSetting ? (tpl as any)[labelSetting] : '') || column.label ?? def?.label ?? column.field;

  const flex = column.width || 1;
  const css: React.CSSProperties = {
    flex: `${flex} 1 0`,
    padding: '2px 4px',
    textAlign: column.alignment,
    fontWeight: column.bold ? 800 : 'inherit',
    color: column.color ?? 'inherit',
    fontSize: column.fontSize,
    minWidth: 0,
  };

  return (
    <div style={css}>
      <span>{label}: </span>
      <span dir="auto">{formatFieldValue(column.field, value)}</span>
    </div>
  );
}
const LayoutColumnCell = React.memo(LayoutColumnCellFn);

// ─── renderLayoutRows: generic interpreter for LayoutRow[] ────────────────────

const COMPANY_FIELD_LABEL_SETTING: Record<string, string> = {
  'company.commercialName': 'label_commercial_name',
  'company.address':        'label_address',
  'company.phone':          'label_phone',
  'company.mobile':         'label_mobile',
  'company.fax':            'label_fax',
  'company.email':          'label_email',
  'company.nif':            'label_nif',
  'company.rc':             'label_rc',
  'company.nis':            'label_nis',
  'company.article':        'label_article',
  'company.capital':        'label_capital',
  'company.bankName':       'label_bank_name',
  'company.rib':            'label_rib',
  'company.activity':       'label_activity',
};

const CUSTOMER_FIELD_LABEL_SETTING: Record<string, string> = {
  'customer.name':           'label_client',
  'customer.nif':            'label_client_nif',
  'customer.phone':          'label_client_phone',
  'customer.address':        'label_client_address',
  'customer.deliveryAddress': 'label_delivery_address',
  'customer.commercialName': 'label_customer_commercial_name',
  'customer.rc':             'label_customer_rc',
  'customer.nis':            'label_customer_nis',
  'customer.ai':             'label_customer_ai',
  'customer.mobile':         'label_customer_mobile',
  'customer.fax':            'label_customer_fax',
  'customer.email':          'label_customer_email',
  'customer.activity':       'label_customer_activity',
  'customer.bankName':       'label_customer_bank_name',
  'customer.rib':            'label_customer_rib',
};

export function renderLayoutRows(
  rows: LayoutRow[] | undefined,
  data: UniversalDocumentData,
  tpl: PrintTemplate,
): JSX.Element[] {
  if (!rows || rows.length === 0) return [];

  const visible = [...rows].filter(r => r.visible).sort((a, b) => a.order - b.order);
  const out: JSX.Element[] = [];

  for (const r of visible) {
    // ── Multi-column mode: row has columns[] ──
    if (r.columns && r.columns.length > 0) {
      const cells = r.columns
        .map(col => <LayoutColumnCell key={col.id} column={col} data={data} tpl={tpl} />)
        .filter(Boolean);
      if (cells.length === 0) continue;
      out.push(
        <div key={r.id} style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          padding: '2px 2px',
          marginRight: r.indent ?? 0,
          fontWeight: r.bold ? 800 : 'inherit',
          color: r.color ?? 'inherit',
          fontSize: r.fontSize,
          flexWrap: 'wrap',
          ...boxBorderCss(r.border),
        }}>
          {cells}
        </div>,
      );
      continue;
    }

    // ── Legacy single-field mode (backward compatible) ──
    if (r.field === 'totals.tvaBreakdownGroup') {
      for (const br of data.taxBreakdown ?? []) {
        out.push(<LayoutRowPair key={`${r.id}-${br.rate}`} row={r} label={`TVA ${br.rate}%`} value={br.tva} />);
      }
      continue;
    }

    if (r.field === 'literal') {
      if (!r.literalText) continue;
      out.push(<LayoutRowLine key={r.id} row={r} text={r.literalText} />);
      continue;
    }

    const def = printFieldRegistry.get(r.field ?? '');
    const value = printFieldResolver.resolve(r.field ?? '', data, tpl);

    const isEmpty = value === null || value === undefined || value === '';
    const shouldHideWhenEmpty = def ? (def.type === 'string' || def.type === 'date') : true;
    if (isEmpty && shouldHideWhenEmpty) continue;

    const labelSetting = COMPANY_FIELD_LABEL_SETTING[r.field ?? ''] || CUSTOMER_FIELD_LABEL_SETTING[r.field ?? ''];
    const label = (labelSetting ? (tpl as any)[labelSetting] : '') || r.label ?? def?.label ?? r.field;
    out.push(<LayoutRowPair key={r.id} row={r} label={label} value={value} />);
  }

  return out;
}
