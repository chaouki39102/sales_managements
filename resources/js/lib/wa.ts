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
