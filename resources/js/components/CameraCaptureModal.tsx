import { useEffect, useRef, useState } from 'react';

// B.2 — camera still-capture (getUserMedia → canvas → File), shared across the
// app. Mirrors BarcodeScannerModal's self-contained overlay + z-index convention
// (so Playwright scoping via `div[style*="z-index: 99999"]` works identically).
// The caller receives a real `File` (JPEG) and decides what to do with it —
// e.g. ProductModal keeps it as a pending preview and uploads it on save.

interface Props {
  open: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** عنوان المودال — افتراضياً «التقاط صورة بالكاميرا» */
  title?: string;
  /** سطر توضيحي صغير تحت العنوان */
  hint?: string;
}

const FALLBACK_W = 640;
const FALLBACK_H = 480;

export default function CameraCaptureModal({ open, onCapture, onClose, title, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);

  // ── Stream lifecycle ──
  useEffect(() => {
    if (!open) {
      stopStream();
      setError('');
      setShot(null);
      return;
    }
    setError('');
    setShot(null);
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        try {
          video.srcObject = stream;
          video.play().catch(() => {});
        } catch {
          // srcObject may reject non-MediaStream values in some mocks — surface nothing,
          // the error surface below already covers real permission/device failures.
        }
      } catch (err) {
        const msg = String(err);
        if (msg.includes('NotAllowed') || msg.includes('Permission')) setError('الرجاء السماح باستخدام الكاميرا');
        else if (msg.includes('NotFound') || msg.includes('NoSource') || msg.includes('source')) setError('لم يتم العثور على كاميرا');
        else setError('تعذر تشغيل الكاميرا');
      }
    })();
    return () => { cancelled = true; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  // ── Capture ──
  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || capturing || error) return;
    setCapturing(true);
    try {
      const w = video.videoWidth || FALLBACK_W;
      const h = video.videoHeight || FALLBACK_H;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setCapturing(false); setError('تعذر التقاط الصورة'); return; }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => {
        setCapturing(false);
        if (!blob) { setError('تعذر التقاط الصورة'); return; }
        const file = new File([blob], `product-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setShot(prev => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { file, url: URL.createObjectURL(file) };
        });
      }, 'image/jpeg', 0.9);
    } catch {
      setCapturing(false);
      setError('تعذر التقاط الصورة');
    }
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  }

  function confirmShot() {
    if (!shot) return;
    const file = shot.file;
    URL.revokeObjectURL(shot.url);
    setShot(null);
    onCapture(file);
    onClose();
  }

  // revoke the preview URL when unmounting mid-shot
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, padding: 16,
        width: 380, maxWidth: '92vw', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: hint ? 4 : 12 }}>
          {title ?? 'التقاط صورة بالكاميرا'}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 10 }}>
            {hint}
          </div>
        )}

        {error ? (
          <div style={{ padding: '40px 0', color: '#c0392b', fontSize: 13 }}>{error}</div>
        ) : shot ? (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--b2)' }}>
            <img src={shot.url} alt="معاينة الصورة الملتقطة" style={{ width: '100%', display: 'block' }} />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%', aspectRatio: '4/3', borderRadius: 8,
              background: '#000', objectFit: 'cover', display: 'block',
            }}
          />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {shot ? (
            <>
              <button
                type="button"
                onClick={retake}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  border: '1px solid var(--b3)', background: 'var(--bg3)',
                  cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-refresh" style={{ fontSize: 13 }} /> إعادة
              </button>
              <button
                type="button"
                onClick={confirmShot}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: 'var(--em)', color: '#fff', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <i className="ti ti-check" style={{ fontSize: 13 }} /> استخدام هذه الصورة
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={capture}
              disabled={capturing}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'var(--em)', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                opacity: capturing ? 0.6 : 1,
              }}
            >
              {capturing
                ? <i className="ti ti-loader" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} />
                : <i className="ti ti-camera" style={{ fontSize: 14 }} />}
              {capturing ? 'جاري الالتقاط...' : 'التقاط الصورة'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1px solid var(--b3)', background: 'var(--bg3)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            {error ? 'إغلاق' : 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
}
