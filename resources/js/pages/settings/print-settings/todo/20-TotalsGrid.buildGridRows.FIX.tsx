// ════════════════════════════════════════════════════════════════════════════
// تصحيح: استبدل دالة buildGridRows في TotalsGrid.tsx (من ملف 17) بهذه النسخة.
//
// الأسماء الحقيقية من UniversalDocumentData.ts (DocumentLine):
//   discountAmt  (وليس discountAmount)
//   totalTva     موجود جاهزًا — لا داعي لإعادة حسابه يدويًا من tvaRate (يتجنب فروق التقريب)
//   unitPriceHt × quantity = المبلغ خارج الرسم قبل الخصم
// ════════════════════════════════════════════════════════════════════════════

interface GridRow {
  rate: number;
  baseExcl: number;       // قبل الخصم
  discountPct: number;
  discountAmount: number;
  tvaAmount: number;
  netExcl: number;        // بعد الخصم (= line.totalHt)
}

function buildGridRows(data: UniversalDocumentData): GridRow[] {
  const groups = new Map<number, GridRow>();

  for (const line of data.lines) {
    const rate = Number(line.tvaPct ?? 0);
    const baseBeforeDiscount = Number(line.unitPriceHt ?? 0) * Number(line.quantity ?? 0);
    const discountAmount = Number(line.discountAmt ?? 0);
    const netExcl = Number(line.totalHt ?? 0);
    const tvaAmount = Number(line.totalTva ?? 0);

    const g = groups.get(rate) ?? { rate, baseExcl: 0, discountPct: 0, discountAmount: 0, tvaAmount: 0, netExcl: 0 };
    g.baseExcl += baseBeforeDiscount;
    g.discountAmount += discountAmount;
    g.netExcl += netExcl;
    g.tvaAmount += tvaAmount;
    groups.set(rate, g);
  }

  return [...groups.values()]
    .map(g => ({ ...g, discountPct: g.baseExcl > 0 ? (g.discountAmount / g.baseExcl) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate); // المعدلات الأعلى أولًا، المعفى (0%) أخيرًا
}
