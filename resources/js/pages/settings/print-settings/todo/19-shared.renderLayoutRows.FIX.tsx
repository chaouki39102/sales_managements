// ════════════════════════════════════════════════════════════════════════════
// تصحيح: استبدل دالة renderLayoutRows في shared.tsx (من ملف 03) بهذه النسخة.
//
// السبب: الحقول النصية (company.*, customer.*) يجب أن تختفي إن كانت فارغة —
// تمامًا كسلوك الكود القديم (`tpl.show_rc && r('company.rc',...) && <div>...`).
// الحقول الرقمية/المالية (currency/number) يجب أن تظهر دومًا حتى لو 0.00،
// لأن "المدفوع: 0.00" معلومة، بعكس "RC: " فارغة.
// ════════════════════════════════════════════════════════════════════════════

export function renderLayoutRows(
  rows: LayoutRow[] | undefined,
  data: UniversalDocumentData,
  tpl: PrintTemplate,
): JSX.Element[] {
  if (!rows || rows.length === 0) return [];

  const visible = [...rows].filter(r => r.visible).sort((a, b) => a.order - b.order);
  const out: JSX.Element[] = [];

  for (const r of visible) {
    if (r.field === 'totals.tvaBreakdownGroup') {
      for (const br of data.taxBreakdown ?? []) {
        out.push(<LayoutRowPair key={`${r.id}-${br.rate}`} row={r} label={`TVA ${br.rate}%`} value={br.tva} />);
      }
      continue;
    }

    if (r.field === 'literal') {
      if (!r.literalText) continue;
      out.push(<LayoutRowLine key={r.id} row={r} text={r.literalText} />);
      continue;
    }

    const def = printFieldRegistry.get(r.field);
    const value = printFieldResolver.resolve(r.field, data, tpl);

    // الحقول النصية/التاريخية تُخفى تلقائيًا إن كانت فارغة — نفس سلوك الكود القديم
    const isEmpty = value === null || value === undefined || value === '';
    const shouldHideWhenEmpty = def ? (def.type === 'string' || def.type === 'date') : true;
    if (isEmpty && shouldHideWhenEmpty) continue;

    const label = r.label ?? def?.label ?? r.field;
    out.push(<LayoutRowPair key={r.id} row={r} label={label} value={value} />);
  }

  return out;
}
