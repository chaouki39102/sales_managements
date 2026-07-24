// ════════════════════════════════════════════════════════════════════════════
// pos/components/ManagerPinModal.tsx
//
// نافذة PIN المدير — تظهر عندما يحاول الكاشير تطبيق خصم فوق الحد المسموح
// تُستخدَم مع checkDiscountAllowed() من usePOSSettings
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';

interface ManagerPinModalProps {
  /** النسبة التي طلبها الكاشير */
  requestedDiscount: number;
  /** الحد المضبوط في الإعدادات */
  threshold:         number;
  /** هل السبب تجاوز الحد الكلي أم تجاوز عتبة الـ PIN */
  reason:            'max_exceeded' | 'pin_required';
  /** يُستدعى بعد التحقق الناجح */
  onSuccess: () => void;
  /** يُستدعى عند الإلغاء */
  onCancel:  () => void;
  /** دالة التحقق من الـ PIN */
  verifyPin: (pin: string) => boolean;
}

export default function ManagerPinModal({
  requestedDiscount, threshold, reason, onSuccess, onCancel, verifyPin,
}: ManagerPinModalProps) {
  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // focus تلقائي عند فتح الـ modal
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSubmit = () => {
    if (pin.length !== 4) {
      triggerError('يجب إدخال 4 أرقام');
      return;
    }
    if (!verifyPin(pin)) {
      triggerError('PIN غير صحيح');
      setPin('');
      return;
    }
    onSuccess();
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  const dots = [0, 1, 2, 3].map(i => (
    <div
      key={i}
      style={{
        width: 14, height: 14, borderRadius: '50%',
        background: i < pin.length ? 'var(--em)' : 'var(--b3)',
        transition: 'background .15s',
      }}
    />
  ));

  return (
    <div className="ov on" style={{ zIndex: 9999 }} onClick={e => e.stopPropagation()}>
      <div
        className={`modal modal-sm ${shaking ? 'shake' : ''}`}
        style={{ maxWidth: 340, textAlign: 'center' }}
        onKeyDown={handleKey}
      >
        {/* Icon */}
        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: 'var(--goldb)', border: '2px solid var(--goldbo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'var(--gold)',
          }}>
            <i className="ti ti-lock" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
            تأكيد صلاحية المدير
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
            {reason === 'max_exceeded'
              ? `الخصم المطلوب (${requestedDiscount}%) يتجاوز الحد الأقصى المسموح (${threshold}%)`
              : `الخصم المطلوب (${requestedDiscount}%) يتجاوز العتبة المحددة (${threshold}%)`
            }
            <br />أدخل PIN المدير للمتابعة
          </div>
        </div>

        {/* PIN display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '20px 0 8px' }}>
          {dots}
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            setError('');
            if (val.length === 4) {
              // تحقق تلقائي عند إدخال 4 أرقام
              setTimeout(() => {
                if (!verifyPin(val)) {
                  triggerError('PIN غير صحيح');
                  setPin('');
                } else {
                  onSuccess();
                }
              }, 120);
            }
          }}
          style={{
            position: 'absolute', opacity: 0, width: 1, height: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 20px 8px' }}>
          {['1','2','3','4','5','6','7','8','9'].map(k => (
            <button
              key={k}
              type="button"
              className="npk"
              style={{ padding: 14, fontSize: 18 }}
              onClick={() => {
                if (pin.length < 4) {
                  const next = pin + k;
                  setPin(next);
                  setError('');
                  if (next.length === 4) {
                    setTimeout(() => {
                      if (!verifyPin(next)) {
                        triggerError('PIN غير صحيح');
                        setPin('');
                      } else {
                        onSuccess();
                      }
                    }, 120);
                  }
                }
              }}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            className="npk del"
            onClick={() => { setPin(p => p.slice(0, -1)); setError(''); }}
          >
            <i className="ti ti-backspace" />
          </button>
          <button
            type="button"
            className="npk zero"
            style={{ gridColumn: 'span 2', padding: 14, fontSize: 18 }}
            onClick={() => {
              if (pin.length < 4) {
                const next = pin + '0';
                setPin(next);
                setError('');
                if (next.length === 4) {
                  setTimeout(() => {
                    if (!verifyPin(next)) {
                      triggerError('PIN غير صحيح');
                      setPin('');
                    } else {
                      onSuccess();
                    }
                  }, 120);
                }
              }
            }}
          >
            0
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="al al-r" style={{ margin: '0 16px 8px', justifyContent: 'center', fontSize: 12 }}>
            <i className="ti ti-alert-circle" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="m-foot" style={{ justifyContent: 'center', gap: 10 }}>
          <button className="btn" onClick={onCancel} type="button">إلغاء</button>
        </div>
      </div>


    </div>
  );
}
