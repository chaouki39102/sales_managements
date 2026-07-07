import React, { useEffect, useRef, useState } from 'react';
import type { DocumentType } from '@/lib/api/core/types';

interface DocumentTopbarProps {
  documentType: DocumentType | null;
  isEdit: boolean;
  isCancelled: boolean;
  isLocked: boolean;
  isValidated: boolean;
  isPurchase: boolean;
  docCode: string;
  docNumber: string;
  existingDocument?: Record<string, unknown>;
  pmMode: string;
  stockBadge: { text: string; bg: string; color: string } | null;
  onBack: () => void;
  isPending: boolean;
  successMsg: string;
  isReadOnly: boolean;
  handleSave: () => void;
  onPrint?: () => void;
  templates?: Array<{ id: number | null; name: string }>;
  selectedTemplateId?: number | null;
  onTemplateChange?: (id: number | null) => void;
  handleExport: (format: 'excel' | 'pdf' | 'json' | 'xml') => void;
  handleDelete: () => void;
  onReturnClick?: () => void;
  RETURNABLE_CODES: Set<string>;
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

export default function DocumentTopbar({
  documentType, isEdit, isCancelled, isLocked, isValidated, isPurchase,
  docCode, docNumber, existingDocument, pmMode, stockBadge,
  onBack, isPending, successMsg, isReadOnly, handleSave,
  onPrint, templates, selectedTemplateId, onTemplateChange,
  handleExport, handleDelete, onReturnClick, RETURNABLE_CODES,
}: DocumentTopbarProps) {

  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const exportRef = useDismissibleMenu<HTMLDivElement>(exportOpen, () => setExportOpen(false));
  const moreRef = useDismissibleMenu<HTMLDivElement>(moreOpen, () => setMoreOpen(false));

  const canDismiss = !isPending && !successMsg;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss && !exportOpen && !moreOpen) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canDismiss, onBack, exportOpen, moreOpen]);

  const statusPill = isCancelled
    ? { label: 'ملغى', bg: 'var(--redb)', color: 'var(--red)', icon: 'ti-ban' }
    : isLocked
    ? { label: 'مقفل', bg: 'var(--bg3)', color: 'var(--t3)', icon: 'ti-lock' }
    : isValidated
    ? { label: 'معتمد', bg: 'var(--blueb)', color: 'var(--blue)', icon: 'ti-shield-check' }
    : null;

  const showReturn = isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && !!onReturnClick;
  const showDelete = isEdit && !isReadOnly;
  const hasMoreItems = showReturn || showDelete;

  return (
    <div style={{
      flexShrink: 0, height: 60, padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid var(--b1)',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
    }}>
      <button
        onClick={() => canDismiss && onBack()}
        disabled={!canDismiss}
        title="رجوع (Esc)"
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          border: '1px solid var(--b2)', background: 'var(--bg1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: canDismiss ? 'pointer' : 'not-allowed', color: 'var(--t3)',
        }}
      >
        <i className="ti ti-arrow-right" style={{ fontSize: 15 }} />
      </button>

      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isCancelled
          ? 'var(--redb)'
          : `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
        border: isCancelled
          ? '1px solid var(--red)'
          : `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i
          className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
          style={{ fontSize: 16, color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)' }}
        />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isEdit ? `تعديل ${documentType?.name}` : `مستند جديد: ${documentType?.name}`}
          {isEdit && existingDocument?.document_number && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--r1)',
              background: 'var(--bg1)', border: '1px solid var(--b2)',
              fontSize: 11.5, fontWeight: 700, color: 'var(--em)',
            }}>
              {docNumber || String(existingDocument.document_number)}
            </span>
          )}
          {statusPill && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--r1)',
              background: statusPill.bg, border: `1px solid ${statusPill.color}`,
              fontSize: 10.5, fontWeight: 700, color: statusPill.color,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className={`ti ${statusPill.icon}`} style={{ fontSize: 10 }} />
              {statusPill.label}
            </span>
          )}
          {pmMode === 'additive' && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--r1)',
              background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
              border: '1px solid var(--orange)',
              fontSize: 10, fontWeight: 700, color: 'var(--orange)',
            }}>
              <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 9 }} />
              دفعات إضافية فقط
            </span>
          )}
          {stockBadge && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--r1)',
              fontSize: 10.5, fontWeight: 700, background: stockBadge.bg, color: stockBadge.color,
            }}>
              {stockBadge.text}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {documentType?.name} — {docCode}
          {isCancelled && <span style={{ marginRight: 8, color: 'var(--red)' }}>· لا يمكن تعديل مستند ملغى</span>}
          {isLocked && !isCancelled && <span style={{ marginRight: 8 }}>· مقفل — فك القفل للتعديل</span>}
        </div>
      </div>

      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {onPrint && (
          <>
            {templates && templates.length > 1 && (
              <select
                value={selectedTemplateId ?? ''}
                onChange={(e) => onTemplateChange?.(e.target.value ? Number(e.target.value) : null)}
                style={{
                  padding: '6px 8px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  fontSize: 12, color: 'var(--t2)', outline: 'none', cursor: 'pointer', maxWidth: 120,
                }}
              >
                <option value="">القالب الافتراضي</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id ?? ''}>{t.name}</option>
                ))}
              </select>
            )}
            <button onClick={onPrint} style={actionBtnStyle('var(--em)')}>
              <i className="ti ti-printer" />
              طباعة
            </button>
          </>
        )}

        <div style={{ position: 'relative' }} ref={exportRef}>
          <button onClick={() => setExportOpen((v) => !v)} style={actionBtnStyle('var(--t2)', true)}>
            <i className="ti ti-download" />
            تصدير
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>
          {exportOpen && (
            <div style={menuStyle}>
              {[
                { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' as const },
                { label: 'PDF', icon: 'ti-file-type-pdf', format: 'pdf' as const },
                { label: 'JSON', icon: 'ti-file-code', format: 'json' as const },
                { label: 'XML', icon: 'ti-file-code-2', format: 'xml' as const },
              ].map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => { setExportOpen(false); handleExport(opt.format); }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--b1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <i className={`ti ${opt.icon}`} style={{ fontSize: 15 }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {hasMoreItems && (
          <div style={{ position: 'relative' }} ref={moreRef}>
            <button onClick={() => setMoreOpen((v) => !v)} disabled={isPending} style={actionBtnStyle('var(--t2)', true)}>
              <i className="ti ti-dots-vertical" />
            </button>
            {moreOpen && (
              <div style={menuStyle}>
                {showReturn && (
                  <button
                    onClick={() => { setMoreOpen(false); onReturnClick?.(); }}
                    style={{ ...menuItemStyle, color: 'var(--purple)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--b1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <i className="ti ti-receipt-refund" style={{ fontSize: 15 }} />
                    إنشاء مرتجع
                  </button>
                )}
                {showDelete && (
                  <button
                    onClick={() => { setMoreOpen(false); handleDelete(); }}
                    style={{ ...menuItemStyle, color: 'var(--red)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--redb)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 15 }} />
                    حذف
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onBack}
          disabled={!canDismiss}
          style={{
            padding: '8px 18px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t2)',
            cursor: canDismiss ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
          }}
        >
          {isReadOnly ? 'إغلاق' : 'إلغاء'}
        </button>

        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={!canDismiss}
            style={{
              padding: '8px 22px', borderRadius: 'var(--r2)', border: 'none',
              background: successMsg ? 'var(--green)' : 'var(--em)', color: 'white',
              cursor: canDismiss ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: isPending ? 0.7 : 1, transition: 'background .2s',
            }}
          >
            {isPending ? (
              <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />جاري الحفظ...</>
            ) : successMsg ? (
              <><i className="ti ti-check" />تم الحفظ</>
            ) : (
              <>
                <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
                {pmMode === 'additive' ? 'حفظ الدفعات الجديدة' : isEdit ? 'تحديث المستند' : 'حفظ المستند'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function actionBtnStyle(color: string, subtle = false): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 'var(--r2)',
    border: `1px solid ${subtle ? 'var(--b2)' : color}`,
    background: subtle ? 'var(--bg1)' : `color-mix(in srgb, ${color} 12%, transparent)`,
    color, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
  };
}

const menuStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 4,
  display: 'flex', flexDirection: 'column', gap: 2,
  background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
  padding: 4, zIndex: 100, minWidth: 150, boxShadow: 'var(--shadow2)',
};

const menuItemStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 'var(--r2)', border: 'none', background: 'transparent',
  color: 'var(--t2)', cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right', width: '100%',
};
