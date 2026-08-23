import React, { useRef, useState } from 'react';
import { Section, AlertBanner, ColumnManager } from '../components/DocumentUIPrimitives';
import { BarcodeInput } from '../components/BarcodeInput';
import { LineCard } from '../components/LineCard';
import { DocumentLineRow } from '../components/DocumentLineRow';
import { SmartSuggestionsPanel } from '../components/SmartSuggestionsPanel';
import type { LineItem, ColKey } from '../types/document.types';
import { ALL_COLUMNS } from '../types/document.types';
import type { ComputeLineWarning } from '../hooks/useComputeLine';
import { validateLineStock } from '../utils/document.utils';
import { focusDocLineCell } from '../utils/focusDocLineCell';
import { useBarcodeScan } from '../../../hooks/useBarcodeScan';
import { useNotification } from '../../../hooks/useNotification';

const BarcodeScannerModal = React.lazy(() => import('../../../components/BarcodeScannerModal'));

interface DocumentLinesSectionProps {
  lines: LineItem[];
  isLinesReadOnly: boolean;
  isReadOnly: boolean;
  isPurchase: boolean;
  isPartyExempt: boolean;
  products: Array<{ id: number; name: string; ref?: string | null; barcode?: string | null }>;
  isLoadingProducts: boolean;
  visibleCols: Set<ColKey>;
  handleColsChange: (cols: Set<ColKey>) => void;
  lineMode: 'table' | 'card';
  setLineMode: React.Dispatch<React.SetStateAction<'table' | 'card'>>;
  lineWarnings: Map<number, ComputeLineWarning[]>;
  stockData: Record<number, number>;
  addLine: () => void;
  addLineWithProduct: (productId: string, unitPrice?: number, tvaRate?: number) => void;
  removeLine: (idx: number) => void;
  duplicateLine: (idx: number) => void;
  updateLine: (idx: number, patch: Partial<LineItem>, product?: unknown) => void;
  lineErr: string;
  savedDraft: Record<string, unknown> | null;
  draftKey: string;
  restoreDraft: () => Record<string, unknown> | null;
  set: (field: string, value: unknown) => void;
  needsParty: boolean;
  productSuggestions: unknown;
  isLoadingSuggestions: boolean;
  setShowBulkImport: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * فتح كاميرا «تصوير فاتورة المورد» (تعبئة OCR) — يُمرَّر فقط لمستندات الشراء.
   */
  onOcrInvoice?: () => void;
  /** فتح منتقي صور الجهاز لإرسال صورة فاتورة موجودة مباشرة إلى OCR (بدون كاميرا). */
  onOcrImage?: () => void;
  slug: string | null | undefined;
  affectsStock: boolean;
  stockDir: 1 | -1 | 0;
  warehouses: Array<{ id: number; name: string }>;
  /** وضع الحاسب المحمول — يضغط عروض أعمدة الجدول ليتسع على شاشات 1366px. */
  compact?: boolean;
}

export default function DocumentLinesSection({
  lines, isLinesReadOnly, isReadOnly, isPurchase, isPartyExempt,
  products, isLoadingProducts,
  visibleCols, handleColsChange,
  lineMode, setLineMode,
  lineWarnings, stockData,
  addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
  lineErr, savedDraft, draftKey, restoreDraft, set,
  needsParty, productSuggestions, isLoadingSuggestions,
  setShowBulkImport, onOcrInvoice, onOcrImage, slug,
  affectsStock, stockDir,
  warehouses, compact = false,
}: DocumentLinesSectionProps) {
  const [stockAlertOpen, setStockAlertOpen] = useState(true);
  const notify = useNotification();

  // ── مسح الباركود بالكاميرا: إضافة المنتج الممسوح كسطر مباشرة ──────────────
  const scanner = useBarcodeScan<{ id: number; name: string; ref?: string | null; barcode?: string | null }>({
    resolve: (code) =>
      products.find(
        (p) => p.barcode === code || p.ref === code || String(p.id) === code,
      ) ?? null,
    onFound: (p) => addLineWithProduct(String(p.id)),
    onNotFound: () => notify.error('لم يتم العثور على منتج بهذا الباركود'),
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 🆕 تنقّل بلوحة المفاتيح (Enter) بين حقول جدول/بطاقات الأسطر — نمط
  // إنتاجية أساسي في ERP احترافي (Excel-like)، لم يكن موجوداً سابقاً.
  // Tab يعمل عبر ترتيب DOM الطبيعي للمتصفح بلا أي كود إضافي؛ Enter وحده
  // يحتاج معالجة يدوية لأنه لا يفعل شيئاً افتراضياً خارج <form>.
  // العملية: نجمع كل الحقول القابلة للتركيز (input/select/textarea) داخل
  // حاوية الجدول بترتيب DOM، وعند Enter ننتقل للحقل التالي — أو إن كان
  // آخر حقل في آخر سطر، نضيف سطراً جديداً ونُركِّز أول حقل فيه تلقائياً.
  // ═══════════════════════════════════════════════════════════════════════
  const linesContainerRef = useRef<HTMLDivElement>(null);
  const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

  /** أضف سطراً فارغاً جديداً ثم ركّز منتقي المنتج فيه (السطر الجديد بلا منتج —
   *  الكمية بلا معنى قبله). يهبط إلى الكمية إن لم يُوجد المنتقي. */
  const addLineAndFocusNewRow = () => {
    const newIdx = lines.length;
    addLine();
    focusDocLineCell(newIdx, ['product', 'qty', 'total_qty']);
  };

  /** ركّز حقل الكمية في سطر معين (يُستعمل بعد التكرار/الإضافة). */
  const focusLineQty = (idx: number) => {
    focusDocLineCell(idx, ['qty', 'total_qty']);
  };

  /** ركّز عنصراً (مع تحديد النص إن كان input) — مساعد لمسار Enter السريع. */
  const focusEl = (el: HTMLElement) => {
    el.scrollIntoView({ block: 'nearest' });
    el.focus();
    if (el instanceof HTMLInputElement && el.type !== 'checkbox' && el.type !== 'radio') {
      el.select();
    }
  };

  /** تركيز خلية بنفس العمود في السطر التالي/السابق (نمط Excel — عرض الجدول). */
  const focusAdjacentRowCell = (
    container: HTMLDivElement,
    origin: HTMLElement,
    dir: 1 | -1,
  ): boolean => {
    const cell = origin.closest('td');
    const row = origin.closest('tr[data-line-idx]') as HTMLTableRowElement | null;
    if (!cell || !row) return false;
    const colIdx = Array.from(row.children).indexOf(cell);
    if (colIdx === -1) return false;
    const rows = Array.from(container.querySelectorAll<HTMLElement>('tr[data-line-idx]'));
    const next = rows[rows.indexOf(row) + dir];
    if (!next) return false;
    const nextCell = next.children[colIdx] as HTMLElement | undefined;
    if (!nextCell) return false;
    const field = nextCell.querySelector<HTMLElement>(FOCUSABLE);
    const target = field ?? nextCell;
    target.focus();
    if (target instanceof HTMLInputElement && target.type !== 'checkbox' && target.type !== 'radio') {
      target.select?.();
    }
    return true;
  };

  const handleLinesKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const container = linesContainerRef.current;

    // Escape داخل الأسطر: اترك الحقل فقط ولا تغلق المستند كله
    // (المعالج العام في الشريط العلوي يستمع على window — نوقف الانتشار هنا).
    if (e.key === 'Escape') {
      const active = document.activeElement as HTMLElement | null;
      if (container && active && container.contains(active)) {
        e.preventDefault();
        e.stopPropagation();
        active.blur();
      }
      return;
    }

    // Ctrl+Delete حذف السطر المُركَّز · Ctrl+D تكراره (يعمل في الجدول والبطاقات)
    if ((e.ctrlKey || e.metaKey) && !isLinesReadOnly) {
      if (e.key === 'Delete') {
        const row = target.closest('[data-line-idx]');
        if (row && container?.contains(row)) {
          e.preventDefault();
          removeLine(Number(row.getAttribute('data-line-idx')));
          return;
        }
      } else if (!e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
        const row = target.closest('[data-line-idx]');
        if (row && container?.contains(row)) {
          e.preventDefault();
          const srcIdx = Number(row.getAttribute('data-line-idx'));
          duplicateLine(srcIdx);
          focusLineQty(srcIdx + 1);
          return;
        }
      }
    }

    // أسهم أعلى/أسفل: التنقل بين الأسطر في نفس العمود (عرض الجدول)
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && lineMode === 'table' && container) {
      if (target.closest('select')) {
        // لا تسرق أسهم القوائم المنسدلة الأصلية
        return;
      }
      if (focusAdjacentRowCell(container, target, e.key === 'ArrowDown' ? 1 : -1)) {
        e.preventDefault();
      }
      return;
    }

    if (e.key !== 'Enter') return;
    const isFocusableField =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement;
    if (!isFocusableField) return;
    // ملاحظة: Enter داخل <select> مفتوح فعلياً (قائمة منسدلة أصلية) يُغلقها
    // المتصفح ويُطبِّق الاختيار بشكل أصلي قبل وصول هذا المعالج غالباً؛
    // preventDefault هنا لا يمنع ذلك السلوك الأصلي، فقط يمنع أي إرسال نموذج.
    e.preventDefault();

    if (!container) return;

    // مسار سريع للمال: كمية ← سعر نفس السطر ← الكمية في السطر التالي
    // (آخر سطر ⇒ أضف سطراً جديداً وركّز كميته). أي عمود مخفي ⇒ اسقط
    // للمسار العام (Enter = الحقل التالي بترتيب DOM).
    const tid = target.id || '';
    const mQty = /^doc-line-(\d+)-qty$/.exec(tid);
    const mPrice = /^doc-line-(\d+)-price$/.exec(tid);
    if (mQty) {
      const priceEl = document.getElementById(`doc-line-${mQty[1]}-price`);
      if (priceEl) { focusEl(priceEl); return; }
    } else if (mPrice) {
      const i = Number(mPrice[1]);
      if (i < lines.length - 1) {
        // السطر التالي فارغ (بلا منتج)؟ → منتقي المنتج أولاً، وإلا فالكمية.
        const nextProd = document.getElementById(`doc-line-${i + 1}-product`);
        if (nextProd && nextProd.getAttribute('data-has-product') === '0') {
          focusEl(nextProd);
          return;
        }
        const nextQty = document.getElementById(`doc-line-${i + 1}-qty`)
          ?? document.getElementById(`doc-line-${i + 1}-total_qty`);
        if (nextQty) { focusEl(nextQty); return; }
      } else if (!isLinesReadOnly) {
        addLineAndFocusNewRow();
        return;
      }
    }

    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    const currentIdx = focusables.indexOf(target);
    if (currentIdx === -1) return;

    if (currentIdx < focusables.length - 1) {
      focusables[currentIdx + 1]?.focus();
      (focusables[currentIdx + 1] as HTMLInputElement)?.select?.();
      return;
    }

    // آخر حقل في آخر سطر — أضف سطراً جديداً وركّز منتقي المنتج فيه.
    // setState غير متزامن: نُعيد المحاولة حتى يظهر الصف الجديد فعلاً.
    if (isLinesReadOnly) return;
    const countBefore = focusables.length;
    const newIdx = lines.length;
    addLine();
    let left = 10;
    const tick = () => {
      const prodEl = document.getElementById(`doc-line-${newIdx}-product`);
      if (prodEl) { prodEl.scrollIntoView({ block: 'nearest' }); prodEl.focus(); return; }
      const updated = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      const el = updated[countBefore];
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
        el.focus();
        (el as HTMLInputElement)?.select?.();
      } else if (--left > 0) {
        setTimeout(tick, 30);
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <Section
      title="أسطر المستند"
      icon="ti-list-details"
      badge={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lines.length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'var(--emb)', color: 'var(--em)',
            }}>
              {lines.length} سطر
            </span>
          )}
          {isLinesReadOnly && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'var(--bg3)', color: 'var(--t4)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="ti ti-lock" style={{ fontSize: 10 }} />
              محمية
            </span>
          )}
          {!isLinesReadOnly && (
            <ColumnManager visible={visibleCols} onChange={handleColsChange} />
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {affectsStock && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6,
          }}>
            {stockAlertOpen ? (
              <div style={{ flex: 1 }}>
                <AlertBanner
                  type={stockDir > 0 ? 'info' : 'warning'}
                  message={stockDir > 0
                    ? 'هذا المستند سيضيف الكميات إلى المخزون عند الحفظ'
                    : 'هذا المستند سيخصم الكميات من المخزون عند الحفظ'}
                />
              </div>
            ) : (
              <button
                onClick={() => setStockAlertOpen(true)}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--b2)', background: 'var(--bg2)',
                  color: 'var(--t4)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                المخزون
              </button>
            )}
            {stockAlertOpen && (
              <button
                onClick={() => setStockAlertOpen(false)}
                style={{
                  padding: '4px 6px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--b2)', background: 'var(--bg3)',
                  color: 'var(--t4)', cursor: 'pointer', fontSize: 10,
                  fontFamily: 'inherit', flexShrink: 0, lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {lineErr && <AlertBanner type="error" message={lineErr} />}

        {!isLinesReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarcodeInput
                products={products}
                onProductFound={(productId) => {
                  addLineWithProduct(String(productId));
                }}
                disabled={isLinesReadOnly}
              />
              <button
                onClick={scanner.openScanner}
                title="مسح الباركود بالكاميرا"
                style={{
                  width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--r1)',
                  border: '1px solid var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-camera" style={{ fontSize: 16 }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                title="Enter: كمية ← سعر ← السطر التالي · Alt+N: سطر جديد (يُركَّز كميته) · ↑/↓: نفس العمود · Ctrl+D: تكرار السطر · Ctrl+Delete: حذف السطر · Esc: ترك الحقل"
                style={{ fontSize: 10.5, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <i className="ti ti-keyboard" style={{ fontSize: 12 }} />
                {compact ? 'اختصارات' : 'Enter للانتقال للحقل التالي'}
              </span>
              <button
                onClick={() => setLineMode((m) => {
                  const next = m === 'table' ? 'card' : 'table';
                  try { localStorage.setItem(`doc_line_mode_${slug ?? 'default'}`, next); } catch {}
                  return next;
                })}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit',
                }}
              >
                <i className={`ti ti-${lineMode === 'table' ? 'layout-cards' : 'table'}`} />
                {lineMode === 'table' ? 'عرض البطاقات' : 'عرض الجدول'}
              </button>
            </div>
          </div>
        )}

        <div
          ref={linesContainerRef}
          onKeyDown={handleLinesKeyDown}
          style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
        >
          {isLoadingProducts ? (
            <div style={{
              textAlign: 'center', padding: 24, color: 'var(--t4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
              جاري تحميل المنتجات...
            </div>
          ) : lines.length === 0 ? (
            <div>
              {savedDraft && (
                <div style={{
                  padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--r2)',
                  background: 'color-mix(in srgb, var(--blue) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                }}>
                  <i className="ti ti-history" style={{ color: 'var(--blue)', fontSize: 16 }} />
                  <span style={{ flex: 1, color: 'var(--t2)' }}>
                    لديك مسودة محفوظة من قبل — هل تريد استعادتها؟
                  </span>
                  <button
                    onClick={() => {
                      const draft = restoreDraft();
                      if (draft) {
                        Object.keys(draft).forEach((k) => {
                          if (k !== '_savedAt' && typeof set === 'function') {
                            (set as (field: string, value: unknown) => void)(k, draft[k]);
                          }
                        });
                        try { localStorage.removeItem(draftKey); } catch {}
                      }
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--blue)', background: 'var(--emb)',
                      color: 'var(--blue)', cursor: 'pointer', fontSize: 11,
                      fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >
                    استعادة
                  </button>
                  <button
                    onClick={() => { try { localStorage.removeItem(draftKey); } catch {} }}
                    style={{
                      padding: '5px 10px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--b3)', background: 'transparent',
                      color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                      fontFamily: 'inherit',
                    }}
                  >
                    تجاهل
                  </button>
                </div>
              )}
              <div style={{
                padding: 16, textAlign: 'center', color: 'var(--t4)',
                fontSize: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
              }}>
                {isLinesReadOnly ? 'لا أسطر — المستند فارغ' : 'لا أسطر بعد — اضغط "إضافة سطر" أدناه'}
              </div>
            </div>
          ) : lineMode === 'card' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, idx) => {
                const stockResult = line._product
                  ? validateLineStock(line, line._product, isPurchase, stockData)
                  : { ok: true as const };
                return (
                  <LineCard
                    key={idx}
                    line={line}
                    idx={idx}
                    products={products}
                    isPurchase={isPurchase}
                    disabled={isLinesReadOnly}
                    stockData={stockData}
                    stockValidation={stockResult}
                    isTvaExempt={!isPurchase && isPartyExempt}
                    lineWarnings={lineWarnings.get(idx)}
                    warehouses={warehouses}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                    onDuplicate={duplicateLine}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 11.5 : 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b2)' }}>
                  {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                    <th key={col.key} style={{
                      padding: compact ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 700,
                      color: 'var(--t3)', fontSize: 11, whiteSpace: 'nowrap',
                      minWidth: compact ? Math.round(col.w * 0.85) : col.w,
                    }}>
                      {col.label}
                    </th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const stockResult = line._product
                      ? validateLineStock(line, line._product, isPurchase, stockData)
                      : { ok: true as const };
                    const lineIdxWarnings = lineWarnings.get(idx);
                    return (
                      <DocumentLineRow
                        key={idx}
                        line={line}
                        idx={idx}
                        visibleCols={visibleCols}
                        isPurchase={isPurchase}
                        disabled={isLinesReadOnly}
                        products={products}
                        stockData={stockData}
                        stockValidation={stockResult}
                        onUpdate={updateLine}
                        onRemove={removeLine}
                        onDuplicate={duplicateLine}
                        isTvaExempt={!isPurchase && isPartyExempt}
                        lineWarnings={lineIdxWarnings}
                        warehouses={warehouses}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLinesReadOnly && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={addLineAndFocusNewRow}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--r2)',
                border: '1px dashed var(--b3)', background: 'transparent',
                color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              <i className="ti ti-plus" />
              إضافة سطر
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--r2)',
                border: '1px dashed var(--b3)', background: 'transparent',
                color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              <i className="ti ti-upload" />
              استيراد من Excel
            </button>
            {isPurchase && onOcrInvoice && (
              <button
                onClick={onOcrInvoice}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-camera" />
                تصوير فاتورة المورد
              </button>
            )}
            {isPurchase && onOcrImage && (
              <button
                onClick={onOcrImage}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-photo" />
                استيراد من صورة
              </button>
            )}
          </div>
        )}

        {!isLinesReadOnly && needsParty && (
          <SmartSuggestionsPanel
            suggestions={productSuggestions as any}
            isLoading={isLoadingSuggestions}
            onAddProduct={(productId, suggestedPrice, suggestedTva) => {
              addLineWithProduct(String(productId), suggestedPrice ?? undefined, suggestedTva ?? undefined);
              focusLineQty(lines.length);
            }}
            disabled={isReadOnly}
          />
        )}
      </div>
      {scanner.open && (
        <React.Suspense fallback={null}>
          <BarcodeScannerModal
            open={scanner.open}
            onScan={scanner.handleScan}
            onClose={scanner.closeScanner}
            title="مسح الباركود لإضافة منتج"
            hint="صوّب الكاميرا على باركود المنتج ليُضاف كسطر تلقائياً"
          />
        </React.Suspense>
      )}
    </Section>
  );
}
