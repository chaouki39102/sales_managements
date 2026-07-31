import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import Modal from '@/components/ui/Modal';
import { useConvertDocument } from '../hooks/useDocumentChain';

interface ConvertDocumentModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onDone:    () => void;
  documentId: number;
  sourceCode: string | null;
  sourceDate: string;
}

export default function ConvertDocumentModal({
  isOpen, onClose, onDone,
  documentId, sourceCode, sourceDate: _sourceDate,
}: ConvertDocumentModalProps) {
  const slug  = useActiveSlug();
  const convertMut = useConvertDocument();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [targetCode, setTargetCode]   = useState('');
  const [docDate, setDocDate]         = useState(todayStr);
  const [error, setError]             = useState('');

  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef  = useRef<HTMLButtonElement>(null);

  const { data: allowedTypes = [] } = useQuery({
    queryKey: tenantKeys.conversions.allowedTargets(slug ?? '', sourceCode ?? ''),
    queryFn:  () => apiGet<{ code: string; name: string }[]>(`/document-type-conversions/${sourceCode ?? ''}/allowed-targets`),
    staleTime: 10 * 60_000,
    enabled: !!sourceCode,
  });

  useEffect(() => {
    if (isOpen) {
      setTargetCode(allowedTypes[0]?.code ?? '');
      setDocDate(todayStr);
      setError('');
    }
  }, [isOpen, todayStr, allowedTypes]);

  const handleConvert = useCallback(() => {
    if (!targetCode) { setError('اختر نوع المستند'); return; }
    if (!docDate)    { setError('اختر التاريخ'); return; }
    setError('');

    convertMut.mutate(
      { documentId, targetTypeCode: targetCode, documentDate: docDate },
      {
        onSuccess: () => { onDone(); onClose(); },
        onError:   (e: unknown) => setError(String((e as Record<string, unknown>)?.message ?? 'فشل التحويل')),
      },
    );
  }, [targetCode, docDate, documentId, convertMut, onDone, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const focusable = document.querySelectorAll<HTMLElement>(
        '#convert-modal input, #convert-modal select, #convert-modal button:not([disabled])'
      );
      const arr = Array.from(focusable);
      const idx = arr.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        arr[(idx - 1 + arr.length) % arr.length]?.focus();
      } else {
        arr[(idx + 1) % arr.length]?.focus();
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === confirmRef.current) {
      e.preventDefault();
      handleConvert();
    }
  }, [onClose, handleConvert]);

  const isLoading = convertMut.isPending;

  return (
    <Modal open={isOpen} onClose={onClose} title="تحويل المستند">
      <div id="convert-modal" style={{ padding: '0 4px' }} onKeyDown={handleKeyDown}>
        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--r2)', marginBottom: 12,
            background: 'var(--redb)', border: '1px solid var(--red)',
            color: 'var(--red)', fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}

        {/* قائمة أنواع المستندات المسموح التحويل إليها */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>
            تحويل إلى
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allowedTypes.map(t => (
              <button
                key={t.code}
                type="button"
                onClick={() => setTargetCode(t.code)}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--em)'; (e.currentTarget as HTMLElement).style.outlineOffset = '1px'; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)', cursor: 'pointer',
                  border: targetCode === t.code ? '2px solid var(--em)' : '1px solid var(--b3)',
                  background: targetCode === t.code ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg2)',
                  color: targetCode === t.code ? 'var(--em)' : 'var(--t2)',
                  fontSize: 13, fontWeight: targetCode === t.code ? 700 : 500,
                  transition: 'all .1s',
                }}
              >
                {t.code} · {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* حقل التاريخ */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>
            تاريخ المستند الجديد
          </label>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>

        {/* الفوتر */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--b1)', paddingTop: 14 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 18px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t2)', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConvert}
            disabled={isLoading || !targetCode}
            style={{
              padding: '8px 24px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--em)', color: '#fff',
              cursor: isLoading || !targetCode ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              opacity: isLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري التحويل…
              </>
            ) : 'تحويل'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
