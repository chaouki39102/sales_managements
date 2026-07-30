import type { DocumentType } from '@/lib/api/core/types';

interface DocumentHeaderSectionProps {
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
  onClose: () => void;
  isPending: boolean;
}

export default function DocumentHeaderSection({
  documentType, isEdit, isCancelled, isLocked, isValidated,
  isPurchase, docCode, docNumber, existingDocument,
  pmMode, stockBadge, onClose, isPending,
}: DocumentHeaderSectionProps) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--b1)',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
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
            style={{
              fontSize: 18,
              color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)',
            }}
          />
        </div>

        <div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: 'var(--t1)',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            {isEdit ? `تعديل ${documentType?.name}` : `مستند جديد: ${documentType?.name}`}

            {isEdit && !!existingDocument?.document_number && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                {docNumber || String(existingDocument.document_number)}
              </span>
            )}

            {isCancelled && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--redb)', border: '1px solid var(--red)',
                fontSize: 11, fontWeight: 700, color: 'var(--red)',
              }}>ملغى</span>
            )}
            {isLocked && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                fontSize: 11, fontWeight: 700, color: 'var(--t3)',
              }}>
                <i className="ti ti-lock" style={{ marginLeft: 4, fontSize: 10 }} />
                مقفل
              </span>
            )}
            {isValidated && !isCancelled && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--blueb)', border: '1px solid var(--blue)',
                fontSize: 11, fontWeight: 700, color: 'var(--blue)',
              }}>معتمد</span>
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
                fontSize: 11, fontWeight: 700,
                background: stockBadge.bg, color: stockBadge.color,
              }}>
                {stockBadge.text}
              </span>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
            {documentType?.name} — {docCode}
            {!isEdit && <span style={{ marginRight: 8 }}>· رقم الوثيقة يُولَّد تلقائياً</span>}
            {isCancelled && <span style={{ marginRight: 8, color: 'var(--red)' }}>· لا يمكن تعديل مستند ملغى</span>}
            {isLocked && !isCancelled && <span style={{ marginRight: 8, color: 'var(--t4)' }}>· مقفل — فك القفل للتعديل</span>}
            {pmMode === 'additive' && !isLocked && (
              <span style={{ marginRight: 8, color: 'var(--orange)' }}>
                · الأسطر للقراءة — يمكن إضافة دفعات جديدة فقط
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        disabled={isPending}
        style={{
          width: 28, height: 28, borderRadius: 8,
          border: '1px solid var(--b2)', background: 'var(--bg1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isPending ? 'not-allowed' : 'pointer', color: 'var(--t3)',
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}
