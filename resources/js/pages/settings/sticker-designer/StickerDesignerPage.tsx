import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import type { UniversalDocumentData, CompanyData, DocumentLine } from '@/pages/settings/print-settings/types/data';
import { usePrintTemplatesList } from '@/pages/settings/print-settings/runtime';
import { useStickerMutations } from './stickerMutations';
import StickerCanvas from './StickerCanvas';
import ElementPanel from './ElementPanel';
import Button from '@/components/ui/Button';

const DEFAULT_TEMPLATE: PrintTemplate = {
  id: null as any,
  doc_type_code: 'STK',
  paper_size: '40x20mm',
  paper_width_mm: 40,
  page_orientation: 'portrait',
  name: 'ملصق المنتج',
  is_default: false, is_active: true,
  margin_top: 6, margin_bottom: 6, margin_sides: 8,
  base_font_size: 12, font_family: 'tajawal', line_spacing: 1.2,
  show_header_section: true, show_doc_info_section: false, show_items_section: false,
  show_totals_section: false, show_payments_section: false, show_footer_section: false,
  show_logo: true, logo_source: 'company', logo_size: 50, logo_align: 'center', logo_border_radius: 0,
  show_company_name: true, company_name_text: '', company_name_size: 9, company_name_bold: true, company_name_color: '#1a1a2e', company_name_align: 'center',
  header_separator: 'dashed',
  show_label_barcode: true, label_barcode_height: 20, label_barcode_format: 'code39',
  show_label_product_name: true, label_product_name_size: 9, label_product_name_bold: true, label_product_name_color: '#111111',
  show_label_product_image: false, label_product_image_size: 40,
  show_label_brand: false, label_brand_size: 7, label_brand_color: '#888888',
  show_label_ref: true, label_ref_size: 6, label_ref_color: '#666666',
  show_label_price: true, label_price_size: 14, label_price_bold: true, label_price_color: '#c0392b', label_price_text: 'د.ج', label_price_prefix: '',
  label_hide_currency: false, label_layout: 'stacked',
  label_border_style: 'solid', label_border_width: 1, label_border_color: '#333333', label_border_radius: 4,
  show_payment_details: false, payment_font_size: 9, payments_align: 'right',
  rules: [],
  sections_order: [],
  page_frame: { enabled: false } as any,
  watermark: { enabled: false } as any,
} as unknown as PrintTemplate;

const MOCK_COMPANY: CompanyData = {
  name: 'شركتي',
  address: 'العنوان',
  phone: '0555000000',
  nif: '123456789',
  logoUrl: null,
} as any;

const MOCK_LINE: DocumentLine = {
  rowNumber: 1,
  name: 'منتج تجريبي',
  ref: 'REF-001',
  barcode: '1234567890128',
  quantity: 1,
  unitPriceHt: 1500,
  unitPriceTtc: 1725,
  tvaRate: 0.19,
  tvaPct: 19,
  discountPct: 0,
  discountAmt: 0,
  totalHt: 1500,
  totalTva: 285,
  totalTtc: 1725,
  unit: 'قطعة',
  lot: null,
  notes: null,
  imageUrl: null,
  brand: 'ماركة نموذجية',
};

export default function StickerDesignerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const { data: templates = [], isLoading } = usePrintTemplatesList('STK');
  const mutations = useStickerMutations();

  const [localTpl, setLocalTpl] = useState<PrintTemplate>(DEFAULT_TEMPLATE);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const found = templates.find(t => String(t.id) === templateId);
      if (found) {
        setLocalTpl(found);
      }
    }
  }, [templateId, templates]);

  const updateTemplate = useCallback((patch: Partial<PrintTemplate>) => {
    setLocalTpl(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!localTpl) return;
    setIsSaving(true);
    try {
      if (localTpl.id) {
        await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl as any });
      } else {
        await mutations.create.mutateAsync(localTpl as any);
      }
      setIsDirty(false);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, mutations]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f7' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e0e0e0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555' }}>
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>مصمم الملصق</h2>
          {isDirty && <span style={{ fontSize: 11, color: '#e67e22', background: '#fef3e7', padding: '2px 8px', borderRadius: 3 }}>غير محفوظ</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" onClick={handleBack}>إلغاء</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !isDirty}
            style={{ opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto', alignItems: 'center' }}>
          <div style={{
            width: '100%', maxWidth: 900, background: '#fff', borderRadius: 8, padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <StickerCanvas
              template={localTpl}
              line={MOCK_LINE}
              company={MOCK_COMPANY}
              onUpdate={updateTemplate}
              onSelectElement={setSelectedElement}
            />
          </div>
        </div>

        {/* Right: Properties Panel */}
        <div style={{
          width: 280, background: '#fff', borderLeft: '1px solid #e0e0e0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e0e0', fontSize: 13, fontWeight: 600, color: '#555' }}>
            {selectedElement ? 'خصائص العنصر' : 'خصائص الملصق'}
          </div>
          <ElementPanel
            template={localTpl}
            selectedElement={selectedElement}
            onUpdate={updateTemplate}
          />
        </div>
      </div>
    </div>
  );
}

function TemplateList({
  templates, selectedId, onSelect, onDelete,
}: {
  templates: PrintTemplate[];
  selectedId: number | null;
  onSelect: (tpl: PrintTemplate) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>قوالب الملصقات</h3>
      {templates.length === 0 ? (
        <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 20 }}>
          لا توجد قوالب. أنشئ واحداً من البداية.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map(tpl => (
            <div key={tpl.id} onClick={() => onSelect(tpl)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                background: tpl.id === selectedId ? '#e8f0fe' : '#f8f8f8',
                border: tpl.id === selectedId ? '1px solid #3b82f6' : '1px solid #e0e0e0',
              }}>
              <div style={{ fontSize: 13, fontWeight: tpl.id === selectedId ? 600 : 400 }}>
                {tpl.name || 'بدون اسم'}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDelete(tpl.id!); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 14 }}>
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
