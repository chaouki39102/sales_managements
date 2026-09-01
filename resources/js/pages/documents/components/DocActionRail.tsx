import { useEffect, useRef, useState } from 'react';

interface DocActionRailProps {
  isEdit: boolean;
  isReadOnly: boolean;
  isPending: boolean;
  successMsg: string;
  docCode: string;
  handleSave: () => void;
  onBack: () => void;
  onPrint?: () => void;
  onPreview?: () => void;
  onPayments?: () => void;
  paymentsCount?: number;
  onExtraOptions?: () => void;
  handleExport: (format: 'excel' | 'pdf' | 'json' | 'xml') => void;
  handleDelete: () => void;
  onClone?: () => void;
  onReturnClick?: () => void;
  RETURNABLE_CODES: Set<string>;
  /** القوالب المتاحة — اختيار قالب الطباعة من الشريط عبر قائمة. */
  templates?: Array<{ id: number | null; name: string }>;
  selectedTemplateId?: number | null;
  onTemplateChange?: (id: number | null) => void;
}

function useDismissibleMenu<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onDismiss]);
  return ref;
}

export default function DocActionRail({
  isEdit, isReadOnly, isPending, successMsg, docCode,
  handleSave, onBack, onPrint, onPreview, onPayments, paymentsCount, onExtraOptions,
  handleExport, handleDelete, onClone, onReturnClick, RETURNABLE_CODES,
  templates, selectedTemplateId, onTemplateChange,
}: DocActionRailProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const exportRef = useDismissibleMenu<HTMLDivElement>(exportOpen, () => setExportOpen(false));
  const moreRef = useDismissibleMenu<HTMLDivElement>(moreOpen, () => setMoreOpen(false));
  const tplRef = useDismissibleMenu<HTMLDivElement>(tplOpen, () => setTplOpen(false));

  const canSave = !isPending && !successMsg;
  const showReturn = isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && !!onReturnClick;
  const showDelete = isEdit && !isReadOnly && !isPending;

  return (
    <aside className="pp-rail doc-rail">
      <button className="pp-rail-btn pp-rail-btn--ghost" onClick={onBack} title="رجوع (Esc)" type="button">
        <i className="ti ti-arrow-right" />
        <span>رجوع</span>
      </button>

      <div className="pp-rail-sep" />

      <button
        className="pp-rail-btn pp-rail-btn--primary"
        onClick={handleSave}
        disabled={!canSave}
        title="حفظ (F9 / Ctrl+S)"
        type="button"
      >
        <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
        <span>{successMsg ? 'تم الحفظ' : isPending ? 'حفظ...' : isEdit ? 'تحديث' : 'حفظ'}</span>
      </button>

      {onPrint && (
        <button className="pp-rail-btn" onClick={onPrint} title="طباعة (F8)" type="button">
          <i className="ti ti-printer" />
          <span>طباعة</span>
        </button>
      )}

      {onPreview && (
        <button className="pp-rail-btn" onClick={onPreview} title="معاينة الطباعة" type="button">
          <i className="ti ti-eye" />
          <span>معاينة</span>
        </button>
      )}

      <div className="doc-rail-menu-wrap" ref={exportRef}>
        <button
          className="pp-rail-btn"
          onClick={() => setExportOpen((v) => !v)}
          title="تصدير"
          type="button"
        >
          <i className="ti ti-download" />
          <span>تصدير</span>
        </button>
        {exportOpen && (
          <div className="doc-rail-menu">
            {[
              { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' as const },
              { label: 'PDF', icon: 'ti-file-type-pdf', format: 'pdf' as const },
              { label: 'JSON', icon: 'ti-file-code', format: 'json' as const },
              { label: 'XML', icon: 'ti-file-code-2', format: 'xml' as const },
            ].map((opt) => (
              <button
                key={opt.format}
                className="doc-rail-menu-item"
                onClick={() => { setExportOpen(false); handleExport(opt.format); }}
                type="button"
              >
                <i className={`ti ${opt.icon}`} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {templates && templates.length > 0 && (
        <div className="doc-rail-menu-wrap" ref={tplRef}>
          <button
            className="pp-rail-btn"
            onClick={() => setTplOpen((v) => !v)}
            title="قالب الطباعة"
            type="button"
          >
            <i className="ti ti-file-text" />
            <span>قالب</span>
          </button>
          {tplOpen && (
            <div className="doc-rail-menu doc-rail-menu--tpl">
              <button
                className="doc-rail-menu-item"
                onClick={() => { setTplOpen(false); onTemplateChange?.(null); }}
                type="button"
              >
                القالب الافتراضي
              </button>
              {templates.map((t) => (
                <button
                  key={t.id}
                  className={`doc-rail-menu-item${selectedTemplateId === t.id ? ' on' : ''}`}
                  onClick={() => { setTplOpen(false); onTemplateChange?.(t.id); }}
                  type="button"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {onPayments && (
        <button
          className="pp-rail-btn pp-rail-btn--pay pp-rail-btn--badge"
          onClick={onPayments}
          title="الدفعات"
          type="button"
        >
          <i className="ti ti-wallet" />
          <span>دفعات</span>
          {!!paymentsCount && (
            <em className="pp-rail-badge">{paymentsCount}</em>
          )}
        </button>
      )}

      {onExtraOptions && (
        <button
          className="pp-rail-btn"
          onClick={onExtraOptions}
          title="خيارات إضافية"
          disabled={isPending}
          type="button"
        >
          <i className="ti ti-adjustments" />
          <span>خيارات</span>
        </button>
      )}

      {(showReturn || showDelete || (isEdit && onClone)) && (
        <div className="doc-rail-menu-wrap" ref={moreRef}>
          <button
            className="pp-rail-btn pp-rail-btn--ghost"
            onClick={() => setMoreOpen((v) => !v)}
            disabled={isPending}
            title="المزيد"
            type="button"
          >
            <i className="ti ti-dots-vertical" />
            <span>المزيد</span>
          </button>
          {moreOpen && (
            <div className="doc-rail-menu">
              {showReturn && (
                <button
                  className="doc-rail-menu-item"
                  onClick={() => { setMoreOpen(false); onReturnClick?.(); }}
                  type="button"
                >
                  <i className="ti ti-receipt-refund" />
                  إنشاء مرتجع
                </button>
              )}
              {isEdit && !!onClone && (
                <button
                  className="doc-rail-menu-item"
                  onClick={() => { setMoreOpen(false); onClone(); }}
                  type="button"
                >
                  <i className="ti ti-copy" />
                  نسخ كمستند جديد
                </button>
              )}
              {showDelete && (
                <button
                  className="doc-rail-menu-item danger"
                  onClick={() => { setMoreOpen(false); handleDelete(); }}
                  type="button"
                >
                  <i className="ti ti-trash" />
                  حذف
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
