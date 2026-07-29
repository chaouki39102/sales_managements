import React from 'react';
import type { PrintTemplate, BorderStyle } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { Field, ColorField, Input, Pills } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

const LABEL_LAYOUT_OPTS = [
  { v: 'stacked' as const, l: 'عمودي' },
  { v: 'side-by-side' as const, l: 'جنباً إلى جنب' },
];

export default function LabelSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>المنتج</div>

      {sec('show_label_product_name') && (
        <Toggle value={tpl.show_label_product_name} onChange={v => update('show_label_product_name', v)}
          label="اسم المنتج" />)}
      {sec('show_label_product_name') && tpl.show_label_product_name && (
        <>
          <SliderField label="حجم الخط" value={tpl.label_product_name_size} min={8} max={28} step={1} unit="px"
            onChange={v => update('label_product_name_size', v)} />
          <Toggle value={tpl.label_product_name_bold} onChange={v => update('label_product_name_bold', v)}
            label="خط عريض" />
          <ColorField label="اللون" value={tpl.label_product_name_color}
            onChange={v => update('label_product_name_color', v)} />
        </>
      )}

      {sec('show_label_product_image') && (
        <Toggle value={tpl.show_label_product_image} onChange={v => update('show_label_product_image', v)}
          label="صورة المنتج" />)}
      {sec('show_label_product_image') && tpl.show_label_product_image && (
        <SliderField label="حجم الصورة" value={tpl.label_product_image_size} min={20} max={80} step={2} unit="px"
          onChange={v => update('label_product_image_size', v)} />
      )}

      {sec('show_label_brand') && (
        <Toggle value={tpl.show_label_brand} onChange={v => update('show_label_brand', v)}
          label="الماركة" />)}
      {sec('show_label_brand') && tpl.show_label_brand && (
        <>
          <SliderField label="حجم الخط" value={tpl.label_brand_size} min={6} max={16} step={1} unit="px"
            onChange={v => update('label_brand_size', v)} />
          <ColorField label="اللون" value={tpl.label_brand_color}
            onChange={v => update('label_brand_color', v)} />
        </>
      )}

      {sec('show_label_ref') && (
        <Toggle value={tpl.show_label_ref} onChange={v => update('show_label_ref', v)}
          label="المرجع" />)}
      {sec('show_label_ref') && tpl.show_label_ref && (
        <>
          <SliderField label="حجم الخط" value={tpl.label_ref_size} min={6} max={14} step={1} unit="px"
            onChange={v => update('label_ref_size', v)} />
          <ColorField label="اللون" value={tpl.label_ref_color}
            onChange={v => update('label_ref_color', v)} />
        </>
      )}

      <div className="ps-section-title" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>الباركود</div>

      {sec('show_label_barcode') && (
        <Toggle value={tpl.show_label_barcode} onChange={v => update('show_label_barcode', v)}
          label="الباركود" />)}
      {sec('show_label_barcode') && tpl.show_label_barcode && (
        <>
          {sec('label_barcode_format') && (
            <Field label="نوع الباركود">
              <Pills options={[
                { v: 'code39' as const, l: 'Code 39' },
                { v: 'ean13' as const, l: 'EAN-13' },
                { v: 'code128' as const, l: 'Code 128' },
              ]} value={tpl.label_barcode_format || 'code39'}
                onChange={v => update('label_barcode_format', v as 'code39' | 'ean13' | 'code128')} />
            </Field>
          )}
          <SliderField label="الارتفاع" value={tpl.label_barcode_height} min={20} max={80} step={5} unit="px"
            onChange={v => update('label_barcode_height', v)} />
        </>
      )}

      <div className="ps-section-title" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>السعر</div>

      {sec('show_label_price') && (
        <Toggle value={tpl.show_label_price} onChange={v => update('show_label_price', v)}
          label="السعر" />)}
      {sec('show_label_price') && tpl.show_label_price && (
        <>
          <SliderField label="حجم الخط" value={tpl.label_price_size} min={12} max={48} step={1} unit="px"
            onChange={v => update('label_price_size', v)} />
          <Toggle value={tpl.label_price_bold} onChange={v => update('label_price_bold', v)}
            label="خط عريض" />
          <ColorField label="اللون" value={tpl.label_price_color}
            onChange={v => update('label_price_color', v)} />
          <Field label="نص العملة">
            <Input value={tpl.label_price_text} onChange={v => update('label_price_text', v)}
              placeholder="د.ج" />
          </Field>
          <Field label="بادئة السعر">
            <Input value={tpl.label_price_prefix} onChange={v => update('label_price_prefix', v)}
              placeholder="مثال: فقط" />
          </Field>
          {sec('label_hide_currency') && (
            <Toggle value={tpl.label_hide_currency} onChange={v => update('label_hide_currency', v)}
              label="إخفاء نص العملة" />)}
        </>
      )}

      <div className="ps-section-title" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>التخطيط</div>

      {sec('label_layout') && (
        <Field label="اتجاه العرض">
          <Pills options={LABEL_LAYOUT_OPTS} value={tpl.label_layout}
            onChange={v => update('label_layout', v as 'stacked' | 'side-by-side')} />
        </Field>
      )}

      <div className="ps-section-title" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>الحدود</div>

      {sec('label_border_style') && (
        <BorderSelect label="نوع الحدود" value={tpl.label_border_style || 'solid'}
          onChange={v => update('label_border_style', v as BorderStyle)} />)}
      {sec('label_border_width') && (
        <SliderField label="سُمك الحدود" value={tpl.label_border_width ?? 1} min={0} max={5} step={0.5} unit="px"
          onChange={v => update('label_border_width', v)} />)}
      {sec('label_border_color') && (
        <ColorField label="لون الحدود" value={tpl.label_border_color || '#333'}
          onChange={v => update('label_border_color', v)} />)}
      {sec('label_border_radius') && (
        <SliderField label="تدوير الزوايا" value={tpl.label_border_radius ?? 4} min={0} max={20} step={1} unit="px"
          onChange={v => update('label_border_radius', v)} />)}
    </>
  );
}
