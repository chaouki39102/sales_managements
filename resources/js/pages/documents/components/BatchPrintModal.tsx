import React, { useState, useMemo, useCallback, useRef } from 'react';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplates, DocumentDataBuilder } from '@/reporting';
import type { CompanyInfo, PrintTemplate } from '@/reporting';
import type { CommercialDocument } from '@/lib/api/core/types';

// ─── Styles ─────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: '90vw', maxWidth: 700, maxHeight: '90vh',
  background: '#fff', borderRadius: 8, overflow: 'hidden',
  display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
};

const bodyStyle: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: 16,
};

const listItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderBottom: '1px solid #f0f1f3',
  fontSize: 13,
};

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  gap: 8, padding: '12px 16px', borderTop: '1px solid #e2e8f0',
};

const progressBarOuter: React.CSSProperties = {
  width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 12,
};

const progressBarInner: React.CSSProperties = {
  height: '100%', background: '#2563eb', borderRadius: 3, transition: 'width 0.3s ease',
};

let _batchPrintId = 0;

function printDocument(docNum: string, data: Record<string, unknown>, tpl: PrintTemplate, company: CompanyInfo): Promise<void> {
  return new Promise((resolve) => {
    _batchPrintId++;

    const winW = 900;
    const winH = Math.min(800, window.screen.availHeight);

    const win = window.open('', `_batchprint_${_batchPrintId}`, `width=${winW},height=${winH}`);
    if (!win) { resolve(); return; }

    win.document.write(
      `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#fff;display:flex;justify-content:center;padding:20px}*{box-sizing:border-box}</style>
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
      if (root) {
        import('@/pages/settings/print-settings/components/preview/UniversalPreview').then(({ default: UniversalPreview }) => {
          import('react').then((React) => {
            const data = DocumentDataBuilder.fromApiDocument(data, company);
            createRoot(root).render(
              React.createElement(UniversalPreview, { tpl, data, company }),
            );
            win!.onafterprint = () => { resolve(); };
            setTimeout(resolve, 3000);
          });
        });
      } else {
        resolve();
      }
    }).catch(() => resolve());
  });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  documents: CommercialDocument[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BatchPrintModal({ open, onClose, documents: docs }: Props) {
  const slug = useActiveSlug();
  const activeCompany = useActiveCompany();

  const companyInfo: CompanyInfo | null = useMemo(() => activeCompany ? {
    name:    activeCompany.name    ?? '',
    address: activeCompany.address ?? '',
    phone:   activeCompany.phone   ?? '',
    nif:     activeCompany.nif     ?? '',
    rc:      activeCompany.rc      ?? '',
    nis:     activeCompany.nis     ?? '',
    ice:    (activeCompany as any).ice ?? '',
    article: (activeCompany as any).ai ?? '',
    logoUrl: (activeCompany as any).avatar ?? null,
  } : null, [activeCompany]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [printResults, setPrintResults] = useState<{ num: string; ok: boolean }[]>([]);
  const cancelledRef = useRef(false);

  const docTypeCodes = useMemo(() => {
    const codes = new Set<string>();
    docs.forEach(d => {
      const code = (d.document_type as Record<string, unknown> | undefined)?.code as string ?? 'FV';
      codes.add(code);
    });
    return Array.from(codes);
  }, [docs]);

  const { data: allTemplates = [] } = usePrintTemplates();

  const templates = useMemo(() => {
    if (allTemplates.length === 0) return [];
    return allTemplates.filter(t => t.is_active && docTypeCodes.includes(t.doc_type_code));
  }, [allTemplates, docTypeCodes]);

  const handlePrintAll = useCallback(async () => {
    if (!slug || !companyInfo || isPrinting || docs.length === 0) return;
    cancelledRef.current = false;
    setIsPrinting(true);
    setPrintResults([]);
    setProgress({ current: 0, total: docs.length });

    for (let i = 0; i < docs.length; i++) {
      if (cancelledRef.current) break;
      const doc = docs[i];
      setProgress({ current: i + 1, total: docs.length });

      try {
        const res = await apiGet<{ data: CommercialDocument }>(`/documents/${doc.id}`, { include: 'party,documentStatus,warehouse,lines,payments,totals' });
        const fullDoc = res.data;

        const code = ((fullDoc.document_type as Record<string, unknown> | undefined)?.code as string) ?? 'FV';
        const tpl = selectedTemplateId
          ? templates.find(t => t.id === selectedTemplateId)
          : templates.find(t => t.doc_type_code === code && t.is_active);

        const safeTpl = tpl ?? {
          doc_type_code: code,
          paper_size: 'A4',
          paper_width_mm: 210,
        } as PrintTemplate;

        const docNum = (fullDoc as any).document_number ?? String(fullDoc.id);
        await printDocument(docNum, fullDoc as unknown as Record<string, unknown>, safeTpl, companyInfo);

        setPrintResults(prev => [...prev, { num: docNum, ok: true }]);
      } catch {
        const docNum = (doc as any).document_number ?? String(doc.id);
        setPrintResults(prev => [...prev, { num: docNum, ok: false }]);
      }
    }

    setIsPrinting(false);
  }, [slug, companyInfo, docs, isPrinting, selectedTemplateId, templates]);

  const handleCancel = useCallback(() => {
    if (isPrinting) {
      cancelledRef.current = true;
      return;
    }
    onClose();
  }, [isPrinting, onClose]);

  if (!open) return null;

  const successCount = printResults.filter(r => r.ok).length;
  const failCount = printResults.filter(r => !r.ok).length;
  const done = !isPrinting && printResults.length > 0;
  const progressPct = progress.total > 0 ? ((printResults.length) / progress.total) * 100 : 0;

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <i className="ti ti-printer" style={{ marginLeft: 8 }} />
            طباعة بالجملة
            <span style={{ fontSize: 13, fontWeight: 400, marginRight: 8, color: '#666' }}>
              ({docs.length} مستند{docs.length !== 1 ? '' : ''})
            </span>
          </h3>
          {!isPrinting && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666', padding: '0 4px', lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>

        <div style={bodyStyle}>
          {isPrinting && (
            <div style={progressBarOuter}>
              <div style={{ ...progressBarInner, width: `${progressPct}%` }} />
            </div>
          )}

          {isPrinting && (
            <p style={{ fontSize: 13, color: '#2563eb', marginBottom: 12 }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 6 }} />
              جاري طباعة {progress.current} من {progress.total}…
            </p>
          )}

          {done && (
            <p style={{ fontSize: 13, color: failCount > 0 ? '#dc2626' : '#16a34a', marginBottom: 12 }}>
              <i className={`ti ${failCount > 0 ? 'ti-alert-circle' : 'ti-check-circle'}`} style={{ marginLeft: 6 }} />
              تمت الطباعة: {successCount} بنجاح{failCount > 0 ? `، ${failCount} فشل` : ''}
            </p>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              القالب
            </label>
            <select
              value={selectedTemplateId ?? ''}
              onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
              disabled={isPrinting}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                fontSize: 13, background: '#fff',
              }}
            >
              <option value="">القالب الافتراضي لكل نوع</option>
              {templates.map(t => (
                <option key={t.id} value={t.id ?? ''}>
                  {t.name ?? `${t.doc_type_code} — ${t.paper_size}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#333' }}>
            قائمة المستندات ({docs.length})
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            {docs.map((doc, i) => {
              const docNum = (doc as any).document_number ?? `#${doc.id}`;
              const partyName = ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? '';
              const result = printResults.find(r => r.num === docNum);
              return (
                <div key={doc.id ?? i} style={listItemStyle}>
                  <span style={{ color: '#999', minWidth: 24 }}>{i + 1}.</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{docNum}</span>
                  <span style={{ color: '#666', flex: 1 }}>{partyName}</span>
                  {result && (
                    <span style={{ color: result.ok ? '#16a34a' : '#dc2626' }}>
                      <i className={`ti ${result.ok ? 'ti-check' : 'ti-x'}`} />
                    </span>
                  )}
                  {isPrinting && !result && (
                    <span style={{ color: '#2563eb' }}>
                      <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={footerStyle}>
          <span style={{ fontSize: 13, color: '#666' }}>
            {done
              ? `تمت طباعة ${successCount} من ${docs.length} مستند`
              : isPrinting
                ? `جاري طباعة ${progress.current} من ${progress.total}…`
                : `جاهز لطباعة ${docs.length} مستند${docs.length !== 1 ? (docs.length < 11 ? '' : '') : ''}`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: '#fff', color: '#333', fontSize: 14, cursor: 'pointer',
              }}
            >
              {isPrinting ? 'إيقاف' : 'إلغاء'}
            </button>
            {!done && (
              <button
                onClick={handlePrintAll}
                disabled={isPrinting}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: 6,
                  background: isPrinting ? '#94a3b8' : '#2563eb',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: isPrinting ? 'not-allowed' : 'pointer',
                }}
              >
                {isPrinting ? 'جارٍ الطباعة…' : 'طباعة الكل'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
