import { useEffect } from 'react';
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
  /** وضع الحاسب المحمول — حشوات مضغوطة. */
  compact?: boolean;
  /** مؤشر مسودة تلقائي — آخر لحظة كُتبت المسودة (مستند جديد فقط). */
  draftSavedAt?: number | null;
  /** حفظ المسودة الآن يدوياً. */
  onSaveDraft?: () => void;
  /** تجاهل/حذف المسودة المحفوظة. */
  onDiscardDraft?: () => void;
  /** إخفاء زر الحفظ (عندما يُنقل إلى شريط الإجراءات الجانبي). */
  hideSave?: boolean;
}

export default function DocumentTopbar({
  documentType, isEdit, isCancelled, isLocked, isValidated, isPurchase,
  docCode, docNumber, existingDocument, pmMode, stockBadge,
  onBack, isPending, successMsg, isReadOnly, handleSave,
  compact = false,
  draftSavedAt = null, onSaveDraft, onDiscardDraft,
  hideSave = false,
}: DocumentTopbarProps) {

  const canDismiss = !isPending && !successMsg;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canDismiss, onBack]);

  const statusPill = isCancelled
    ? { label: 'ملغى', bg: 'var(--redb)', color: 'var(--red)', icon: 'ti-ban' }
    : isLocked
    ? { label: 'مقفل', bg: 'var(--bg3)', color: 'var(--t3)', icon: 'ti-lock' }
    : isValidated
    ? { label: 'معتمد', bg: 'var(--blueb)', color: 'var(--blue)', icon: 'ti-shield-check' }
    : null;

  return (
    <div style={{
      flexShrink: 0, height: compact ? 50 : 58, padding: compact ? '0 12px' : '0 20px',
      display: 'flex', alignItems: 'center', gap: compact ? 8 : 14,
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
          {isEdit && !!existingDocument?.document_number && (
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
          {!isEdit && draftSavedAt && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--r1)',
              background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
              border: `1px solid var(--orange)`,
              fontSize: 10.5, fontWeight: 700, color: 'var(--orange)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="ti ti-device-floppy" style={{ fontSize: 10 }} />
              مسودة محفوظة
              <span style={{ fontWeight: 500, opacity: 0.85 }}>
                {new Date(draftSavedAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  title="حفظ المسودة الآن"
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--orange)',
                    cursor: 'pointer', padding: 0, display: 'inline-flex', fontFamily: 'inherit',
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 11 }} />
                </button>
              )}
              {onDiscardDraft && (
                <button
                  onClick={onDiscardDraft}
                  title="تجاهل المسودة"
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--orange)',
                    cursor: 'pointer', padding: 0, display: 'inline-flex', fontFamily: 'inherit',
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 11 }} />
                </button>
              )}
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
        <button
          onClick={onBack}
          disabled={!canDismiss}
          style={{
            padding: compact ? '8px 12px' : '8px 18px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t2)',
            cursor: canDismiss ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
          }}
        >
          {isReadOnly ? 'إغلاق' : 'إلغاء'}
        </button>

        {!hideSave && !isReadOnly && (
          <button
            onClick={handleSave}
            disabled={!canDismiss}
            style={{
              padding: compact ? '8px 14px' : '8px 22px', borderRadius: 'var(--r2)', border: 'none',
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
