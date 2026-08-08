import { useEffect, useState } from 'react';

interface Props {
  content: string;
  size: number;
}

/**
 * Renders a real QR code from `content` via the `qrcode` npm package.
 * The lib is dynamic-imported so it is code-split out of the main bundle
 * and only fetched when a QR is actually rendered (preview or print popup).
 */
export default function FiscalQR({ content, size }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!content) return undefined;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(content, {
          width: size,
          margin: 0,
          errorCorrectionLevel: 'M',
          color: { dark: '#111111', light: '#ffffff' },
        });
        if (!cancelled) setSrc(url);
      } catch {
        /* keep empty placeholder — non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, size]);

  if (!src) {
    return (
      <div style={{ width: size, height: size, background: '#f5f5f5', border: '1px dashed #ccc' }} />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}
