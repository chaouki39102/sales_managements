// components/ui/Modal.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  footerLeft?: React.ReactNode;
  children: React.ReactNode;
  resizable?: boolean;
  storageKey?: string;
  closeOnBackdrop?: boolean;
  className?: string;
  bodyHeight?: number | string;
}

const sizeMap = { sm: 'modal-sm', md: '', lg: 'modal-lg', xl: 'modal-xl' };

// ── تنسيق المودالات المتداخلة (مثل نافذة معلومات المنتج فوق مودال المنتجات) ──
// كومة عامة على مستوى الوحدة تنسّق أمرين بين مودالات مفتوحة معاً:
//  1. Escape يغلق المودال الأعلى فقط (وليس الكل معاً)
//  2. قفل تمرير الصفحة يبقى فعّالاً ما دام أي مودال مفتوحاً
const modalStack: Array<() => void> = [];
let escInstalled = false;
function installEscape() {
  if (escInstalled) return;
  escInstalled = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = modalStack[modalStack.length - 1];
    if (top) {
      e.stopPropagation();
      top();
    }
  });
}
function syncBodyLock() {
  document.body.style.overflow = modalStack.length ? 'hidden' : '';
}

function loadStoredSize(key: string): { width: number; height: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') return parsed;
  } catch { /* ignore */ }
  return null;
}

function hashTitle(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) {
    h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  }
  return 'modal-' + Math.abs(h).toString(36);
}

export default function Modal({
  open, onClose, title, subtitle,
  size = 'md', footer, footerLeft, children,
  resizable = true, storageKey,
  closeOnBackdrop = true, className, bodyHeight,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const resolvedKey = useMemo(
    () => storageKey ?? (typeof title === 'string' ? hashTitle(title) : null),
    [storageKey, title],
  );

  const [dims, setDims] = useState<{ width: number; height: number } | null>(() =>
    (resizable && resolvedKey) ? loadStoredSize(resolvedKey) : null
  );

  // Save to localStorage on resize
  useEffect(() => {
    if (resizable && resolvedKey && dims) {
      localStorage.setItem(resolvedKey, JSON.stringify(dims));
    }
  }, [resizable, resolvedKey, dims]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = modalRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startW: el.offsetWidth, startH: el.offsetHeight,
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const newW = Math.max(400, dragRef.current.startW + dx);
      const newH = Math.max(250, dragRef.current.startH + dy);
      setDims({ width: newW, height: newH });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Close on Escape — يغلق المودال الأعلى فقط عبر كومة المودالات
  // وقفل التمرير يبقى ما دام أي مودال مفتوحاً (يدعم التتالي).
  useEffect(() => {
    if (!open) return;
    installEscape();
    const closer = () => onCloseRef.current();
    modalStack.push(closer);
    syncBodyLock();
    return () => {
      const i = modalStack.lastIndexOf(closer);
      if (i !== -1) modalStack.splice(i, 1);
      syncBodyLock();
    };
  }, [open]);

  const resizableStyle: React.CSSProperties = (resizable && dims) ? {
    width: dims.width,
    height: dims.height,
    maxWidth: dims.width,
    maxHeight: dims.height,
  } : {};

  return (
    <div
      className={`ov ${open ? 'on' : ''}${open ? '' : ' hidden'}`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={modalRef}
        className={`modal ${sizeMap[size]}${className ? ` ${className}` : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={resizableStyle}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">{title}</div>
            {subtitle && <div className="m-sub">{subtitle}</div>}
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Body */}
        <div
          className="m-body"
          style={bodyHeight === undefined ? undefined : {
            flex: '1 1 auto',
            minHeight: 0,
            height: bodyHeight,
          }}
        >{children}</div>

        {/* Footer */}
        {(footer || footerLeft) && (
          <div className="m-foot">
            {footerLeft && <div className="m-foot-l">{footerLeft}</div>}
            {footer}
          </div>
        )}

        {/* Resize handle */}
        {resizable && (
          <div
            onMouseDown={onMouseDown}
            className="modal-resize-handle"
            title="سحب لتغيير الحجم"
          >
            <i className="ti ti-grip-vertical" />
          </div>
        )}
      </div>
    </div>
  );
}
