/**
 * WhatsApp click-to-chat helpers — shared by portal, POS, documents, clients, etc.
 *
 * Phone normalization: strip non-digits, strip leading 00, prepend 213 for local 0… numbers.
 */

/** Normalize a phone number to international digits for wa.me links. */
export function normalizeWaPhone(phone: string | null | undefined): string {
  let digits = (phone ?? '').replace(/[^\d]/g, '');
  digits = digits.replace(/^00/, '');
  if (digits.startsWith('0')) {
    digits = '213' + digits.slice(1);
  }
  return digits;
}

/** Build a wa.me click-to-chat URL with prefilled text. Returns null when the phone is invalid. */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  text: string,
): string | null {
  const n = normalizeWaPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// ─── Document summary message ────────────────────────────────────────────────

/** Minimal shape needed by waDocMessage — accepts the full API doc or any subset. */
export interface WaDoc {
  document_number?: string | null;
  document_date?: string | null;
  document_type_name?: string | null;
  document_type_code?: string | null;
  party_name?: string | null;
  total_ht?: number | string | null;
  total_tva?: number | string | null;
  total_ttc?: number | string | null;
  total_discount?: number | string | null;
  total_stamp?: number | string | null;
  net_to_pay?: number | string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  notes?: string | null;
  lines_count?: number | null;
}

const _fmt = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Build an Arabic summary message for a commercial document, suitable for wa.me prefilled text. */
export function waDocMessage(doc: WaDoc, shareUrl?: string | null): string {
  const lines: string[] = [
    'السلام عليكم،',
    `مرفق مستند ${doc.document_type_name ?? doc.document_type_code ?? ''} رقم ${doc.document_number ?? '—'}`,
    `التاريخ: ${doc.document_date ? new Date(doc.document_date).toLocaleDateString('ar-DZ') : '—'}`,
    ...(doc.party_name ? [`الطرف: ${doc.party_name}`] : []),
    `المجموع HT: ${_fmt(doc.total_ht)} دج`,
    `TVA: ${_fmt(doc.total_tva)} دج`,
  ];
  if (Number(doc.total_discount ?? 0) > 0) lines.push(`الخصم: ${_fmt(doc.total_discount)} دج`);
  if (Number(doc.total_stamp ?? 0) > 0) lines.push(`الطابع: ${_fmt(doc.total_stamp)} دج`);
  lines.push(`الإجمالي TTC: ${_fmt(doc.total_ttc)} دج`);
  if (Number(doc.paid_amount ?? 0) > 0) lines.push(`المدفوع: ${_fmt(doc.paid_amount)} دج`);
  if (Number(doc.remaining_amount ?? 0) > 0) lines.push(`المتبقي: ${_fmt(doc.remaining_amount)} دج`);
  if (doc.notes) lines.push(`ملاحظات: ${doc.notes}`);
  if (shareUrl) lines.push(`\n🔗 رابط الوثيقة: ${shareUrl}`);
  return lines.join('\n');
}
