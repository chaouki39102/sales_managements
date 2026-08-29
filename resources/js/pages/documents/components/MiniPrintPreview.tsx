// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/MiniPrintPreview.tsx — Task 12
//
// معاينة مصغّرة لورقة A4 حيّة تُرسم من حالة النموذج الفعلية أثناء الكتابة.
//
// القرار المعماري: ليست UniversalPreview ولا UniversalPrintPipeline —
//   • UniversalPreview قطعة ثقيلة (لازي ~450KB) تتطلب قالباً كاملاً + UniversalDocumentData
//     وبناؤها من النموذج الحي مكلف وغير قابل للقراءة في سايدبار بعرض 252–300px.
//   • هذه مكتبة خفيفة تعتمد فقط على calcLineTotal/calcFiscalStamp المألوفة
//     وتُعرض بحجم تصميم ثابت (300×424 ≈ A4) مع تحجيم CSS (transform: scale) حفاظاً
//     على نسب النص والورقة مهما كان عرض السايدبار.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';

import { calcLineTotal, fmtDZD, fmtDate, toNum } from '../utils/document.utils';
import type { LineItem, DocumentTotals } from '../types/document.types';
import type { CompanyInfo } from '@/pages/settings/print-settings/types/data';

// أبعاد التصميم الداخلية لورقة A4 (نسبة 210:297) — تُحجَّم CSS للعرض المتاح.
const SHEET_W = 300;
const SHEET_H = Math.round((SHEET_W * 297) / 210); // ≈ 424

// أقصى عدد أسطر يظهر في المصغّرة (+N إن تجاوز).
const MAX_LINES = 6;

const LBL_COLORS: Record<string, string> = {
  'الزبون': 'var(--em)',
  'المورد': '#d97706',
};

export interface MiniPrintPreviewProps {
  company:         CompanyInfo | null;
  docTypeName:     string;
  docNumber:       string;
  date:            string;
  partyLabel:      string;   // 'الزبون' | 'المورد'
  partyName:       string;
  lines:           LineItem[];
  totals:          DocumentTotals;
  notes?:          string;
  /** العرض الداخلي المتاح في السايدبار — يُشتق منه معامل التحجيم. */
  availableWidth:  number;
}

export default function MiniPrintPreview({
  company, docTypeName, docNumber, date, partyLabel, partyName,
  lines, totals, notes, availableWidth,
}: MiniPrintPreviewProps): React.ReactElement {
  const scale  = availableWidth > 0 ? availableWidth / SHEET_W : 1;
  const shown  = lines.slice(0, MAX_LINES);
  const more   = Math.max(0, lines.length - MAX_LINES);
  const hasDisc = toNum(totals.discount) > 0;
  const hasStamp = toNum(totals.stamp) > 0;

  return (
    <div
      title="معاينة مصغّرة للمستند"
      style={{
        width: SHEET_W * scale, height: SHEET_H * scale,
        position: 'relative', overflow: 'hidden',
        borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.16)',
        border: '1px solid var(--b1)', background: '#fff',
      }}
    >
      <div
        style={{
          width: SHEET_W, height: SHEET_H,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          background: '#fff', color: '#202020',
          fontFamily: 'Tajawal, system-ui, sans-serif',
          display: 'flex', flexDirection: 'column',
          padding: 14, boxSizing: 'border-box', direction: 'rtl',
        }}
      >
        {/* ── رأس الشركة ── */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
            {company?.name || '—'}
          </div>
          {(company?.nif || company?.rc) && (
            <div style={{ fontSize: 8.5, color: '#666', marginTop: 2 }}>
              {[company?.nif && `NIF: ${company.nif}`, company?.rc && `RC: ${company.rc}`]
                .filter(Boolean).join(' · ')}
            </div>
          )}
          {company?.address && (
            <div style={{ fontSize: 8, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.address}
            </div>
          )}
        </div>

        {/* ── نوع المستند + رقمه + التاريخ ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #bbb', paddingBottom: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: docTypeName ? '#111' : '#999' }}>
            {docTypeName || 'مستند جديد'}
          </span>
          <span style={{ fontSize: 9, color: '#666' }}>
            {docNumber || '—'}
          </span>
          <span style={{ fontSize: 8.5, color: '#888' }}>{fmtDate(date)}</span>
        </div>

        {/* ── الطرف ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: LBL_COLORS[partyLabel] ?? 'var(--em)' }}>
            {partyLabel}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partyName || '—'}
          </span>
        </div>

        {/* ── الأسطر ── */}
        <div style={{ flex: 1, minHeight: 0, borderBottom: '1px dashed #ddd', paddingBottom: 6, marginBottom: 6 }}>
          <MiniLineRow header />
          {shown.map((line, i) => <MiniLineRow key={line.id ?? `${line.product_id}-${i}`} line={line} idx={i + 1} />)}
          {more > 0 && (
            <div style={{ fontSize: 8.5, color: '#888', textAlign: 'center', paddingTop: 4 }}>
              +{more} أسطر أخرى
            </div>
          )}
          {lines.length === 0 && (
            <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', paddingTop: 8 }}>
              لا توجد أسطر بعد
            </div>
          )}
        </div>

        {/* ── الإجماليات ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <MiniTotalRow label="المجموع قبل الخصم"          value={totals.gross} />
          <MiniTotalRow label="الضريبة TVA"                 value={totals.tva} />
          {hasDisc  && <MiniTotalRow label="الخصم"          value={totals.discount} />}
          {hasStamp && <MiniTotalRow label="الطابع الجبائي" value={totals.stamp} />}
          <MiniTotalRow label="المجموع مع الضريبة (TTC)"    value={totals.ttc} bold />
          <MiniTotalRow label="المدفوع"                     value={totals.totalPaid} />
          <MiniTotalRow label="المتبقي"                     value={totals.remaining} />
        </div>

        {notes ? (
          <div style={{ fontSize: 8, color: '#888', marginTop: 6, borderTop: '1px dashed #bbb', paddingTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function MiniLineRow(props: { header?: boolean; line?: LineItem; idx?: number }) {
  if (props.header) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: '#888', fontWeight: 700, paddingBottom: 3, borderBottom: '1px solid #eee', marginBottom: 3 }}>
        <span style={{ width: 14, flexShrink: 0 }}>#</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>المنتج</span>
        <span style={{ width: 28, flexShrink: 0, textAlign: 'center' }}>الكمية</span>
        <span style={{ width: 46, flexShrink: 0, textAlign: 'left' }}>المجموع</span>
      </div>
    );
  }

  const { line, idx } = props;
  if (!line) return <></>;

  const calc  = calcLineTotal(line);
  const name  = line._product?.name ?? line.description ?? '—';
  const pack  = line._packQty > 1 ? line._packQty : 1;
  const qty   = toNum(line.quantity);
  const qtyTxt = pack > 1 ? `${fmtQty(qty)}×${pack}` : fmtQty(qty);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, color: '#333', padding: '2px 0' }}>
      <span style={{ width: 14, flexShrink: 0, color: '#999' }}>{idx}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span style={{ width: 28, flexShrink: 0, textAlign: 'center', color: '#666' }}>{qtyTxt}</span>
      <span style={{ width: 46, flexShrink: 0, textAlign: 'left', fontWeight: 600 }}>{fmtDZD(calc.ht)}</span>
    </div>
  );
}

function MiniTotalRow(props: { label: string; value: number; bold?: boolean }) {
  const { label, value, bold } = props;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: bold ? 10.5 : 9, fontWeight: bold ? 800 : 500, color: bold ? '#111' : '#444' }}>
      <span>{label}</span>
      <span>{fmtDZD(toNum(value))}</span>
    </div>
  );
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function fmtQty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const s = `${Math.round(n * 1000) / 1000}`;
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}