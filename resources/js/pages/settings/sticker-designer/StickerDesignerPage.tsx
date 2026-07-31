import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PrintTemplate, StickerElementGeometry } from '@/pages/settings/print-settings/types/domain';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import type { CompanyData } from '@/pages/settings/print-settings/types/live-data';
import { usePrintTemplatesList } from '@/pages/settings/print-settings/runtime';
import { useStickerMutations } from './stickerMutations';
import StickerControls from './StickerControls';
import StickerCanvas from './StickerCanvas';
import ElementProperties from './ElementProperties';
import { Input } from '@/pages/settings/print-settings/components/ui';
import { toolBtnStyle } from '@/pages/settings/print-settings/components/TinyBtn';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';

function createDefaultTpl(name: string): PrintTemplate {
  return {
    id: null,
    doc_type_code: 'STK',
    paper_size: '40x20mm',
    paper_width_mm: 40,
    page_orientation: 'portrait',
    name,
    is_default: false, is_active: true,
    margin_top: 6, margin_bottom: 6, margin_sides: 8,
    base_font_size: 12, font_family: 'tajawal', line_spacing: 1.2,
    show_header_section: true, show_doc_info_section: false, show_items_section: false,
    show_totals_section: false, show_payments_section: false, show_footer_section: false,
    show_logo: true, logo_source: 'company', logo_size: 50, logo_align: 'center', logo_border_radius: 0,
    show_company_name: true, company_name_text: '', company_name_size: 9, company_name_bold: true, company_name_color: '#1a1a2e', company_name_align: 'center',
    header_separator: 'dashed',
    show_label_barcode: true, label_barcode_height: 50, label_barcode_format: 'code39',
    label_barcode_show_text: true, label_barcode_bar_width: 1.0,
    show_label_product_name: true, label_product_name_size: 9, label_product_name_bold: true, label_product_name_color: '#111111',
    show_label_product_image: false, label_product_image_size: 40,
    show_label_brand: false, label_brand_size: 7, label_brand_color: '#888888',
    show_label_ref: true, label_ref_size: 6, label_ref_color: '#666666',
    show_label_price: true, label_price_size: 14, label_price_bold: true, label_price_color: '#c0392b', label_price_text: 'د.ج', label_price_prefix: '',
    label_hide_currency: false, label_layout: 'stacked',
    label_border_style: 'solid', label_border_width: 1, label_border_color: '#333333', label_border_radius: 4,
    show_payment_details: false, payment_font_size: 9, payments_align: 'right',
    label_positions: {},
    rules: [],
    sections_order: [],
    page_frame: { enabled: false },
    watermark: { enabled: false },
  } as unknown as PrintTemplate;
}

const _MOCK_COMPANY_DATA: CompanyData = {
  name: 'شركتي', commercialName: '', address: 'العنوان', phone: '0555000000',
  mobile: '', fax: '', email: '', nif: '123456789', rc: '', nis: '',
  article: '', capital: '', bankName: '', rib: '', activity: '',
  logoUrl: null,
}; void _MOCK_COMPANY_DATA;

const MOCK_DOC_DATA: UniversalDocumentData = {
  doc: {
    number: 'LABEL-001', date: new Date().toISOString().slice(0, 10),
    typeCode: 'STK', typeName: 'ملصق', status: 'draft',
  },
  company: {
    name: 'شركتي', address: 'العنوان', phone: '0555000000',
    nif: '123456789', logoUrl: null,
  },
  party: null,
  session: null,
  warehouse: null,
  lines: [{
    rowNumber: 1, name: 'منتج تجريبي', ref: 'REF-001',
    barcode: '1234567890128', quantity: 1,
    unitPriceHt: 1500, unitPriceTtc: 1725,
    tvaRate: 0.19, tvaPct: 19,
    discountPct: 0, discountAmt: 0,
    totalHt: 1500, totalTva: 285, totalTtc: 1725,
    unit: 'قطعة', brand: 'ماركة نموذجية',
  }],
  totals: {
    totalHt: 1500, totalTva: 285, totalTtc: 1725,
    fiscalStamp: 0, totalDiscount: 0,
    paid: 0, change: 0, remaining: 1725, netToPay: 1725,
  },
  taxBreakdown: [{ rate: 19, baseHt: 1500, tva: 285, ttc: 1725 }],
  payments: [],
  balance: null,
  currency: { code: 'DZD', symbol: 'دج', rate: 1 },
  computed: {},
};

export default function StickerDesignerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const selectedTplId = templateId ? Number(templateId) : null;
  const { data: templates = [], isLoading } = usePrintTemplatesList('STK');
  const mutations = useStickerMutations();
  const deleteConfirm = useConfirm();
  const notify = useNotification();

  const [localTpl, setLocalTpl] = useState<PrintTemplate>(createDefaultTpl('ملصق المنتج'));
  const [isSaving, setIsSaving] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const historyRef = useRef<PrintTemplate[]>([]);
  const historyPos = useRef(-1);
  const controlsRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const found = templates.find(t => String(t.id) === templateId);
      if (found) {
        setLocalTpl(found);
        historyRef.current = [];
        historyPos.current = -1;
        setCanUndo(false);
        setCanRedo(false);
      }
    }
  }, [templateId, templates]);

  const pushHistory = useCallback((tpl: PrintTemplate) => {
    const stack = historyRef.current;
    stack.length = historyPos.current + 1;
    stack.push({ ...tpl });
    if (stack.length > 60) stack.shift();
    historyPos.current = stack.length - 1;
    setCanUndo(historyPos.current > 0);
    setCanRedo(false);
  }, []);

  const update = useCallback(<K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => {
    setLocalTpl(prev => {
      if (prev) pushHistory(prev);
      const next = prev ? { ...prev, [key]: val } : prev;
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyPos.current <= 0) return;
    const prev = historyRef.current[historyPos.current - 1];
    setLocalTpl({ ...prev });
    historyPos.current--;
    setCanUndo(historyPos.current > 0);
    setCanRedo(true);
    setIsDirty(true);
  }, []);

  const handleTransformChange = useCallback((id: string, pos: StickerElementGeometry) => {
    setLocalTpl(prev => {
      if (!prev) return prev;
      const current = prev.label_positions?.[id] ?? { x: 0, y: 0 };
      const positions = { ...(prev.label_positions ?? {}), [id]: { ...current, ...pos } };
      return { ...prev, label_positions: positions };
    });
    setIsDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyPos.current >= historyRef.current.length - 1) return;
    const next = historyRef.current[historyPos.current + 1];
    setLocalTpl({ ...next });
    historyPos.current++;
    setCanUndo(true);
    setCanRedo(historyPos.current < historyRef.current.length - 1);
    setIsDirty(true);
  }, []);

  const handleNudge = useCallback((id: string, dx: number, dy: number) => {
    setLocalTpl(prev => {
      if (!prev) return prev;
      const current = prev.label_positions?.[id] ?? { x: 0, y: 0 };
      const el = elementRefs.current[id];
      const effW = current.width ?? el?.offsetWidth ?? 0;
      const effH = current.height ?? el?.offsetHeight ?? 0;
      const offX = current.align === 'center' ? 0.5 : current.align === 'right' ? 1 : 0;
      const offY = current.valign === 'middle' ? 0.5 : current.valign === 'bottom' ? 1 : 0;
      const minX = offX * effW;
      const maxX = Math.max(minX, 320 - (1 - offX) * effW);
      const minY = offY * effH;
      const maxY = Math.max(minY, 160 - (1 - offY) * effH);
      const next = {
        ...current,
        x: Math.round(Math.max(minX, Math.min(maxX, (current.x ?? 0) + dx))),
        y: Math.round(Math.max(minY, Math.min(maxY, (current.y ?? 0) + dy))),
      };
      const positions = { ...(prev.label_positions ?? {}), [id]: next };
      return { ...prev, label_positions: positions };
    });
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!localTpl || isSaving) return;
    setIsSaving(true);
    try {
      if (localTpl.id) {
        await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl as unknown as Record<string, unknown> });
      } else {
        await mutations.create.mutateAsync(localTpl as unknown as Record<string, unknown>);
      }
      setIsDirty(false);
      notify.success('✅ تم حفظ القالب');
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, mutations, notify, isSaving]);

  const handleSelectTemplate = useCallback((tpl: PrintTemplate) => {
    navigate(`/settings/stickers?id=${tpl.id}`, { replace: true });
  }, [navigate]);

  const handleNewTemplate = useCallback(async () => {
    const name = prompt('اسم القالب الجديد:');
    if (!name) return;
    try {
      const result = await mutations.create.mutateAsync(createDefaultTpl(name) as unknown as Record<string, unknown>);
      navigate(`/settings/stickers?id=${(result as { id: number }).id}`, { replace: true });
    } catch {
      notify.error('فشل إنشاء القالب');
    }
  }, [mutations, navigate, notify]);

  const handleDeleteTemplate = useCallback(async (id: number) => {
    if (!await deleteConfirm.confirm('حذف هذا القالب؟')) return;
    try {
      await mutations.remove.mutateAsync(id);
      notify.success('تم حذف القالب');
      if (String(id) === templateId) {
        navigate('/settings/stickers', { replace: true });
      }
    } catch {
      notify.error('فشل الحذف');
    }
  }, [mutations, navigate, templateId, deleteConfirm, notify]);

  const refs = useRef({ handleSave, handleUndo, handleRedo, isDirty, isSaving, handleNudge, selectedElement, deselect: () => setSelectedElement(null) });
  useEffect(() => {
    refs.current = { handleSave, handleUndo, handleRedo, isDirty, isSaving, handleNudge, selectedElement, deselect: () => setSelectedElement(null) };
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (refs.current.isDirty && !refs.current.isSaving) refs.current.handleSave(); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); refs.current.handleUndo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); refs.current.handleRedo(); }

      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape' && !typing && refs.current.selectedElement) {
        refs.current.deselect();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (typing) return;
        const id = refs.current.selectedElement;
        if (!id) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta: Record<string, [number, number]> = {
          ArrowUp: [0, -step], ArrowDown: [0, step],
          ArrowLeft: [-step, 0], ArrowRight: [step, 0],
        };
        const [dx, dy] = delta[e.key];
        refs.current.handleNudge(id, dx, dy);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: 'rtl', overflow: 'hidden' }}>
      <div style={{
        padding: '10px 18px', borderBottom: '1px solid var(--b2)',
        background: 'var(--bg2)', display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-tag" style={{ color: 'var(--em)' }} />
            مصمم الملصق
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)' }}>
            قوالب ملصقات المنتجات
          </div>
        </div>
        <div style={{ flex: 1 }} />

        {localTpl && (
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={handleUndo} disabled={!canUndo} type="button"
              title="تراجع (Ctrl+Z)"
              style={{ ...toolBtnStyle, opacity: canUndo ? 1 : .35, cursor: canUndo ? 'pointer' : 'not-allowed' }}>
              <i className="ti ti-arrow-back-up" />
            </button>
            <button onClick={handleRedo} disabled={!canRedo} type="button"
              title="إعادة (Ctrl+Y)"
              style={{ ...toolBtnStyle, opacity: canRedo ? 1 : .35, cursor: canRedo ? 'pointer' : 'not-allowed' }}>
              <i className="ti ti-arrow-forward-up" />
            </button>
          </div>
        )}

        {localTpl && (
          <div style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r2)',
            background: isDirty ? 'var(--goldb)' : 'var(--emb)',
            border: `1px solid ${isDirty ? 'var(--goldbo)' : 'var(--embo)'}`,
            color: isDirty ? 'var(--gold)' : 'var(--em)',
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className={`ti ${isDirty ? 'ti-point-filled' : 'ti-check'}`} style={{ fontSize: 10 }} />
            {isDirty ? 'تغييرات غير محفوظة' : 'محفوظ'}
          </div>
        )}

        {localTpl && (
          <button onClick={handleSave} disabled={!isDirty || isSaving} type="button"
            style={{
              padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 800,
              border: 'none', fontFamily: 'Tajawal, sans-serif',
              background: isDirty ? 'var(--em)' : 'var(--bg5)',
              color: isDirty ? '#fff' : 'var(--t4)',
              cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: isDirty ? 'var(--emglow)' : 'none',
              transition: 'all .15s',
            }}>
            {isSaving
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <><i className="ti ti-device-floppy" /> حفظ (Ctrl+S)</>
            }
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          width: 200, flexShrink: 0, borderLeft: '1px solid var(--b2)',
          background: 'var(--bg2)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          <TemplateList
            templates={templates}
            selectedId={selectedTplId}
            onSelect={handleSelectTemplate}
            onDelete={handleDeleteTemplate}
            onNew={handleNewTemplate}
          />
        </div>

        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg1)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg2)', display: 'flex', alignItems: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <i className="ti ti-eye" style={{ color: 'var(--em)', fontSize: 14 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' }}>معاينة حية</span>
            {localTpl && (
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 8,
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                color: 'var(--t3)', fontWeight: 600,
              }}>
                {localTpl.paper_size}
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {localTpl ? (
              <>
                <StickerCanvas
                  tpl={localTpl}
                  data={MOCK_DOC_DATA}
                  selected={selectedElement}
                  onSelect={setSelectedElement}
                  onTransformChange={handleTransformChange}
                  elementRefs={elementRefs}
                />
                <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center' }}>
                  اسحب للتحريك — مقابض لتغيير الحجم والتدوير — مفاتيح الأسهم للتحريك الدقيق (Shift=10px) — Ctrl+عجلة الفأرة للتكبير
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--t4)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-tag-off" style={{ fontSize: 24, opacity: 0.4 }} />
                اختر قالباً لعرض المعاينة
              </div>
            )}
          </div>
        </div>

        <div style={{
          width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--b2)',
        }}>
          <div style={{
            padding: '8px 10px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0,
          }}>
            {isLoading ? (
              <span style={{ fontSize: 12, color: 'var(--t4)' }}><i className="ti ti-loader-2 spin" /> تحميل...</span>
            ) : templates.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-files-off" />
                لا توجد قوالب — أنشئ أول قالب
              </span>
            ) : templates.map(tpl => (
              <div key={tpl.id!} style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${selectedTplId === tpl.id ? 'var(--em)' : 'var(--b2)'}`,
                borderRadius: 'var(--r2)', overflow: 'hidden',
                background: selectedTplId === tpl.id ? 'var(--emb)' : 'var(--bg2)',
              }}>
                <button onClick={() => handleSelectTemplate(tpl)} type="button"
                  style={{
                    padding: '4px 9px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 12,
                    fontWeight: 600, color: selectedTplId === tpl.id ? 'var(--em)' : 'var(--t2)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {tpl.is_default && <i className="ti ti-star-filled" style={{ fontSize: 9, color: 'var(--gold)' }} />}
                  {tpl.name}
                  <span style={{ fontSize: 9, opacity: .5, fontFamily: 'monospace' }}>{tpl.paper_size}</span>
                </button>
                <div style={{ display: 'flex', borderRight: '1px solid var(--b2)' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id!); }}
                    style={{ padding: '4px 5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontSize: 11 }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))}

            <button onClick={handleNewTemplate} type="button"
              style={{
                padding: '4px 9px', borderRadius: 'var(--r2)',
                border: '1.5px dashed var(--embo)', background: 'var(--emb)',
                color: 'var(--em)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <i className="ti ti-plus" /> جديد
            </button>
          </div>

          {localTpl ? (
            <div ref={controlsRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
              <div style={{
                padding: '7px 9px', marginBottom: 8,
                background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', marginBottom: 3 }}>اسم القالب</div>
                {editingName ? (
                  <Input value={localTpl.name}
                    onChange={v => update('name', v)}
                    onEnter={() => setEditingName(false)}
                    placeholder="اسم القالب..." />
                ) : (
                  <div onClick={() => setEditingName(true)}
                    style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                      padding: '3px 6px', borderRadius: 'var(--r1)',
                      cursor: 'text', border: '1px dashed transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--b3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    {localTpl.name || '—'}
                    <i className="ti ti-pencil" style={{ fontSize: 9, opacity: .3, marginRight: 5 }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {(['40x20mm'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => update('paper_size', s)}
                      style={{
                        flex: 1, padding: '3px 0', fontSize: 11, borderRadius: 'var(--r1)',
                        border: `1px solid ${localTpl.paper_size === s ? 'var(--em)' : 'var(--b2)'}`,
                        background: localTpl.paper_size === s ? 'var(--emb)' : 'var(--bg3)',
                        color: localTpl.paper_size === s ? 'var(--em)' : 'var(--t3)',
                        cursor: 'pointer', fontWeight: 700,
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {selectedElement && (
                <ElementProperties
                  elementId={selectedElement}
                  geometry={localTpl.label_positions?.[selectedElement] ?? { x: 0, y: 0 }}
                  tpl={localTpl}
                  onGeometryChange={handleTransformChange}
                  onTemplateChange={update}
                  onDeselect={() => setSelectedElement(null)}
                />
              )}

              <StickerControls tpl={localTpl} update={update} selectedElement={selectedElement} onSelectElement={setSelectedElement} />
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--t4)', fontSize: 13, gap: 8,
            }}>
              <i className="ti ti-printer-off" style={{ fontSize: 32, opacity: 0.4 }} />
              <span>اختر قالباً من القائمة أو أنشئ قالباً جديداً</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

function TemplateList({
  templates, selectedId, onSelect, onDelete, onNew,
}: {
  templates: PrintTemplate[];
  selectedId: number | null;
  onSelect: (tpl: PrintTemplate) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--b2)', fontSize: 13, fontWeight: 600, color: 'var(--t4)' }}>
        القوالب
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {templates.length === 0 ? (
          <div style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'center', padding: 16 }}>
            لا توجد قوالب
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {templates.map(tpl => {
              const isSel = tpl.id === selectedId;
              return (
                <div key={tpl.id} onClick={() => onSelect(tpl)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                    background: isSel ? 'var(--emb)' : 'transparent',
                    border: '1px solid transparent',
                    borderColor: isSel ? 'var(--em)' : 'transparent',
                  }}>
                  <div style={{
                    fontSize: 12, fontWeight: isSel ? 700 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    color: isSel ? 'var(--em)' : 'var(--t2)',
                  }}>
                    {tpl.name || 'بدون اسم'}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(tpl.id!); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', fontSize: 12, padding: '2px 4px', flexShrink: 0,
                      lineHeight: 1,
                    }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid var(--b2)' }}>
        <Button size="sm" style={{ width: '100%' }} onClick={onNew}>
          + قالب جديد
        </Button>
      </div>
    </div>
  );
}
