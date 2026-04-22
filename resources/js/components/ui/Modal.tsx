// components/ui/Modal.tsx
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  footerLeft?: React.ReactNode;
  children: React.ReactNode;
}

const sizeMap = { sm: 'modal-sm', md: '', lg: 'modal-lg' };

export default function Modal({
  open, onClose, title, subtitle,
  size = 'md', footer, footerLeft, children,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className={`ov ${open ? 'on' : ''}`} onClick={onClose}>
      <div
        className={`modal ${sizeMap[size]}`}
        onClick={(e) => e.stopPropagation()}
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
        <div className="m-body">{children}</div>

        {/* Footer */}
        {(footer || footerLeft) && (
          <div className="m-foot">
            {footerLeft && <div className="m-foot-l">{footerLeft}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
