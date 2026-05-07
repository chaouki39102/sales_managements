import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DrawerPosition = 'right' | 'left';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  position?: DrawerPosition;
  closeOnOverlay?: boolean;
  className?: string;
}

const sizeMap: Record<DrawerSize, string> = {
  sm: '360px',
  md: '480px',
  lg: '600px',
  xl: '760px',
  full: '100vw',
};

const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'right',
  closeOnOverlay = true,
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const width = sizeMap[size];

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={`drawer drawer--${position} ${open ? 'open' : ''} ${className}`}
        style={{ '--drawer-width': width } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="drawer__header">
          <div className="drawer__header-text">
            {title && <h2 className="drawer__title">{title}</h2>}
            {description && <p className="drawer__description">{description}</p>}
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="drawer__body">
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="drawer__footer">{footer}</div>}
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 1040;
          background: rgba(0,0,0,0.4);
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s;
        }
        .drawer-overlay.open { opacity: 1; pointer-events: auto; }

        .drawer {
          position: fixed; top: 0; bottom: 0; z-index: 1050;
          width: min(var(--drawer-width), 100vw);
          background: var(--color-background-primary);
          border-inline-start: 1px solid var(--color-border-tertiary);
          display: flex; flex-direction: column;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -4px 0 24px rgba(0,0,0,0.08);
        }
        .drawer--right { right: 0; transform: translateX(100%); }
        .drawer--left  { left:  0; transform: translateX(-100%); }
        .drawer--right.open,
        .drawer--left.open  { transform: translateX(0); }

        .drawer__header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 20px 20px 16px;
          border-bottom: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
        .drawer__header-text { display: flex; flex-direction: column; gap: 2px; }
        .drawer__title { margin: 0; font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
        .drawer__description { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
        .drawer__close {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border: none; background: transparent;
          border-radius: 6px; cursor: pointer; color: var(--color-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .drawer__close:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .drawer__body { flex: 1; overflow-y: auto; padding: 20px; }
        .drawer__footer {
          padding: 16px 20px;
          border-top: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
      `}</style>
    </>,
    document.body
  );
};

export default Drawer;
