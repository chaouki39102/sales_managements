import React from 'react';
import type { DocumentLine } from '../../data/UniversalDocumentData';
import type {
  PrintTemplate,
  ColumnKey,
  AlignOption,
  BorderStyle,
  FontFamily,
} from '../../core/domain/PrintTemplate';

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

const COL_HEADERS: Record<ColumnKey, string> = {
  rowNumber: '#',
  barcode:   'باركود',
  ref:       'مرجع',
  name:      'البيان',
  unit:      'وحدة',
  quantity:  'الكمية',
  price:     'السعر',
  discount:  'خصم',
  tva:       'TVA',
  total:     'المجموع',
};

export function colDefaultHeader(col: ColumnKey): string {
  return COL_HEADERS[col] ?? col;
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
  defaults: Record<ColumnKey, number>,
): number {
  return tpl.col_widths[col] ?? defaults[col] ?? 20;
}

export function colAlign(tpl: PrintTemplate, col: ColumnKey): AlignOption {
  return tpl.col_aligns[col] ?? 'right';
}

export interface CompanyData {
  name:    string;
  address: string;
  phone:   string;
  nif:     string;
  rc:      string;
  nis:     string;
  ice:     string;
  article: string;
  logoUrl?: string | null;
}

export function getCompany(
  tpl: PrintTemplate,
  api?: CompanyData | null,
): CompanyData {
  return {
    name:    tpl.company_name_text || api?.name    || '',
    address: tpl.override_address  || api?.address  || '',
    phone:   tpl.override_phone    || api?.phone   || '',
    nif:     tpl.override_nif      || api?.nif     || '',
    rc:      tpl.override_rc       || api?.rc      || '',
    nis:     tpl.override_nis      || api?.nis     || '',
    ice:     tpl.override_ice      || api?.ice     || '',
    article: tpl.override_article  || api?.article || '',
    logoUrl: api?.logoUrl ?? null,
  };
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
      <span dir="ltr">{val}</span>
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
