import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AlertBanner } from '../components/DocumentUIPrimitives';
import { BarcodeInput } from '../components/BarcodeInput';
import { LineCard } from '../components/LineCard';
import { DocumentLineRow } from '../components/DocumentLineRow';
import type { QuickCreatePayload } from '../components/ProductSearch';
import type { LineItem, ColKey } from '../types/document.types';
import { ALL_COLUMNS } from '../types/document.types';
import type { ComputeLineWarning } from '../hooks/useComputeLine';
import { validateLineStock } from '../utils/document.utils';
import { focusDocLineCell } from '../utils/focusDocLineCell';
import { getDocLinePref } from '../utils/docLinePrefs';
import { getDocPref } from '../utils/docPrefs';
import { useBarcodeScan } from '../../../hooks/useBarcodeScan';
import { useNotification } from '../../../hooks/useNotification';
import { useLineTemplates, useLineTemplateMutations } from '@/lib/api/endpoints/lineTemplates';
import type { LineTemplate, LineTemplateLine } from '@/lib/api/endpoints/lineTemplates';
import type { ProductType, Tva, Unit } from '@/lib/api/core/types';

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
  lineMode: 'table' | 'card';
  setLineMode: React.Dispatch<React.SetStateAction<'table' | 'card'>>;
  lineWarnings: Map<number, ComputeLineWarning[]>;
  stockData: Record<number, number>;
  addLine: () => void;
  addLineWithProduct: (productId: string, unitPrice?: number, tvaRate?: number) => void;
  removeLine: (idx: number) => void;
  duplicateLine: (idx: number) => void;
  moveLine: (fromIdx: number, toIdx: number) => void;
  updateLine: (idx: number, patch: Partial<LineItem>, product?: unknown) => void;
  onRefreshStock?: () => void;
  lineErr: string;
  savedDraft: Record<string, unknown> | null;
  draftKey: string;
  restoreDraft: () => Record<string, unknown> | null;
  /** محو المسودة من التخزين (يعيد قراءة مؤشر المسودة في الشريط العلوي). */
  onDiscardDraft?: () => void;
  set: (field: string, value: unknown) => void;
  needsParty: boolean;
  setShowBulkImport: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * فتح كاميرا «تصوير فاتورة المورد» (تعبئة OCR) — يُمرَّر فقط لمستندات الشراء.
   */
  onOcrInvoice?: () => void;
  /** فتح منتقي صور الجهاز لإرسال صورة فاتورة موجودة مباشرة إلى OCR (بدون كاميرا). */
  onOcrImage?: () => void;
  /** ملء الأسطر من آخر فاتورة لنفس المتعامل (Task 14). */
  fillFromLastDoc?: () => Promise<void>;
  fillLastLoading?: boolean;
  slug: string | null | undefined;
  warehouses: Array<{ id: number; name: string }>;
  /** وضع الحاسب المحمول — يضغط عروض أعمدة الجدول ليتسع على شاشات 1366px. */
  compact?: boolean;
  /** إخفاء شريط المسح (حقل الباركود + كاميرا + مسح متسلسل) — لمطابقة POS Pro في المحرر. */
  hideScanBar?: boolean;
  onQuickCreate?: (payload: QuickCreatePayload) => void;
  productTypes?: ProductType[];
  tvas?: Tva[];
  units?: Unit[];
  bulkAddLines?: (lines: Array<{ product_id?: string; description?: string; unit_price_ht?: number; quantity?: number; tva_rate?: number; line_note?: string }>) => void;
  /** طريقة عرض الأسعار (HT/TTC) — تُمرَّر لقراءات العرض فقط (منتقي المنتج + سعر بعد الخصم). */
  priceDisplayMode?: 'ht' | 'ttc';
}

export default function DocumentLinesSection({
  lines, isLinesReadOnly, isPurchase, isPartyExempt,
  products, isLoadingProducts,
  visibleCols,
  lineMode, setLineMode,
  lineWarnings, stockData,
  addLine, addLineWithProduct, removeLine, duplicateLine, moveLine, updateLine,
  lineErr, savedDraft, draftKey, restoreDraft, set,
  setShowBulkImport, onOcrInvoice, onOcrImage, slug,
  onRefreshStock,
  warehouses, compact = false,
  onQuickCreate, productTypes, tvas, units,
  bulkAddLines, onDiscardDraft, fillFromLastDoc, fillLastLoading = false,
  hideScanBar = false,
  priceDisplayMode,
}: DocumentLinesSectionProps) {
  const resolvedPriceDisplayMode: 'ht' | 'ttc' =
    priceDisplayMode ?? getDocPref('priceDisplayMode', slug);
  const notify = useNotification();

  // ── وضع المسح المتسلسل (Task 15): يبقي حقل الباركود مركّزاً بعد كل مسحة
  //    ويضيف سطراً تلقائياً مع عدّاد — لقولبة مخزون بالباركود دون لمس الفأرة. ──
  const [scanMode, setScanMode] = useState<boolean>(() => {
    try { return localStorage.getItem(`doc_scan_mode_${slug ?? 'default'}`) === '1'; }
    catch { return false; }
  });
  const [scanCount, setScanCount] = useState(0);

  const toggleScanMode = () => {
    setScanMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(`doc_scan_mode_${slug ?? 'default'}`, next ? '1' : '0'); }
      catch {}
      return next;
    });
    setScanCount(0);
  };

  /** استدعى عند كل مسحة ناجحة: إضافة السطر + عدّاد في وضع المسح المتسلسل.
   *  التركيز يُحفظ داخل BarcodeInput نفسه (rAF) — هنا فقط نحصي. */
  const handleBarcodeFound = (productId: number) => {
    addLineWithProduct(String(productId));
    if (scanMode) setScanCount((n) => n + 1);
  };

  // ── سحب/إسقاط لإعادة ترتيب الأسطر ───────────────────────────────────────
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleRowDragStart = useCallback((fromIdx: number, e: React.DragEvent) => {
    if (isLinesReadOnly) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(fromIdx));
    setDragIdx(fromIdx);
  }, [isLinesReadOnly]);

  const handleRowDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleRowDragOver = useCallback((overIdx: number, _e?: React.DragEvent) => {
    if (dragIdx === null || dragIdx === overIdx) return;
    setDragOverIdx((d) => (d === overIdx ? d : overIdx));
  }, [dragIdx]);

  const handleRowDragLeave = useCallback((overIdx: number, _e?: React.DragEvent) => {
    setDragOverIdx((d) => (d === overIdx ? null : d));
  }, []);

  const handleRowDrop = useCallback((overIdx: number, _e?: React.DragEvent) => {
    if (dragIdx === null || dragIdx === overIdx || isLinesReadOnly) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    moveLine(dragIdx, overIdx);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, isLinesReadOnly, moveLine]);

  // ── تحديد أسطر جماعي ─────────────────────────────────────────────────────
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState<'percent' | 'fixed'>('percent');
  const [bulkValue, setBulkValue] = useState('');

  const toggleSelect = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIndices((prev) =>
      prev.size === lines.length ? new Set() : new Set(lines.map((_, i) => i)),
    );
  };

  const clearSelection = () => setSelectedIndices(new Set());

  const handleBulkApply = () => {
    if (selectedIndices.size === 0 || isLinesReadOnly) return;
    const val = Number(bulkValue);
    if (!Number.isFinite(val) || val < 0) {
      notify.error('أدخل قيمة صحيحة');
      return;
    }
    selectedIndices.forEach((idx) => {
      if (bulkMode === 'percent') {
        updateLine(idx, {
          discount_mode: 'percent',
          discount_percentage: Math.min(val, 100),
          discount_amount_fixed: 0,
        });
      } else {
        updateLine(idx, {
          discount_mode: 'fixed',
          discount_amount_fixed: val,
          discount_percentage: 0,
        });
      }
    });
    notify.success(`تم تطبيق الخصم على ${selectedIndices.size} سطر`);
    setBulkValue('');
    clearSelection();
  };

  // ── قوالب الأسطر ──────────────────────────────────────────────────────────
  const { data: templates, isLoading: isLoadingTemplates } = useLineTemplates();
  const templateMut = useLineTemplateMutations();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateModalMode, setTemplateModalMode] = useState<'save' | 'load'>('save');
  const saveTemplateDisabled = !templateName.trim() || !lines.length || templateMut.create.isPending;

  const handleSaveTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    const payload: LineTemplateLine[] = lines.map((l) => ({
      product_id:            l.product_id,
      description:           l.description,
      quantity:              l.quantity,
      unit_price_ht:         l.unit_price_ht,
      discount_percentage:   l.discount_percentage,
      discount_amount_fixed: l.discount_amount_fixed || 0,
      tva_rate:              l.tva_rate,
      packaging_id:          l.packaging_id || '',
      line_note:             l.line_note || '',
      _packQty:              l._packQty || 1,
    }));
    try {
      await templateMut.create.mutateAsync({ name, lines: payload });
      notify.success(`تم حفظ القالب «${name}»`);
      setShowTemplateModal(false);
      setTemplateName('');
    } catch {
      notify.error('فشل حفظ القالب');
    }
  };

  const handleLoadTemplate = (tpl: LineTemplate) => {
    if (!bulkAddLines) return;
    bulkAddLines(tpl.lines);
    notify.success(`تم تحميل القالب «${tpl.name}»`);
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = async (tpl: LineTemplate) => {
    try {
      await templateMut.remove.mutateAsync(tpl.id);
      notify.success(`تم حذف القالب «${tpl.name}»`);
    } catch {
      notify.error('فشل حذف القالب');
    }
  };

  const openSaveModal = () => {
    setTemplateModalMode('save');
    setTemplateName('');
    setShowTemplateModal(true);
  };

  const openLoadModal = () => {
    setTemplateModalMode('load');
    setShowTemplateModal(true);
  };

  // ── مسح الباركود بالكاميرا: إضافة المنتج الممسوح كسطر مباشرة ──────────────
  const scanner = useBarcodeScan<{ id: number; name: string; ref?: string | null; barcode?: string | null }>({
    resolve: (code) =>
      products.find(
        (p) => p.barcode === code || p.ref === code || String(p.id) === code,
      ) ?? null,
    onFound: (p) => handleBarcodeFound(Number(p.id)),
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

  // ═══ شريط ملخص التحذيرات — سطر واحد فوق الأسطر؛ نقرة = قفز إلى أول/تالي سطر مُعلَّم ═══
  // يجمع فهارس الأسطر التي تحمل على الأقل تحذيراً غير info (مخزون/تسعير/هامش/تقيد).
  const flaggedIdx = useMemo<number[]>(() => {
    const out: number[] = [];
    lineWarnings.forEach((warns, idx) => {
      if (warns.some((w) => w.level !== 'info')) out.push(idx);
    });
    return out.sort((a, b) => a - b);
  }, [lineWarnings]);

  const [warnJump, setWarnJump] = useState(0);

  const scrollToNextFlagged = () => {
    if (flaggedIdx.length === 0 || !linesContainerRef.current) return;
    const target = flaggedIdx[warnJump % flaggedIdx.length];
    setWarnJump((n) => n + 1);
    const el = linesContainerRef.current.querySelector<HTMLElement>(
      `tr[data-line-idx="${target}"], [data-line-idx="${target}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.style.outline = '2px solid var(--orange)';
      el.style.outlineOffset = '2px';
      window.setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 1400);
    }
  };

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

    // ── Ctrl+Z: التراجع عن آخر إضافة/حذف سطر (Undo) ──────────────────────
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
      // نسمح للمتصفح بالتعامل مع Ctrl+Z داخل حقول النص (document undo).
      // فقط ن travailler门外 when focus is on a non-text element or no text is selected.
      const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (isTextInput && (target.selectionStart !== null && target.selectionStart !== target.selectionEnd)) {
        return; // allow browser undo within text selection
      }
    }

    // ── F5: تحديث بيانات المخزون ──────────────────────────────────────────
    if (e.key === 'F5' && !e.ctrlKey && !e.altKey && !e.shiftKey && onRefreshStock) {
      e.preventDefault();
      onRefreshStock();
      return;
    }

    // ── Alt+↑/↓: تحريك السطر لأعلى/أسفل (إعادة ترتيب) ────────────────────
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !isLinesReadOnly) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const row = target.closest('[data-line-idx]');
        if (row && container?.contains(row)) {
          e.preventDefault();
          const fromIdx = Number(row.getAttribute('data-line-idx'));
          const dir = e.key === 'ArrowUp' ? -1 : 1;
          const toIdx = fromIdx + dir;
          if (toIdx >= 0 && toIdx < lines.length) {
            moveLine(fromIdx, toIdx);
            // ركّز الحقل المماثل في السطر الجديد بعد التحديث
            setTimeout(() => {
              const targetRow = container.querySelector(`tr[data-line-idx="${toIdx}"], [data-line-idx="${toIdx}"]`);
              if (targetRow) {
                const cell = target.closest('td, [class*="cell"]');
                if (cell) {
                  const colIdx = Array.from((target.closest('tr[data-line-idx]') ?? targetRow).children).indexOf(cell);
                  const nextRow = container.querySelector<HTMLElement>(`tr[data-line-idx="${toIdx}"]`);
                  if (nextRow && colIdx >= 0) {
                    const nextCell = nextRow.children[colIdx] as HTMLElement | undefined;
                    const field = nextCell?.querySelector<HTMLElement>(FOCUSABLE);
                    (field ?? nextCell)?.focus();
                  }
                } else {
                  const field = targetRow.querySelector<HTMLElement>(FOCUSABLE);
                  field?.focus();
                }
              }
            }, 50);
          }
          return;
        }
      }
    }

    // ── Ctrl+Shift+↑/↓: القفز لأول/آخر سطر ───────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !isLinesReadOnly) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const row = target.closest('[data-line-idx]');
        if (row && container?.contains(row)) {
          e.preventDefault();
          const rows = container.querySelectorAll<HTMLElement>('tr[data-line-idx]');
          if (rows.length === 0) return;
          const targetRow = e.key === 'ArrowUp' ? rows[0] : rows[rows.length - 1];
          const field = targetRow.querySelector<HTMLElement>(FOCUSABLE);
          (field ?? targetRow).focus();
          return;
        }
      }
    }

    // ── Delete (خارج حقل نص): حذف السطر المُركَّز ────────────────────────
    if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !isLinesReadOnly) {
      const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (!isTextInput) {
        const row = target.closest('[data-line-idx]');
        if (row && container?.contains(row)) {
          e.preventDefault();
          const idx = Number(row.getAttribute('data-line-idx'));
          removeLine(idx);
          return;
        }
      }
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

    // Ctrl+Enter: إضافة سطر جديد في النهاية وتركيز منتقي المنتج
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLinesReadOnly) {
      e.preventDefault();
      addLineAndFocusNewRow();
      return;
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
      if (getDocLinePref('skipAmountField') && !isLinesReadOnly) {
        // «تجاوز حقل المبلغ»: Enter على الكمية يضيف سطراً جديداً مباشرة
        addLineAndFocusNewRow();
        return;
      }
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {lineErr && <AlertBanner type="error" message={lineErr} />}

        {!isLinesReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
            {!hideScanBar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarcodeInput
                products={products}
                onProductFound={handleBarcodeFound}
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
              <button
                onClick={toggleScanMode}
                title={scanMode
                  ? 'وضع المسح المتسلسل مفعّل — أطفئه لإيقاف القولبة المتتابعة'
                  : 'وضع المسح المتسلسل: يبقي حقل الباركود مركّزاً ويضيف سطراً بعد كل مسحة'}
                style={{
                  height: 32, flexShrink: 0, borderRadius: 'var(--r1)',
                  border: `1px solid ${scanMode ? 'var(--em)' : 'var(--b3)'}`,
                  background: scanMode ? 'color-mix(in srgb, var(--em) 14%, transparent)' : 'transparent',
                  color: scanMode ? 'var(--em)' : 'var(--t3)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  padding: '0 9px', fontSize: 11, fontFamily: 'inherit', lineHeight: 1,
                }}
              >
                <i className={`ti ${scanMode ? 'ti-scan' : 'ti-barcode'}`} style={{ fontSize: 14 }} />
                مسح متسلسل
                {scanMode && (
                  <span
                    style={{
                      minWidth: 18, height: 16, borderRadius: 8, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                      background: 'var(--em)', color: '#fff', fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {scanCount}
                  </span>
                )}
              </button>
              {scanMode && scanCount > 0 && (
                <button
                  onClick={() => setScanCount(0)}
                  title="تصفير العدّاد"
                  style={{
                    height: 32, flexShrink: 0, borderRadius: 'var(--r1)',
                    border: '1px solid var(--b3)', background: 'transparent',
                    color: 'var(--t4)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', width: 28,
                  }}
                >
                  <i className="ti ti-rotate-clockwise-2" style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                title="Enter: كمية ← سعر ← السطر التالي · Alt+N: سطر جديد · ↑/↓: نفس العمود · Ctrl+D: تكرار · Ctrl+Delete: حذف · Alt+↑↓: ترتيب · Ctrl+Enter: سطر في النهاية · F5: تحديث المخزون · Esc: ترك الحقل"
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

        {flaggedIdx.length > 0 && (
          <button
            type="button"
            onClick={scrollToNextFlagged}
            title={`اضغط للانتقال إلى ${flaggedIdx.length > 1 ? 'التحذير التالي' : 'السطر المعلَّم'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              marginBottom: 6, padding: '6px 12px', cursor: 'pointer',
              borderRadius: 'var(--r1)', textAlign: 'right', fontFamily: 'inherit',
              background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--orange) 28%, transparent)',
              color: 'var(--orange)', fontSize: 11.5, fontWeight: 600,
            }}
          >
            <i className="ti ti-alert-triangle" style={{ fontSize: 15, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ⚠ {flaggedIdx.length} عناصر تحتاج مراجعة (مخزون / تسعير / هامش)
            </span>
            <i className="ti ti-arrow-down" style={{ fontSize: 13, flexShrink: 0 }} />
          </button>
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
                        try { localStorage.removeItem(draftKey); onDiscardDraft?.(); } catch {}
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
                    onClick={() => { try { localStorage.removeItem(draftKey); onDiscardDraft?.(); } catch {} }}
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 10, alignItems: 'start',
            }}>
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
                    onQuickCreate={onQuickCreate}
                    productTypes={productTypes}
                    tvas={tvas}
                    units={units}
                    isLoadingProducts={isLoadingProducts}
                    selected={selectedIndices.has(idx)}
                    onToggleSelect={toggleSelect}
                    onRowDragStart={isLinesReadOnly ? undefined : handleRowDragStart}
                    onRowDragEnd={handleRowDragEnd}
                    onRowDragOver={handleRowDragOver}
                    onRowDragLeave={handleRowDragLeave}
                    onRowDrop={handleRowDrop}
                    isDragSource={dragIdx === idx}
                    isDropTarget={dragOverIdx === idx}
                    priceDisplayMode={resolvedPriceDisplayMode}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 11.5 : 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b2)' }}>
                    {!isLinesReadOnly && (
                      <th style={{ padding: '4px 6px', textAlign: 'center', width: 28 }} />
                    )}
                    <th style={{ padding: '4px 6px', textAlign: 'center', width: 32 }}>
                      <input
                        type="checkbox"
                        checked={lines.length > 0 && selectedIndices.size === lines.length}
                        ref={(el) => { if (el) el.indeterminate = selectedIndices.size > 0 && selectedIndices.size < lines.length; }}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: 'var(--em)' }}
                      />
                    </th>
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
                        onQuickCreate={onQuickCreate}
                        productTypes={productTypes}
                        tvas={tvas}
                        units={units}
                        isLoadingProducts={isLoadingProducts}
                        selected={selectedIndices.has(idx)}
                        onToggleSelect={toggleSelect}
                        onRowDragStart={isLinesReadOnly ? undefined : handleRowDragStart}
                        onRowDragEnd={handleRowDragEnd}
                        onRowDragOver={handleRowDragOver}
                        onRowDragLeave={handleRowDragLeave}
                        onRowDrop={handleRowDrop}
                        isDragSource={dragIdx === idx}
                        isDropTarget={dragOverIdx === idx}
                        priceDisplayMode={resolvedPriceDisplayMode}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedIndices.size > 0 && !isLinesReadOnly && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            margin: '8px 0', borderRadius: 'var(--r2)',
            background: 'color-mix(in srgb, var(--em) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--em) 20%, transparent)',
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
              <i className="ti ti-checklist" style={{ marginLeft: 4 }} />
              {selectedIndices.size} سطر محدد
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg1)', borderRadius: 'var(--r1)', border: '1px solid var(--b2)' }}>
              <button
                onClick={() => setBulkMode('percent')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer',
                  background: bulkMode === 'percent' ? 'var(--em)' : 'transparent',
                  color: bulkMode === 'percent' ? '#fff' : 'var(--t3)',
                }}
              >%</button>
              <button
                onClick={() => setBulkMode('fixed')}
                style={{
                  padding: '4px 8px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer',
                  background: bulkMode === 'fixed' ? 'var(--em)' : 'transparent',
                  color: bulkMode === 'fixed' ? '#fff' : 'var(--t3)',
                }}
              >دج</button>
            </div>
            <input
              type="number"
              min={0}
              max={bulkMode === 'percent' ? 100 : undefined}
              step={bulkMode === 'percent' ? 0.5 : 1}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkMode === 'percent' ? 'نسبة الخصم %' : 'مبلغ الخصم (دج)'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBulkApply(); }}
              style={{
                width: 120, padding: '5px 8px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', fontSize: 12,
              }}
            />
            <button
              onClick={handleBulkApply}
              disabled={!bulkValue}
              className="btn btn-p"
              style={{ padding: '5px 12px', fontSize: 11.5, opacity: bulkValue ? 1 : 0.5, cursor: bulkValue ? 'pointer' : 'default' }}
            >
              <i className="ti ti-check" style={{ marginLeft: 4 }} />
              تطبيق على المحدد
            </button>
            <button
              onClick={clearSelection}
              style={{
                padding: '5px 10px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'transparent',
                color: 'var(--t3)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              }}
            >
              <i className="ti ti-x" style={{ marginLeft: 2 }} />
              إلغاء التحديد
            </button>
          </div>
        )}

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
            {fillFromLastDoc && (
              <button
                onClick={() => { void fillFromLastDoc(); }}
                disabled={fillLastLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: fillLastLoading ? 'default' : 'pointer',
                  fontSize: 12.5, fontWeight: 600, opacity: fillLastLoading ? 0.6 : 1,
                }}
                title="إضافة أسطر من آخر فاتورة/مستند لنفس المتعامل"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className={`ti ${fillLastLoading ? 'ti-loader' : 'ti-history'}`} />
                {fillLastLoading ? 'يجري الملء…' : 'ملء من آخر مستند'}
              </button>
            )}
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
            {!isLinesReadOnly && (
              <>
                <button
                  onClick={openLoadModal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 'var(--r2)',
                    border: '1px dashed var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  <i className="ti ti-template" />
                  تحميل قالب
                </button>
                {lines.length > 0 && (
                  <button
                    onClick={openSaveModal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 'var(--r2)',
                      border: '1px dashed var(--b3)', background: 'transparent',
                      color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
                  >
                    <i className="ti ti-bookmark" />
                    حفظ كقالب
                  </button>
                )}
              </>
            )}
          </div>
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

      {/* ═══ قالب الأسطر — حفظ / تحميل ═══ */}
      {showTemplateModal && (
        <div className="ov" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTemplateModal(false); }}>
          <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r3)', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--b2)' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>
                {templateModalMode === 'save' ? 'حفظ الأسطر كقالب' : 'تحميل قالب'}
              </h3>
              <button onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t3)', padding: 4 }}>
                <i className="ti ti-x" />
              </button>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {templateModalMode === 'save' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
                    اسم القالب
                  </label>
                  <input
                    autoFocus
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !saveTemplateDisabled) handleSaveTemplate(); }}
                    placeholder="مثال: منتجات مكتبية، طلبات شهرية…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>
                    سيتم حفظ {lines.length} سطر/سطور في القالب.
                  </div>
                </div>
              ) : (
                <div>
                  {isLoadingTemplates ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>جاري التحميل…</div>
                  ) : !templates?.length ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>
                      <i className="ti ti-template-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.4 }} />
                      لا توجد قوالب محفوظة بعد
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {templates.map((tpl) => (
                        <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', cursor: 'pointer', transition: 'border-color .15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b2)'; }}>
                          <div onClick={() => handleLoadTemplate(tpl)} style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{tpl.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 2 }}>
                              {tpl.lines.length} سطر · {new Date(tpl.created_at).toLocaleDateString('ar-DZ')}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl); }}
                            title="حذف القالب"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, fontSize: 14 }}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Footer */}
            {templateModalMode === 'save' && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'flex-start', gap: 8 }}>
                <button onClick={handleSaveTemplate} disabled={saveTemplateDisabled}
                  className="btn btn-p"
                  style={{ opacity: saveTemplateDisabled ? 0.5 : 1, cursor: saveTemplateDisabled ? 'default' : 'pointer' }}>
                  {templateMut.create.isPending ? 'جاري الحفظ…' : 'حفظ القالب'}
                </button>
                <button onClick={() => setShowTemplateModal(false)} className="btn btn-b">إلغاء</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
