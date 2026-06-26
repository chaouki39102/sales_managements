// resources/js/pages/settings/print-settings/sections/TotalsSection.tsx
import React from 'react';
import type { ReceiptTemplate80mm } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';

interface Props {
  tpl: ReceiptTemplate80mm;
  update: <K extends keyof ReceiptTemplate80mm>(key: K, val: ReceiptTemplate80mm[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  return (
    <Section title="الإجماليات — الحسابات" icon="ti-cash">
      {/* General */}
      <SliderField label="حجم خط الإجماليات" value={tpl.totalsFontSize} min={8} max={16} unit="px"
        onChange={v => update('totalsFontSize', v)} />
      <Toggle value={tpl.totalsBold} onChange={v => update('totalsBold', v)} label="خط عريض" />
      <AlignButtons label="محاذاة الإجماليات" value={tpl.totalsAlign}
        onChange={v => update('totalsAlign', v)} />

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {/* Totals fields */}
      <Toggle value={tpl.showTotalHt}      onChange={v => update('showTotalHt', v)} label="المجموع HT" />
      <Toggle value={tpl.showTotalTva}     onChange={v => update('showTotalTva', v)} label="مبلغ TVA" />
      <Toggle value={tpl.showTvaBreakdown} onChange={v => update('showTvaBreakdown', v)} label="تفصيل TVA حسب النسبة" />
      <Toggle value={tpl.showDiscountTotal} onChange={v => update('showDiscountTotal', v)} label="إجمالي الخصومات" />
      <Toggle value={tpl.showFiscalStamp}  onChange={v => update('showFiscalStamp', v)} label="الطابع الجبائي" />

      {/* TTC - special styling */}
      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <Toggle value={tpl.showTotalTtc} onChange={v => update('showTotalTtc', v)} label="المجموع TTC (الإجمالي)" />
      {tpl.showTotalTtc && (
        <>
          <SliderField label="حجم خط TTC" value={tpl.totalTtcFontSize} min={12} max={24} unit="px"
            onChange={v => update('totalTtcFontSize', v)} />
          <Toggle value={tpl.totalTtcBold} onChange={v => update('totalTtcBold', v)} label="خط عريض" />
          <BorderSelect label="إطار TTC" value={tpl.totalBorderStyle}
            onChange={v => update('totalBorderStyle', v)} />
        </>
      )}

      {/* Amount in words */}
      <Toggle value={tpl.showAmountInWords} onChange={v => update('showAmountInWords', v)} label="المبلغ بالكتابة" />

      {/* Payment & balances */}
      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      <Toggle value={tpl.showPaidAmount}  onChange={v => update('showPaidAmount', v)} label="المبلغ المدفوع" />
      <Toggle value={tpl.showChange}      onChange={v => update('showChange', v)} label="الباقي (الصرف)" />
      <Toggle value={tpl.showRemaining}   onChange={v => update('showRemaining', v)} label="المبلغ المتبقي" />
      <Toggle value={tpl.showPrevBalance} onChange={v => update('showPrevBalance', v)} label="الرصيد السابق" />
      <Toggle value={tpl.showNewBalance}  onChange={v => update('showNewBalance', v)} label="الرصيد الجديد" />
    </Section>
  );
}
