export type DocLineField = 'product' | 'qty' | 'total_qty' | 'price';

/**
 * ركّز خلية في شبكة الأسطر عبر مُعرّفها الثابت `doc-line-{idx}-{field}`.
 * إضافة سطر = setState غير متزامن، لذا نُعيد المحاولة حتى يُسجِّل React الصف
 * الجديد (بدل rAF وحيد قد يسبق الـ commit). يعمل في عرض الجدول والبطاقات.
 */
export function focusDocLineCell(
  idx: number,
  fields: DocLineField[] = ['qty'],
  attempts = 12,
): void {
  const tryFocus = (left: number) => {
    for (const f of fields) {
      const el = document.getElementById(`doc-line-${idx}-${f}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
        el.focus();
        if (el instanceof HTMLInputElement && el.type !== 'checkbox' && el.type !== 'radio') {
          el.select();
        }
        return;
      }
    }
    if (left > 0) setTimeout(() => tryFocus(left - 1), 30);
  };
  tryFocus(attempts);
}
