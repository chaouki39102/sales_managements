import React from 'react';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function PaymentsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('show_payment_details') && <Toggle value={tpl.show_payment_details} onChange={v => update('show_payment_details', v)} label="تفصيل وسائل الدفع" />}
      {sec('show_payment_details') && tpl.show_payment_details && (
        <SliderField label="حجم خط الدفع" value={tpl.payment_font_size} min={8} max={14} unit="px"
          onChange={v => update('payment_font_size', v)} />
      )}
    </>
  );
}
