import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useActiveCompany } from '@/lib/store/appStore';
import {
  usePrintTemplates, usePrintTemplateMutations,
} from '../print-settings/api/printTemplatesApi';
import {
  createDefaultTemplate, DOC_TYPE_LIST,
  type PrintTemplate, type DocTypeCode,
} from '../print-settings/types';
import { ReportDesigner, printTemplateToDesignerElements, designerElementsToPrintTemplate } from '@/reporting';

const DOC_OPTIONS = DOC_TYPE_LIST as readonly { code: string; name: string; category: string }[];

export default function ReportDesignerPage() {
  const [activeDoc, setActiveDoc] = useState<DocTypeCode>('FV');
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('قالب جديد');
  const [isSaving, setIsSaving] = useState(false);
  const [elementsKey, setElementsKey] = useState(0);
  const elementsRef = useRef<Record<string, any>>({});

  const { data: templates = [], isLoading } = usePrintTemplates(activeDoc);
  const mutations = usePrintTemplateMutations();

  const currentTpl = templates.find(t =>
    selectedTplId ? t.id === selectedTplId : t.is_default
  );

  useEffect(() => {
    setSelectedTplId(null);
    setTemplateName('قالب جديد');
    elementsRef.current = {};
    setElementsKey(k => k + 1);
  }, [activeDoc]);

  const handleTemplateSelect = useCallback((id: number) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      setSelectedTplId(id);
      setTemplateName(tpl.name);
      elementsRef.current = printTemplateToDesignerElements(tpl as unknown as PrintTemplate);
      setElementsKey(k => k + 1);
    }
  }, [templates]);

  const handleNew = useCallback(() => {
    setSelectedTplId(null);
    const defaults = createDefaultTemplate(activeDoc);
    setTemplateName(defaults.name);
    elementsRef.current = printTemplateToDesignerElements(defaults);
    setElementsKey(k => k + 1);
  }, [activeDoc]);

  const handleSave = useCallback(async (elements: Record<string, any>) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const merged = designerElementsToPrintTemplate(elements);
      let baseTpl: Partial<PrintTemplate>;
      if (currentTpl) {
        baseTpl = { ...currentTpl, ...merged, name: templateName } as unknown as PrintTemplate;
      } else {
        baseTpl = {
          ...createDefaultTemplate(activeDoc),
          ...merged,
          name: templateName,
          is_default: templates.length === 0,
        };
      }

      let saved: PrintTemplate;
      if (selectedTplId) {
        saved = await mutations.update.mutateAsync({ id: selectedTplId, data: baseTpl });
      } else {
        saved = await mutations.create.mutateAsync(baseTpl as any);
        setSelectedTplId(saved.id);
      }
      setTemplateName(saved.name);
      toast.success('✅ تم حفظ القالب بنجاح');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل حفظ القالب');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentTpl, templateName, activeDoc, templates.length, selectedTplId, mutations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f2f5' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 16px', background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0, zIndex: 10,
      }}>
        <i className="ti ti-printer" style={{ fontSize: 20, color: '#1890ff' }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#333' }}>
          مصمم القوالب المتقدم
        </span>

        <div style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />

        <select
          value={activeDoc}
          onChange={e => setActiveDoc(e.target.value as DocTypeCode)}
          style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d0d0',
            fontSize: 13, fontFamily: 'Tajawal, sans-serif',
            background: '#fafafa', cursor: 'pointer',
          }}
        >
          {DOC_OPTIONS.map(d => (
            <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
          ))}
        </select>

        <select
          value={selectedTplId ?? ''}
          onChange={e => e.target.value && handleTemplateSelect(Number(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d0d0',
            fontSize: 13, fontFamily: 'Tajawal, sans-serif',
            background: '#fafafa', cursor: 'pointer', minWidth: 160,
          }}
        >
          <option value="">-- اختر قالباً --</option>
          {templates.map(t => (
            <option key={t.id} value={t.id!}>
              {t.name} {t.is_default ? '(افتراضي)' : ''}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="اسم القالب"
          style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d0d0',
            fontSize: 13, fontFamily: 'Tajawal, sans-serif',
            width: 200,
          }}
        />

        <div style={{ flex: 1 }} />

        <button
          onClick={handleNew}
          style={{
            padding: '6px 16px', borderRadius: 6, border: '1px solid #d0d0d0',
            background: '#fff', cursor: 'pointer', fontSize: 12,
            fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
          }}
        >
          <i className="ti ti-plus" style={{ marginLeft: 4 }} />
          جديد
        </button>

        <button
          onClick={() => {
            const el = elementsRef.current;
            if (Object.keys(el).length > 0) handleSave(el);
            else toast.error('لا توجد عناصر للحفظ');
          }}
          disabled={isSaving}
          style={{
            padding: '6px 20px', borderRadius: 6, border: 'none',
            background: isSaving ? '#91caff' : '#1890ff',
            color: '#fff', cursor: isSaving ? 'wait' : 'pointer',
            fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
          }}
        >
          {isSaving ? 'جاري الحفظ...' : '💾 حفظ القالب'}
        </button>
      </div>

      {/* Designer area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: '#999', fontSize: 14,
          }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            جارٍ التحميل...
          </div>
        ) : (
          <ReportDesigner
            key={elementsKey}
            initialElements={elementsRef.current}
            onSave={(els) => {
              elementsRef.current = els;
              handleSave(els);
            }}
          />
        )}
      </div>
    </div>
  );
}
