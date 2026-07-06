import React from 'react';
import type { DocumentTotals } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';

interface DocumentFooterProps {
  form: {
    lines: Array<unknown>;
  };
  totals: DocumentTotals;
  payments: Array<unknown>;
  pmMode: string;
  isEdit: boolean;
  isReadOnly: boolean;
  isCancelled: boolean;
  isPending: boolean;
  successMsg: string;
  docCode: string;
  RETURNABLE_CODES: Set<string>;
  handleDelete: () => void;
  handleExport: (format: 'excel' | 'pdf' | 'json' | 'xml') => void;
  onClose: () => void;
  handleSave: () => void;
  onPrint?: () => void;
  templates?: Array<{ id: number | null; name: string }>;
  selectedTemplateId?: number | null;
  onTemplateChange?: (id: number | null) => void;
  onReturnClick?: () => void;
}

export default function DocumentFooter({
  form, totals, payments,
  pmMode, isEdit, isReadOnly, isCancelled, isPending,
  successMsg, docCode,   RETURNABLE_CODES,
  handleDelete, handleExport,
  onClose, handleSave,
  onPrint, templates, selectedTemplateId, onTemplateChange,
  onReturnClick,
}: DocumentFooterProps) {
  return (
    <div style={{
      padding: '12px 20px', borderTop: '1px solid var(--b1)',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
      display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
      borderRadius: '0 0 var(--r3) var(--r3)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {form.lines.length > 0 && (
          <>
            <span>{form.lines.length} سطر</span>
            <span>·</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>
              {fmtDZD(totals.netToPay)} دج
            </span>
          </>
        )}
        {totals.remaining > 0.01 && payments.length > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>
              متبقي {fmtDZD(totals.remaining)} دج
            </span>
          </>
        )}
        {pmMode === 'additive' && payments.length > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>
              {payments.length} دفعة
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && (
          <button
            onClick={onReturnClick}
            disabled={isPending}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r2)',
              border: '1px solid var(--purple)',
              background: 'color-mix(in srgb, var(--purple) 10%, transparent)',
              color: 'var(--purple)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-receipt-refund" />
            إنشاء مرتجع
          </button>
        )}
        {isEdit && !isReadOnly && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="حذف المستند"
            style={{
              padding: '8px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--red)', background: 'var(--redb)',
              color: 'var(--red)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-trash" />
            حذف
          </button>
        )}

        {isEdit && onPrint && (
          <>
            {(templates && templates.length > 1) && (
              <select
                value={selectedTemplateId ?? ''}
                onChange={e => onTemplateChange?.(e.target.value ? Number(e.target.value) : null)}
                style={{
                  padding: '6px 8px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  fontSize: 12, color: 'var(--t2)', outline: 'none', cursor: 'pointer',
                  maxWidth: 120,
                }}
              >
                <option value="">القالب الافتراضي</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id ?? ''}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={onPrint}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r2)',
                border: '1px solid var(--em)', background: 'color-mix(in srgb, var(--em) 12%, transparent)',
                color: 'var(--em)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="ti ti-printer" />
              طباعة بالقوالب
            </button>
          </>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const menu = document.getElementById('export-menu');
              if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t2)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-download" />
            تصدير
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>
          <div id="export-menu" style={{
            display: 'none', position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
            flexDirection: 'column', gap: 2,
            background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
            padding: 4, zIndex: 100, minWidth: 140,
          }}>
            {[
              { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' as const },
              { label: 'PDF', icon: 'ti-file-type-pdf', format: 'pdf' as const },
              { label: 'JSON', icon: 'ti-file-code', format: 'json' as const },
              { label: 'XML', icon: 'ti-file-code-2', format: 'xml' as const },
            ].map(opt => (
              <button key={opt.format}
                onClick={() => {
                  document.getElementById('export-menu')!.style.display = 'none';
                  handleExport(opt.format);
                }}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--r2)',
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className={`ti ${opt.icon}`} style={{ fontSize: 15 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={isPending || !!successMsg}
          style={{
            padding: '8px 18px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            color: 'var(--t2)',
            cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {isReadOnly ? 'إغلاق' : 'إلغاء'}
        </button>

        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={isPending || !!successMsg}
            style={{
              padding: '8px 24px', borderRadius: 'var(--r2)',
              border: 'none',
              background: successMsg ? 'var(--green)' : 'var(--em)',
              color: 'white',
              cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: isPending ? 0.7 : 1, transition: 'background .2s',
            }}
          >
            {isPending ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري الحفظ...
              </>
            ) : successMsg ? (
              <>
                <i className="ti ti-check" />
                تم الحفظ
              </>
            ) : (
              <>
                <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
                {pmMode === 'additive'
                  ? 'حفظ الدفعات الجديدة'
                  : isEdit ? 'تحديث المستند' : 'حفظ المستند'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
