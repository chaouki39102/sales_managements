import { buildWhatsAppLink } from '@/lib/wa';

/**
 * Click-to-chat WhatsApp link. Renders an <a> with the green WhatsApp icon
 * + a small chip label. Returns null when phone is empty/invalid.
 */
export function WhatsAppLink({
  phone,
  text,
  label,
  className = '',
  title,
}: {
  phone: string | null | undefined;
  text: string;
  label?: string;
  className?: string;
  title?: string;
}) {
  const href = buildWhatsAppLink(phone, text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title ?? 'مراسلة عبر واتساب'}
      style={{ color: '#25D366', whiteSpace: 'nowrap' }}
    >
      <i className="ti ti-brand-whatsapp" style={{ fontSize: 16 }} />
      {label && <span style={{ fontSize: 12, marginInlineStart: 4 }}>{label}</span>}
    </a>
  );
}
