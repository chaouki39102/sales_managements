import React, {
  useState, useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  usePrintTemplates, usePrintTemplateMutations,
} from './api/printTemplatesApi';
import PreviewSelector from './components/PreviewSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TemplateControls } from './components/TemplateControls';
import { QuickNav } from './components/QuickNav';
import { TinyBtn, toolBtnStyle } from './components/TinyBtn';
import { Input } from './components/ui';
import { type Updater } from './components/ColumnManager';
import {
  DOC_TYPE_LIST,
  type PrintTemplate, type DocTypeCode,
} from './types';
import { DocumentDataBuilder } from './types/data/DocumentDataBuilder';
import { resolveTemplate } from './runtime';
import type { UniversalDocumentData } from './types/data';
import { TemplateLibraryModal } from './template-library';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { useApiClient, useNotifier, useCompany, useSlug } from './providers/PrintSettingsContext';
import { validateTemplateIntegrity } from './services/SettingsSerializer';

const PAPER_DIM: Record<string, { w: number; h: number }> = {
  '80mm':    { w: 80,  h: 0   },
  '58mm':    { w: 58,  h: 0   },
  'A4':      { w: 210, h: 297 },
  'A5':      { w: 148, h: 210 },
  '40x20mm': { w: 40,  h: 20  },
};

function paperLabel(size: string, mm: number): string {
  const d = PAPER_DIM[size];
  if (!d) return `${mm}mm × تلقائي`;
  return d.h > 0 ? `${d.w}×${d.h}mm` : `${d.w}mm × تلقائي`;
}

const DOC_CATS = [
  { key: 'pos',      label: 'POS',        icon: 'ti-device-desktop' },
  { key: 'sales',    label: 'المبيعات',   icon: 'ti-receipt'        },
  { key: 'purchase', label: 'الشراء',     icon: 'ti-truck'          },
  { key: 'warehouse',label: 'المخزون',    icon: 'ti-box'            },
  { key: 'product',  label: 'الملصقات',   icon: 'ti-tag'            },
] as const;

export default function PrintSettingsPage() {
  const apiClient  = useApiClient();
  const notifier   = useNotifier();
  const companyCtx = useCompany();
  const slug       = useSlug();



  const [activeCat,     setActiveCat]     = useState<string>('pos');
  const [activeDoc,     setActiveDoc]     = useState<DocTypeCode>('POS');
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [localTpl,      setLocalTpl]      = useState<PrintTemplate | null>(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [canUndo,       setCanUndo]       = useState(false);
  const [canRedo,       setCanRedo]       = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const deleteConfirm = useConfirm();
  const [useRealData,       setUseRealData]       = useState(true);
  const [showLibrary,       setShowLibrary]       = useState(false);

  const historyRef    = useRef<PrintTemplate[]>([]);
  const historyPos    = useRef(-1);
  const controlsRef   = useRef<HTMLDivElement>(null);

  const { data: templatesRaw, isLoading } = usePrintTemplates(activeDoc);
  const templates = useMemo(() => templatesRaw ?? [], [templatesRaw]);
  const mutations = usePrintTemplateMutations();

  const { data: previewDoc, refetch, isFetching } = useQuery({
    queryKey: [slug, 'preview-latest-doc', activeDoc],
    queryFn: async () => {
      const list = await apiClient.get<{ data: Array<{ id?: number }> }>('/documents', {
        'filter[document_type.code]': activeDoc,
        'page[size]': 1,
        sort: '-id',
        'fields[commercial_documents]': 'id',
      });
      const docs = list?.data ?? [];
      const first = docs[0];
      if (!first?.id) return null;
      const doc = await apiClient.get<Record<string, unknown>>(`/documents/${first.id}`, {
        include: ['party', 'lines', 'lines.product', 'lines.packaging', 'lines.stockLot', 'payments', 'payments.paymentMode'].join(','),
      });
      return doc ?? null;
    },
    enabled: !!slug && useRealData,
    staleTime: 60_000,
  });
  const prevUseRealData = useRef(useRealData);
  useEffect(() => {
    if (useRealData && !prevUseRealData.current) refetch();
    prevUseRealData.current = useRealData;
  }, [useRealData, refetch]);

  // ── Preview data (balance now comes from backend balance_data, not separate API call) ──
  const previewData: UniversalDocumentData | null = useMemo(() => {
    if (!previewDoc || !companyCtx) return null;
    return DocumentDataBuilder.fromApiDocument(previewDoc, companyCtx);
  }, [previewDoc, companyCtx]);

  useEffect(() => {
    if (templates.length > 0) {
      const stillSelected = selectedTplId && templates.find(t => t.id === selectedTplId);
      const tpl = stillSelected ?? resolveTemplate(templates, activeDoc);
      if (tpl) {
        setSelectedTplId(tpl.id);
        setLocalTpl(tpl);
        setIsDirty(false);
      } else {
        const anyMatch = templates.some(t => t.doc_type_code === activeDoc);
        if (anyMatch) {
          setSelectedTplId(null);
          setLocalTpl(null);
          setIsDirty(true);
        }
      }
    } else {
      setSelectedTplId(null);
      setLocalTpl(null);
      setIsDirty(true);
    }
    historyRef.current = [];
    historyPos.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, [templates, activeDoc]);

  const pushHistory = useCallback((tpl: PrintTemplate) => {
    const stack = historyRef.current;
    stack.length = historyPos.current + 1;
    stack.push({ ...tpl });
    if (stack.length > 60) stack.shift();
    historyPos.current = stack.length - 1;
    setCanUndo(historyPos.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPos.current <= 0) return;
    const prev = historyRef.current[historyPos.current - 1];
    setLocalTpl({ ...prev });
    historyPos.current--;
    setCanUndo(historyPos.current > 0);
    setCanRedo(true);
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

  const update: Updater = useCallback(<K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => {
    setLocalTpl(prev => {
      if (prev) pushHistory(prev);
      const next = prev ? { ...prev, [key]: val } : prev;
      if (key === 'paper_size' && next) {
        if (val === '80mm') next.paper_width_mm = 80;
        else if (val === '58mm') next.paper_width_mm = 58;
        else if (val === 'A4' || val === 'A5') {
          next.paper_width_mm = 80; // Reset thermal width when switching to page paper
          next.page_orientation = next.page_orientation || 'portrait';
        }         else if (val === '40x20mm') {
          next.page_orientation = next.page_orientation || 'portrait';
        }
      }
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const handleSave = useCallback(async () => {
    if (!localTpl || isSaving) return;
    setIsSaving(true);
    const preSaveTpl = { ...localTpl };
    try {
      let savedTpl: PrintTemplate;
      if (localTpl.id) {
        try {
          savedTpl = await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl });
        } catch (e: any) {
          if (e?.response?.status === 404) {
            savedTpl = await mutations.create.mutateAsync({
              ...localTpl, id: undefined,
              doc_type_code: activeDoc,
              is_default: templates.length === 0,
            });
            setSelectedTplId(savedTpl.id);
          } else {
            throw e;
          }
        }
      } else {
        savedTpl = await mutations.create.mutateAsync({
          ...localTpl,
          doc_type_code: activeDoc,
          is_default: templates.length === 0,
        });
        setSelectedTplId(savedTpl.id);
      }

      // Step 1: Replace editor state with DB response
      setLocalTpl({ ...savedTpl });
      setIsDirty(false);
      notifier.success('✅ تم حفظ القالب');

      // Step 2: Compare pre-save vs DB response — report discrepancies
      const SERVER_MUTABLE = new Set(['updated_at', 'created_at']);
      const diffs: string[] = [];
      const allKeys = new Set([...Object.keys(preSaveTpl), ...Object.keys(savedTpl)]);
      for (const k of allKeys) {
        if (SERVER_MUTABLE.has(k)) continue;
        const a = JSON.stringify((preSaveTpl as any)[k]);
        const b = JSON.stringify((savedTpl as any)[k]);
        if (a !== b) diffs.push(k);
      }
      if (diffs.length > 0) {
        console.warn('[PrintSettings] Save verification — differences:', diffs);
      }

      // Step 3: Verify integrity — warn if any registry keys are missing
      const missing = validateTemplateIntegrity(savedTpl, savedTpl.name || 'unknown');
      if (missing > 0) {
        notifier.error(`⚠️ القالب محفوظ لكن ${missing} خاصية مفقودة`);
      }
    } catch (e: any) {
      notifier.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, isSaving, activeDoc, templates.length, mutations, notifier]);

  const handleSetDefault = useCallback(async (id: number) => {
    setActionLoading(`default-${id}`);
    try { await mutations.setDefault.mutateAsync(id); notifier.success('تم تعيين القالب الافتراضي'); }
    catch { notifier.error('فشل التعيين'); }
    finally { setActionLoading(null); }
  }, [mutations, notifier]);

  const handleDuplicate = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`duplicate-${tpl.id}`);
    try {
      const copy = await mutations.duplicate.mutateAsync({ id: tpl.id, name: `نسخة من ${tpl.name}` });
      setSelectedTplId(copy.id);
      setLocalTpl({ ...copy });
      setIsDirty(false);
      notifier.success('تم نسخ القالب');
    } catch { notifier.error('فشل النسخ'); }
    finally { setActionLoading(null); }
  }, [mutations, notifier]);

  const handleDelete = useCallback(async (id: number) => {
    if (!await deleteConfirm.confirm('هل تريد حذف هذا القالب نهائياً؟')) return;
    setActionLoading(`delete-${id}`);
    try { await mutations.remove.mutateAsync(id); notifier.success('تم الحذف'); }
    catch { notifier.error('فشل الحذف'); }
    finally { setActionLoading(null); }
  }, [deleteConfirm, mutations, notifier]);

  const handleToggleActive = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`toggle-${tpl.id}`);
    if (localTpl?.id === tpl.id) setLocalTpl(p => p ? { ...p, is_active: !p.is_active } : p);
    try { await mutations.update.mutateAsync({ id: tpl.id, data: { is_active: !tpl.is_active } }); notifier.success(tpl.is_active ? 'تم تعطيل القالب' : 'تم تفعيل القالب'); }
    catch { notifier.error('فشل التحديث'); }
    finally { setActionLoading(null); }
  }, [mutations, localTpl, notifier]);

  const handleNewTemplate = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const handleInstallLibrary = useCallback(async (_templateId: string, _tpl: PrintTemplate) => {
    try {
      const saved = await mutations.installLibrary.mutateAsync({ templateId: _templateId, docTypeCode: activeDoc });
      setSelectedTplId(saved.id);
      setLocalTpl({ ...saved });
      setIsDirty(false);
      setShowLibrary(false);
      notifier.success(`✅ تم تثبيت القالب "${saved.name}"`);
    } catch (e: any) {
      notifier.error(e?.message ?? 'فشل تثبيت القالب');
    }
  }, [activeDoc, mutations, notifier]);

  const handleExport = useCallback(() => {
    if (!localTpl) return;
    const json = JSON.stringify({ version: 2, docCode: activeDoc, template: localTpl, exportedAt: new Date().toISOString() }, null, 2);
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `print-template-${activeDoc}.json`,
    });
    a.click();
    notifier.success('تم تصدير القالب');
  }, [activeDoc, localTpl, notifier]);

  const handleImport = useCallback(() => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data     = JSON.parse(await file.text());
        const imported = data.template ?? data;
        if (!imported?.col_order || !imported?.paper_size) {
          notifier.error('ملف غير صالح');
          return;
        }
        imported.id = localTpl?.id ?? null;
        if (!imported.doc_type_code) imported.doc_type_code = activeDoc;
        setLocalTpl(imported);
        setIsDirty(true);
        notifier.success('تم الاستيراد — احفظ للتطبيق');
      } catch { notifier.error('فشل قراءة الملف'); }
    };
    input.click();
  }, [activeDoc, localTpl?.id, notifier]);

  const handleTestPrint = useCallback(async () => {
    if (!localTpl) return;
    const mmW = PAPER_DIM[localTpl.paper_size]?.w ?? localTpl.paper_width_mm;
    const winW = Math.min(Math.round(mmW * 3.78) + 60, 900);
    const win  = window.open('', '_blank', `width=${winW},height=700`);
    if (!win) { window.print(); return; }
    const printCss = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #fff; display: flex; justify-content: center; }
      @media print { body { padding: 0; } @page { margin: 0; } }
    `;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
      <meta charset="UTF-8"/>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
      <style>${printCss}</style>
    </head><body><div id="r"></div></body></html>`);
    win.document.close();
    const { createRoot } = await import('react-dom/client');
    const root = win.document.getElementById('r');
    if (!root) return;
    const reactRoot = createRoot(root);
    reactRoot.render(
      React.createElement(PreviewSelector, {
        tpl: localTpl, company: companyCtx,
        data: useRealData ? previewData : null,
      }),
    );
    await win.document.fonts.ready;
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 400));
    if (win.closed) return;
    win.focus();
    win.print();
    setTimeout(() => { if (!win.closed) win.close(); }, 500);
  }, [localTpl, companyCtx, previewData, useRealData]);

  const refs = useRef({ handleSave, handleUndo, handleRedo, isDirty, isSaving });
  useEffect(() => { refs.current = { handleSave, handleUndo, handleRedo, isDirty, isSaving }; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (refs.current.isDirty && !refs.current.isSaving) refs.current.handleSave(); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); refs.current.handleUndo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); refs.current.handleRedo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const docsInCat = DOC_TYPE_LIST.filter(d => d.category === activeCat);

  return (
    <><div style={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: 'rtl', overflow: 'hidden' }}>

      <div style={{
        padding: '10px 18px', borderBottom: '1px solid var(--b2)',
        background: 'var(--bg2)', display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-printer" style={{ color: 'var(--em)' }} />
            إعدادات الطباعة
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)' }}>
            قوالب الطباعة لكل أنواع المستندات — محفوظة في DB
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {localTpl && (
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={handleUndo} disabled={!canUndo} type="button"
              title="تراجع (Ctrl+Z)"
              style={{
                ...toolBtnStyle,
                opacity: canUndo ? 1 : .35, cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-back-up" />
            </button>
            <button
              onClick={handleRedo} disabled={!canRedo} type="button"
              title="إعادة (Ctrl+Y)"
              style={{
                ...toolBtnStyle,
                opacity: canRedo ? 1 : .35, cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-forward-up" />
            </button>
          </div>
        )}

        {localTpl && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={handleExport} title="تصدير JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-download" />
            </button>
            <button onClick={handleImport} title="استيراد JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-upload" />
            </button>

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

            <button
              onClick={handleSave} disabled={!isDirty || isSaving} type="button"
              style={{
                padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 800,
                border: 'none', fontFamily: 'Tajawal, sans-serif',
                background: isDirty ? 'var(--em)' : 'var(--bg5)',
                color: isDirty ? '#fff' : 'var(--t4)',
                cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: isDirty ? 'var(--emglow)' : 'none',
                transition: 'all .15s',
              }}
            >
              {isSaving
                ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                : <><i className="ti ti-device-floppy" /> حفظ (Ctrl+S)</>
              }
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        <div style={{
          width: 200, flexShrink: 0, borderLeft: '1px solid var(--b2)',
          background: 'var(--bg2)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {DOC_CATS.map(cat => (
            <div key={cat.key}>
              <button
                onClick={() => setActiveCat(cat.key)} type="button"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '.8px',
                  color: activeCat === cat.key ? 'var(--em)' : 'var(--t4)',
                  background: activeCat === cat.key ? 'var(--emb)' : 'transparent',
                  borderBottom: '1px solid var(--b1)', textAlign: 'right',
                }}
              >
                <i className={`ti ${cat.icon}`} style={{ fontSize: 13 }} />
                {cat.label}
              </button>

              {activeCat === cat.key && docsInCat.map(doc => {
                const count = templates.filter(t => t.doc_type_code === doc.code).length;
                return (
                  <button
                    key={doc.code}
                    onClick={() => setActiveDoc(doc.code)} type="button"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px 7px 16px', border: 'none', cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif', fontSize: 12.5,
                      color: activeDoc === doc.code ? 'var(--em)' : 'var(--t2)',
                      background: activeDoc === doc.code ? 'rgba(10,138,92,.04)' : 'transparent',
                      borderRight: `2px solid ${activeDoc === doc.code ? 'var(--em)' : 'transparent'}`,
                      borderBottom: '1px solid var(--b1)', textAlign: 'right',
                    }}
                  >
                    <span>
                      <span style={{ fontWeight: 800, marginLeft: 5, fontSize: 11 }}>{doc.code}</span>
                      {doc.name}
                    </span>
                    {count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 8,
                        background: 'var(--emb)', color: 'var(--em)', flexShrink: 0,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--b2)' }}>

          <div style={{
            padding: '8px 10px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0,
          }}>
            {isLoading ? (
              <span style={{ fontSize: 12, color: 'var(--t4)' }}><i className="ti ti-loader-2 spin" /> تحميل...</span>
            ) : templates.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-files-off" />
                لا توجد قوالب — أنشئ أول قالب بالزر أعلاه
              </span>
            ) : templates.map(tpl => (
              <div
                key={tpl.id!}
                style={{
                  display: 'flex', alignItems: 'center',
                  border: `1.5px solid ${selectedTplId === tpl.id ? 'var(--em)' : 'var(--b2)'}`,
                  borderRadius: 'var(--r2)', overflow: 'hidden',
                  background: selectedTplId === tpl.id ? 'var(--emb)' : 'var(--bg2)',
                }}
              >
                <button
                  onClick={() => {
                    setSelectedTplId(tpl.id); setLocalTpl(tpl); setIsDirty(false);
                  }}
                  type="button"
                  style={{
                    padding: '4px 9px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 12,
                    fontWeight: 600, color: selectedTplId === tpl.id ? 'var(--em)' : 'var(--t2)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {tpl.is_default && <i className="ti ti-star-filled" style={{ fontSize: 9, color: 'var(--gold)' }} />}
                  {tpl.name}
                  <span style={{ fontSize: 9, opacity: .5, fontFamily: 'monospace' }}>{tpl.paper_size}</span>
                </button>
                <div style={{ display: 'flex', borderRight: '1px solid var(--b2)' }}>
                  {!tpl.is_default && (
                    <TinyBtn icon="ti-star"  color="var(--gold)"  title="افتراضي" loading={actionLoading === ('default-' + tpl.id)} onClick={() => handleSetDefault(tpl.id!)} />
                  )}
                  <TinyBtn icon={tpl.is_active ? 'ti-eye' : 'ti-eye-off'} color="var(--t4)" title={tpl.is_active ? 'تعطيل' : 'تفعيل'}
                    loading={actionLoading === ('toggle-' + tpl.id)}
                    onClick={() => handleToggleActive(tpl)} />
                  <TinyBtn icon="ti-copy"   color="var(--blue)"  title="نسخ"     loading={actionLoading === ('duplicate-' + tpl.id)} onClick={() => handleDuplicate(tpl)} />
                  <TinyBtn icon="ti-trash"  color="var(--red)"   title="حذف"     loading={actionLoading === ('delete-' + tpl.id)} onClick={() => handleDelete(tpl.id!)} />
                </div>
              </div>
            ))}

            <button
              onClick={handleNewTemplate} type="button"
              style={{
                padding: '4px 9px', borderRadius: 'var(--r2)',
                border: '1.5px dashed var(--embo)', background: 'var(--emb)',
                color: 'var(--em)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
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
                  <Input
                    value={localTpl.name}
                    onChange={v => update('name', v)}
                    onEnter={() => setEditingName(false)}
                    placeholder="اسم القالب..."
                  />
                ) : (
                  <div
                    onClick={() => setEditingName(true)}
                    style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                      padding: '3px 6px', borderRadius: 'var(--r1)',
                      cursor: 'text', border: '1px dashed transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--b3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                  >
                    {localTpl.name || '—'}
                    <i className="ti ti-pencil" style={{ fontSize: 9, opacity: .3, marginRight: 5 }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {(activeDoc === 'STK'
                    ? (['40x20mm'] as const)
                    : (['80mm', '58mm', 'A4', 'A5'] as const)
                  ).map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => update('paper_size', s)}
                      style={{
                        flex: 1, padding: '3px 0', fontSize: 11, borderRadius: 'var(--r1)',
                        border: `1px solid ${localTpl.paper_size === s ? 'var(--em)' : 'var(--b2)'}`,
                        background: localTpl.paper_size === s ? 'var(--emb)' : 'var(--bg3)',
                        color: localTpl.paper_size === s ? 'var(--em)' : 'var(--t3)',
                        cursor: 'pointer', fontWeight: 700,
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <QuickNav controlsRef={controlsRef} />
              <TemplateControls tpl={localTpl} update={update} companyData={companyCtx} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 13, gap: 8 }}>
              <i className="ti ti-printer-off" style={{ fontSize: 32, opacity: 0.4 }} />
              <span>اختر قالباً من القائمة أو أنشئ قالباً جديداً</span>
            </div>
          )}
        </div>

        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg1)', overflow: 'hidden',
          position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: '100vh',
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
                color: 'var(--t3)', fontWeight: 600, marginRight: 2,
              }}>
                {paperLabel(localTpl.paper_size, localTpl.paper_width_mm)}
              </span>
            )}
            {companyCtx && (
              <span style={{
                fontSize: 10.5, padding: '2px 7px', borderRadius: 8,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                color: 'var(--em)', fontWeight: 600,
              }}>
                <i className="ti ti-building-store" style={{ marginLeft: 4, fontSize: 10 }} />
                {companyCtx.name}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {localTpl && (
              <button
                onClick={() => setUseRealData(v => !v)}
                type="button"
                title={useRealData ? 'استخدام بيانات فارغة' : 'استخدام آخر مستند حقيقي'}
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  color: useRealData ? 'var(--em)' : 'var(--t3)',
                  borderColor: useRealData ? 'var(--em)' : 'var(--b2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${useRealData ? 'ti-database' : 'ti-database-off'}`} />
                {useRealData ? 'بيانات حقيقية' : 'بيانات تجريبية'}
              </button>
            )}
            {localTpl && useRealData && (
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                type="button"
                title="تحديث البيانات من الخادم"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  opacity: isFetching ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${isFetching ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
                تحديث
              </button>
            )}
            {localTpl && (
              <button onClick={handleTestPrint} type="button"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 11px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className="ti ti-printer" /> طباعة تجريبية
              </button>
            )}
            {localTpl && (
              <button onClick={handleSave} disabled={!isDirty || isSaving} type="button"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 11px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: isDirty ? 'var(--em)' : 'var(--bg5)',
                  color: isDirty ? '#fff' : 'var(--t4)',
                  border: 'none',
                  cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                }}
              >
                {isSaving
                  ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                  : <><i className="ti ti-device-floppy" /> حفظ</>
                }
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', justifyContent: 'center' }}>
            {localTpl ? (
              <div style={{
                boxShadow: '0 4px 24px rgba(0,0,0,.14)',
                border: '1px solid var(--b3)',
                borderRadius: 2,
                display: 'inline-block',
              }}>
                <ErrorBoundary>
                  <PreviewSelector tpl={localTpl} company={companyCtx} data={useRealData ? previewData : null} />
                </ErrorBoundary>
              </div>
            ) : (
              <div style={{ color: 'var(--t4)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-desktop-off" style={{ fontSize: 24, opacity: 0.4 }} />
                اختر قالباً لعرض المعاينة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      <TemplateLibraryModal
        key={activeDoc}
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onInstall={handleInstallLibrary}
        activeDoc={activeDoc}
      />

      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </>
  );
}
