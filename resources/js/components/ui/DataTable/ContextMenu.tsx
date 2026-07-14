// DataTable/ContextMenu.tsx

import React, { useEffect, useRef } from 'react';
import type { ContextMenuItem, ContextMenuContext } from './types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** السياق الذي فُتحت منه القائمة — يُمرَّر لكل onClick */
  context: ContextMenuContext;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, context, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // منع خروج القائمة عن الشاشة
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="dt-context-menu"
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: 10000,
        backgroundColor: 'var(--bg2)',
        border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        boxShadow: 'var(--shadow2)',
        minWidth: '180px',
        padding: '4px 0',
      }}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.divider ? (
            <hr style={{ margin: '4px 0', borderColor: 'var(--b1)' }} />
          ) : (
            <button
              className="dt-context-item"
              onClick={() => {
                // ✅ تمرير ContextMenuContext الصحيح — وليس ContextMenuItem
                item.onClick?.(context);
                onClose();
              }}
              disabled={item.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                fontSize: '12px',
                textAlign: 'right',
                cursor: item.disabled ? 'default' : 'pointer',
                color: item.disabled ? 'var(--t4)' : 'var(--t1)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) e.currentTarget.style.backgroundColor = 'var(--bg3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && <i className={`ti ti-${item.icon}`} style={{ fontSize: '14px' }} />}
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
