import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  return (
    <>
      <SliderField label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px"
        onChange={v => update('totals_font_size', v)} />
      <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة الإجماليات" value={tpl.totals_align}
        onChange={v => update('totals_align', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      <Toggle value={tpl.show_total_ht}      onChange={v => update('show_total_ht', v)} label="المجموع HT" />
      <Toggle value={tpl.show_total_tva}     onChange={v => update('show_total_tva', v)} label="مبلغ TVA" />
      <Toggle value={tpl.show_tva_breakdown} onChange={v => update('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />
      <Toggle value={tpl.show_discount_total} onChange={v => update('show_discount_total', v)} label="إجمالي الخصومات" />
      <Toggle value={tpl.show_fiscal_stamp}  onChange={v => update('show_fiscal_stamp', v)} label="الطابع الجبائي" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <Toggle value={tpl.show_total_ttc} onChange={v => update('show_total_ttc', v)} label="المجموع TTC (الإجمالي)" />
      {tpl.show_total_ttc && (
        <>
          <SliderField label="حجم خط TTC" value={tpl.total_ttc_font_size} min={12} max={24} unit="px"
            onChange={v => update('total_ttc_font_size', v)} />
          <Toggle value={tpl.total_ttc_bold} onChange={v => update('total_ttc_bold', v)} label="خط عريض" />
          <BorderSelect label="إطار TTC" value={tpl.total_border_style}
            onChange={v => update('total_border_style', v as any)} />
        </>
      )}

      <Toggle value={tpl.show_amount_in_words} onChange={v => update('show_amount_in_words', v)} label="المبلغ بالكتابة" />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      <Toggle value={tpl.show_paid_amount}  onChange={v => update('show_paid_amount', v)} label="المبلغ المدفوع" />
      <Toggle value={tpl.show_change}      onChange={v => update('show_change', v)} label="الباقي (الصرف)" />
      <Toggle value={tpl.show_remaining}   onChange={v => update('show_remaining', v)} label="المبلغ المتبقي" />
      <Toggle value={tpl.show_prev_balance} onChange={v => update('show_prev_balance', v)} label="الرصيد السابق" />
      <Toggle value={tpl.show_new_balance}  onChange={v => update('show_new_balance', v)} label="الرصيد الجديد" />
    </>
  );
}
