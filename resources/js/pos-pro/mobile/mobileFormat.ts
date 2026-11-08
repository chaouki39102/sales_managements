// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/mobileFormat.ts — أدوات التنسيق المحلية لواجهة الهاتف
// ════════════════════════════════════════════════════════════════════════════

export function fmt(n: number | undefined | null, dec = 2): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(dec) : '0.00';
}

export function money(n: number | undefined | null): string {
  return fmt(n, 2);
}

// لون سواتش المنتج (للبطاقات) — ثابت حسب المنتج لتجنّب الاهتزاز
const SWATCHES = ['ppm-sw-gold', 'ppm-sw-blue', 'ppm-sw-teal', 'ppm-sw-purple', 'ppm-sw-orange', 'ppm-sw-indigo'];
export function swatchFor(id: number | string | undefined): string {
  const n = Number(id ?? 0) || 0;
  return SWATCHES[n % SWATCHES.length];
}

export function avatarColor(name: string | undefined): string {
  const colors = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#EF4444'];
  let h = 0;
  const s = String(name ?? '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export function initials(name: string | undefined): string {
  const parts = String(name ?? '').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '؟') + (parts[1]?.[0] ?? '');
}
