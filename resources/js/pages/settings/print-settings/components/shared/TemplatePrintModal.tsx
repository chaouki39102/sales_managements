import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import UniversalPrintPipeline, { renderPipelineToPopup } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import StickerLabel from '@/pages/settings/print-settings/components/preview/StickerLabel';

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

const STK_SCALE = 0.38;

// ─── Component ──────────────────────────────────────────────────────────────

function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData, prevBalance, newBalance }: TemplatePrintModalProps) {
  const navigate = useNavigate();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const candidates = useMemo(() => {
    const list = templates ?? [];
    return list.filter(t => t.doc_type_code === docTypeCode && t.is_active);
  }, [templates, docTypeCode]);

  const defaultTpl = useMemo((): PrintTemplate | null => {
    if (template) return template;
    return resolveTemplate(candidates, docTypeCode) ?? null;
  }, [template, candidates, docTypeCode]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = defaultTpl?.id ?? null;
    setSelectedId(id != null && candidates.some(c => c.id === id) ? id : null);
  }, [open, defaultTpl, candidates]);

  const tpl: PrintTemplate | null = useMemo(() => {
    if (template) return template;
    if (selectedId != null) return candidates.find(c => c.id === selectedId) ?? defaultTpl;
    return defaultTpl;
  }, [template, selectedId, candidates, defaultTpl]);

  const source = useMemo(() => {
    if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
    if (document) return { type: 'api-document' as const, doc: document, options: { prevBalance, newBalance } };
    return null;
  }, [overrideData, document, prevBalance, newBalance]);

  const handlePrint = useCallback(() => {
    if (!tpl || !source) return;
    renderPipelineToPopup(source as any, tpl, company);
  }, [tpl, source, company]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="طباعة حسب القالب"
      subtitle={docTypeCode === 'STK' ? 'اختر قالب الملصق ثم اطبع' : undefined}
      size="xl"
      resizable={false}
      footer={
        <>
          {docTypeCode === 'STK' && (
            <button className="btn btn-b"
              onClick={() => {
                const id = tpl?.id ? `?id=${tpl.id}` : '';
                navigate(`/settings/stickers${id}`);
              }}>
              <i className="ti ti-pencil" /> تعديل القالب
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handlePrint} disabled={!tpl || !source}>
            <i className="ti ti-printer" /> طباعة
          </button>
        </>
      }
      footerLeft={
        docTypeCode === 'STK' && overrideData ? (
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>{overrideData.lines.length} ملصق</span>
        ) : undefined
      }
    >
      {candidates.length > 1 && (
        <div className="tpl-chooser">
          {candidates.map(c => {
            const isSel = c.id != null && c.id === selectedId;
            return (
              <button
                key={c.id ?? c.name}
                type="button"
                title={c.name}
                className={`tpl-card${isSel ? ' on' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="tpl-card-name">
                  {c.is_default ? '★ ' : ''}{c.name}
                </div>
                <div className="tpl-card-meta">
                  {c.paper_size}{c.paper_width_mm ? ` · ${c.paper_width_mm}mm` : ''}
                </div>
                {docTypeCode === 'STK' && overrideData ? (
                  <div className="tpl-card-mini">
                    <div style={{ transform: `scale(${STK_SCALE})`, transformOrigin: 'top left', width: 320, height: 160 }}>
                      <StickerLabel tpl={c} data={overrideData} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--t4)', padding: '18px 0' }}>
                    اختر القالب لعرض المعاينة
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="tpl-preview">
        {source && tpl ? (
          <UniversalPrintPipeline source={source as any} template={tpl} company={company} />
        ) : (
          <div className="tpl-empty">
            {!tpl ? 'لا يوجد قالب لهذا المستند' : 'لا توجد بيانات للمعاينة'}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default React.memo(TemplatePrintModal);
