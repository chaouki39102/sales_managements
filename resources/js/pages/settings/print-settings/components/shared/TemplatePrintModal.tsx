import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import UniversalPrintPipeline, { renderPipelineToPopup } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';

// ─── ApiDocument ────────────────────────────────────────────────────────────
// Minimal shape expected by DocumentDataBuilder.fromApiDocument().
// Consumers pass their full CommercialDocument — extra fields are ignored.

interface ApiDocument {
  id?:                   number;
  document_number?:      string;
  document_date?:        string;
  due_date?:             string | null;
  notes?:                string | null;
  document_type?:        { code?: string; name?: string } | null;
  document_status?:      { name?: string; code?: string } | null;
  party?:                Record<string, unknown> | null;
  warehouse?:            Record<string, unknown> | null;
  currency?:             { code?: string; symbol?: string; exchange_rate?: number } | null;
  lines?:                Record<string, unknown>[];
  payments?:             Record<string, unknown>[];
  totals?:               Record<string, unknown> | null;
  /** Flat totals from backend (SSOT) */
  total_ht?:             number;
  total_tva?:            number;
  total_ttc?:            number;
  total_discount?:       number;
  total_stamp?:          number;
  net_to_pay?:           number;
  paid_amount?:          number;
  remaining_amount?:     number;
  /** Balance computed by backend */
  balance_data?: {
    previous_balance: number;
    new_balance:      number;
  } | null;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TemplatePrintModalProps {
  open:        boolean;
  onClose:     () => void;
  document?:   ApiDocument;
  company:     CompanyData;
  templates?:  PrintTemplate[];
  template?:   PrintTemplate;
  docTypeCode: string;
  /** Pre-built data (bypasses fromApiDocument when provided) */
  data?:       UniversalDocumentData;
  /** Fallback balance when document.balance_data is absent (e.g., from list endpoint) */
  prevBalance?: number;
  newBalance?:  number;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: '90vw',
  maxWidth: 900,
  maxHeight: '90vh',
  background: 'var(--bg1)',
  borderRadius: 8,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--b2)',
};

const previewAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 16,
  display: 'flex',
  justifyContent: 'center',
  background: 'var(--bg3)',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '12px 16px',
  borderTop: '1px solid var(--b2)',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--em)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 20px',
  border: '1px solid var(--b2)',
  borderRadius: 6,
  background: 'var(--bg1)',
  color: 'var(--t2)',
  fontSize: 14,
  cursor: 'pointer',
};

// ─── Component ──────────────────────────────────────────────────────────────

function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData, prevBalance, newBalance }: TemplatePrintModalProps) {
  const navigate = useNavigate();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const tpl: PrintTemplate | null = useMemo(() => {
    if (template) return template;
    const found = resolveTemplate(templates ?? [], docTypeCode);
    return found ?? null;
  }, [template, templates, docTypeCode]);

  const source = useMemo(() => {
    if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
    if (document) return { type: 'api-document' as const, doc: document, options: { prevBalance, newBalance } };
    return null;
  }, [overrideData, document, prevBalance, newBalance]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handlePrint = useCallback(() => {
    if (!tpl || !source) return;
    renderPipelineToPopup(source, tpl, company);
  }, [tpl, source, company]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>طباعة حسب القالب</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t4)', padding: '0 4px', lineHeight: 1 }}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div style={previewAreaStyle}>
          {source && tpl ? (
            <UniversalPrintPipeline source={source} template={tpl} company={company} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
              {!tpl ? 'لا يوجد قالب لهذا المستند' : 'لا توجد بيانات للمعاينة'}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button style={btnSecondary} onClick={onClose}>إلغاء</button>
          {docTypeCode === 'STK' && (
            <button style={{ ...btnSecondary, color: '#3b82f6' }}
              onClick={() => {
                const id = tpl?.id ? `?id=${tpl.id}` : '';
                navigate(`/settings/stickers${id}`);
              }}>
              ✏️ تعديل القالب
            </button>
          )}
          <button style={btnPrimary} onClick={handlePrint} disabled={!tpl || !source}>طباعة</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TemplatePrintModal);
