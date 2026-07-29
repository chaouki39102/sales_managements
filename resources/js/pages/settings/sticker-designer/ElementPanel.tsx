import React from 'react';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';

interface ElementPanelProps {
  template: PrintTemplate;
  selectedElement: string | null;
  onUpdate: (patch: Partial<PrintTemplate>) => void;
}

interface ElementConfig {
  id: string;
  label: string;
  settings: Array<{
    key: string;
    label: string;
    type: 'toggle' | 'slider' | 'color' | 'pills' | 'text';
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    pills?: { v: string; l: string }[];
  }>;
}

const ELEMENT_CONFIGS: ElementConfig[] = [
  {
    id: 'brand', label: 'العلامة التجارية',
    settings: [
      { key: 'show_label_brand', label: 'إظهار العلامة التجارية', type: 'toggle' },
      { key: 'label_brand_size', label: 'الحجم', type: 'slider', min: 6, max: 16, step: 1, unit: 'px' },
      { key: 'label_brand_color', label: 'اللون', type: 'color' },
    ],
  },
  {
    id: 'productName', label: 'اسم المنتج',
    settings: [
      { key: 'show_label_product_name', label: 'إظهار اسم المنتج', type: 'toggle' },
      { key: 'label_product_name_size', label: 'الحجم', type: 'slider', min: 8, max: 24, step: 1, unit: 'px' },
      { key: 'label_product_name_bold', label: 'عريض', type: 'toggle' },
      { key: 'label_product_name_color', label: 'اللون', type: 'color' },
    ],
  },
  {
    id: 'ref', label: 'المرجع',
    settings: [
      { key: 'show_label_ref', label: 'إظهار المرجع', type: 'toggle' },
      { key: 'label_ref_size', label: 'الحجم', type: 'slider', min: 6, max: 16, step: 1, unit: 'px' },
      { key: 'label_ref_color', label: 'اللون', type: 'color' },
    ],
  },
  {
    id: 'price', label: 'السعر',
    settings: [
      { key: 'show_label_price', label: 'إظهار السعر', type: 'toggle' },
      { key: 'label_price_size', label: 'الحجم', type: 'slider', min: 10, max: 36, step: 1, unit: 'px' },
      { key: 'label_price_bold', label: 'عريض', type: 'toggle' },
      { key: 'label_price_color', label: 'اللون', type: 'color' },
      { key: 'label_price_text', label: 'نص العملة', type: 'text' },
      { key: 'label_price_prefix', label: 'بادئة السعر', type: 'text' },
      { key: 'label_hide_currency', label: 'إخفاء رمز العملة', type: 'toggle' },
    ],
  },
  {
    id: 'logo', label: 'الشعار',
    settings: [
      { key: 'show_logo', label: 'إظهار الشعار', type: 'toggle' },
      { key: 'logo_size', label: 'الحجم', type: 'slider', min: 20, max: 80, step: 5, unit: 'px' },
    ],
  },
  {
    id: 'companyName', label: 'اسم الشركة',
    settings: [
      { key: 'show_company_name', label: 'إظهار اسم الشركة', type: 'toggle' },
      { key: 'company_name_text', label: 'نص مخصص', type: 'text' },
      { key: 'company_name_size', label: 'الحجم', type: 'slider', min: 6, max: 18, step: 1, unit: 'px' },
      { key: 'company_name_bold', label: 'عريض', type: 'toggle' },
      { key: 'company_name_color', label: 'اللون', type: 'color' },
    ],
  },
  {
    id: 'image', label: 'صورة المنتج',
    settings: [
      { key: 'show_label_product_image', label: 'إظهار الصورة', type: 'toggle' },
      { key: 'label_product_image_size', label: 'الحجم', type: 'slider', min: 30, max: 80, step: 5, unit: 'px' },
    ],
  },
  {
    id: 'barcode', label: 'الباركود',
    settings: [
      { key: 'show_label_barcode', label: 'إظهار الباركود', type: 'toggle' },
      { key: 'label_barcode_format', label: 'النوع', type: 'pills', pills: [
        { v: 'code39', l: 'Code 39' },
        { v: 'ean13', l: 'EAN-13' },
        { v: 'code128', l: 'Code 128' },
      ] },
      { key: 'label_barcode_height', label: 'الارتفاع', type: 'slider', min: 20, max: 80, step: 5, unit: 'px' },
    ],
  },
];

export default function ElementPanel({ template, selectedElement, onUpdate }: ElementPanelProps) {
  const config = ELEMENT_CONFIGS.find(c => c.id === selectedElement);

  if (!selectedElement || !config) {
    return (
      <div style={{ padding: 16, color: '#888', fontSize: 13, textAlign: 'center' }}>
        اختر عنصراً من اللوحة لتعديل خصائصه
      </div>
    );
  }

  const getValue = (key: string) => (template as any)[key];

  return (
    <div style={{ padding: '4px 12px 12px' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', paddingBottom: 6, borderBottom: '1px solid #eee' }}>
        {config.label}
      </h3>
      {config.settings.map(s => {
        const val = getValue(s.key);
        return (
          <div key={s.key} style={{ marginBottom: 8 }}>
            {s.type === 'toggle' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!val} onChange={e => onUpdate({ [s.key]: e.target.checked } as any)} />
                {s.label}
              </label>
            )}
            {s.type === 'slider' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#666', minWidth: 40 }}>{s.label}</span>
                <input
                  type="range" min={s.min} max={s.max} step={s.step}
                  value={typeof val === 'number' ? val : s.min}
                  onChange={e => onUpdate({ [s.key]: Number(e.target.value) } as any)}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 11, color: '#666', minWidth: 40, textAlign: 'right' }}>
                  {val ?? s.min}{s.unit ? ` ${s.unit}` : ''}
                </span>
              </div>
            )}
            {s.type === 'color' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#666', minWidth: 40 }}>{s.label}</span>
                <input type="color" value={typeof val === 'string' ? val : '#000000'}
                  onChange={e => onUpdate({ [s.key]: e.target.value } as any)}
                  style={{ width: 32, height: 24, padding: 0, border: '1px solid #ddd', cursor: 'pointer' }} />
              </div>
            )}
            {s.type === 'text' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#666', minWidth: 40 }}>{s.label}</span>
                <input type="text" value={typeof val === 'string' ? val : ''}
                  onChange={e => onUpdate({ [s.key]: e.target.value } as any)}
                  style={{ flex: 1, padding: '2px 6px', fontSize: 12, border: '1px solid #ddd', borderRadius: 3 }} />
              </div>
            )}
            {s.type === 'pills' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#666' }}>{s.label}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {(s.pills || []).map(p => (
                    <button key={p.v}
                      onClick={() => onUpdate({ [s.key]: p.v } as any)}
                      style={{
                        padding: '2px 8px', fontSize: 10, border: '1px solid #ddd', borderRadius: 3,
                        background: val === p.v ? '#3b82f6' : '#f8f8f8',
                        color: val === p.v ? '#fff' : '#333',
                        cursor: 'pointer',
                      }}
                    >{p.l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
