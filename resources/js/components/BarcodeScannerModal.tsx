import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  /** عنوان المودال — افتراضياً «مسح الباركود بالكاميرا» */
  title?: string;
  /** سطر توضيحي صغير تحت العنوان */
  hint?: string;
}

const QRZ_CONFIG = { fps: 15, qrbox: { width: 280, height: 280 }, formatsToSupport: [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
] };

const Q = 'html5-qrcode-scanner';

function beep() {
  try { new AudioContext().resume().then(() => { const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); g.gain.value = 0.15; o.frequency.value = 1200; o.start(); o.stop(ctx.currentTime + 0.1); }); } catch { }
}

export default function BarcodeScannerModal({ open, onScan, onClose, title, hint }: Props) {
  const ref = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setError('');
    if (!open) {
      if (startedRef.current && ref.current) {
        ref.current.stop().catch(() => {});
      }
      ref.current = null;
      startedRef.current = false;
      return;
    }
    const el = document.getElementById(Q);
    if (!el) { setError('لم يتم العثور على عنصر الكاميرا'); return; }
    const h = new Html5Qrcode(Q);
    ref.current = h;
    h.start({ facingMode: 'environment' }, QRZ_CONFIG, (txt) => {
      beep();
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      onScan(txt);
      if (startedRef.current) {
        h.stop().catch(() => {});
      }
      ref.current = null;
      startedRef.current = false;
      setTimeout(() => onClose(), 400);
    }, () => {}).then(() => {
      startedRef.current = true;
    }).catch((err) => {
      const msg = String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) setError('الرجاء السماح باستخدام الكاميرا');
      else if (msg.includes('NotFound')) setError('لم يتم العثور على كاميرا');
      else setError('تعذر تشغيل الكاميرا');
      ref.current = null;
      startedRef.current = false;
    });
    return () => {
      if (startedRef.current && ref.current) {
        ref.current.stop().catch(() => {});
      }
      ref.current = null;
      startedRef.current = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, padding: 16,
        width: 360, maxWidth: '90vw', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: hint ? 4 : 12 }}>
          {title ?? 'مسح الباركود بالكاميرا'}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 10 }}>
            {hint}
          </div>
        )}
        {error ? (
          <div style={{ padding: '40px 0', color: '#c0392b', fontSize: 13 }}>{error}</div>
        ) : (
          <div id={Q} style={{
            width: '100%', aspectRatio: '1/0.7', borderRadius: 8,
            overflow: 'hidden', outline: flash ? '4px solid #27ae60' : 'none',
            transition: 'outline 0.1s',
          }} />
        )}
        <button onClick={onClose} type="button" style={{
          marginTop: 12, padding: '8px 24px', borderRadius: 8,
          border: '1px solid var(--b3)', background: 'var(--bg3)',
          cursor: 'pointer', fontSize: 13,
        }}>
          {error ? 'إغلاق' : 'إلغاء'}
        </button>
      </div>
    </div>
  );
}
