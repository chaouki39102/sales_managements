import React, { Suspense, useMemo, useEffect, useRef, useCallback } from 'react';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data/DocumentDataBuilder';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate, DocTypeCode } from '@/pages/settings/print-settings/types';
import { createDefaultTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';

const UniversalPreview = React.lazy(() => import('@/pages/settings/print-settings/components/preview/UniversalPreview'));

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

let _printWinId = 0;

function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData }: TemplatePrintModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const data: UniversalDocumentData = useMemo(
    () => overrideData ?? (document ? DocumentDataBuilder.fromApiDocument(document, company) : DocumentDataBuilder.empty()),
    [overrideData, document, company],
  );

  const tpl: PrintTemplate = useMemo(() => {
    if (template) return template;
    const found = resolveTemplate(templates ?? [], docTypeCode);
    if (found) return found;
    return createDefaultTemplate(docTypeCode as DocTypeCode, 'A4');
  }, [template, templates, docTypeCode]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handlePrint = useCallback(() => {
    if (!tpl) return;
    _printWinId++;

    const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
    const paperW = isThermal
      ? (tpl.paper_width_mm ?? 80)
      : (tpl.paper_size === 'A4' ? 210 : 148);
    const winW = isThermal
      ? Math.min(Math.round(paperW * 3.78) + 60, 900)
      : 900;
    const winH = isThermal ? 700 : Math.min(
      tpl.paper_size === 'A4' ? 1123 : 794,
      window.screen.availHeight,
    );

    const win = window.open('', `_tplprint_${_printWinId}`, `width=${winW},height=${winH}`);
    if (!win) { window.print(); return; }

    const bodyStyle = isThermal
      ? 'body{margin:0;background:#fff;display:flex;justify-content:center;padding:10px}'
      : 'body{margin:0;background:#fff;display:flex;justify-content:center;padding:20px}';

    win.document.write(
      `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
<style>${bodyStyle}*{box-sizing:border-box}</style>
</head><body><div id="r"></div>
<script>
  document.fonts.ready.then(function(){
    setTimeout(function(){ window.print(); setTimeout(function(){ window.close(); }, 500); }, 300);
  });
<\/script></body></html>`
    );
    win.document.close();

    import('react-dom/client').then(({ createRoot }) => {
      const root = win!.document.getElementById('r');
      if (root) createRoot(root).render(
        React.createElement(UniversalPreview, { tpl, data, company }),
      );
    });
  }, [tpl, data, company]);

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
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>...</div>}>
            <UniversalPreview tpl={tpl} data={data} company={company} />
          </Suspense>
        </div>

        <div style={footerStyle}>
          <button style={btnSecondary} onClick={onClose}>إلغاء</button>
          <button style={btnPrimary} onClick={handlePrint}>طباعة</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TemplatePrintModal);
