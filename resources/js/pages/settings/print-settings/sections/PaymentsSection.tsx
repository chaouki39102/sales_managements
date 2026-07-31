import type { FontFamily, PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons } from './HeaderSection';
import { isSettingVisible, FONT_OPTIONS } from '../services/SettingsRegistry';

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
        <>
          <SliderField label="حجم خط الدفع" value={tpl.payment_font_size} min={8} max={14} unit="px"
            onChange={v => update('payment_font_size', v)} />
          {sec('payments_align') && <AlignButtons label="محاذاة الدفعات" value={tpl.payments_align}
            onChange={v => update('payments_align', v)} />}
          {sec('payments_font_family') && <div className="ps-field">
            <label className="ps-field-label">نوع خط الدفعات</label>
            <select className="ps-select" value={tpl.payments_font_family}
              onChange={e => update('payments_font_family', e.target.value as FontFamily)}>
              {FONT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>}
        </>
      )}
    </>
  );
}
