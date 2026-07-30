// components/ui/Card.tsx
import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  titleIcon?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: string | number;
  noHeader?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function Card({
  title, titleIcon, subtitle, actions, children, className, style, padding, noHeader = false, onClick,
}: CardProps) {
  const hasHeader = !noHeader && (title || subtitle || actions);
  return (
    <div className={`card${className ? ` ${className}` : ''}`} onClick={onClick} style={{ ...(padding !== undefined ? { padding } : {}), ...style }}>
      {hasHeader && (
        <div className="card-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {titleIcon && <i className={`ti ${titleIcon}`} style={{ fontSize: 16 }} />}
            <div>
              {title && <div className="card-title">{title}</div>}
              {subtitle && <div className="card-sub">{subtitle}</div>}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
export { Card };
