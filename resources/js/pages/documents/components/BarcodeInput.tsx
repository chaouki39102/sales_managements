import { useRef, useEffect, useState } from 'react';
import { inputStyle } from './DocumentUIPrimitives';

interface BarcodeInputProps {
  products: Array<{ id: number; name: string; barcode?: string | null; ref?: string | null }>;
  onProductFound: (productId: number) => void;
  disabled?: boolean;
}

export function BarcodeInput({ products, onProductFound, disabled }: BarcodeInputProps) {
  const [value, setValue] = useState('');
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const notFoundTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
    };
  }, []);

  const handleChange = (raw: string) => {
    const code = raw.trim();
    setValue(code);
    setNotFound(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (code.length < 2) return;

    timeoutRef.current = setTimeout(() => {
      const product = products.find(
        (p) => p.barcode === code || p.ref === code || String(p.id) === code,
      );
      if (product) {
        onProductFound(product.id);
        setValue('');
      } else {
        setNotFound(true);
        if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
        notFoundTimerRef.current = setTimeout(() => setNotFound(false), 2000);
      }
    }, 300);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <i className="ti ti-scan" style={{ fontSize: 16, color: 'var(--t4)' }} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        placeholder="مسح باركود أو إدخال رمز المنتج..."
        onChange={(e) => handleChange(e.target.value)}
        style={{
          ...inputStyle(notFound),
          width: 220,
          fontSize: 12,
          direction: 'ltr',
        }}
      />
      {notFound && (
        <span style={{ fontSize: 11, color: 'var(--red)', whiteSpace: 'nowrap' }}>
          لم يُعثر على المنتج
        </span>
      )}
    </div>
  );
}
