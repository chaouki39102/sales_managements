// components/ui/Card.tsx
import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: string | number;
  noHeader?: boolean;
}

export default function Card({
  title, subtitle, actions, children, style, padding, noHeader = false,
}: CardProps) {
  const hasHeader = !noHeader && (title || subtitle || actions);
  return (
    <div className="card" style={{ ...(padding !== undefined ? { padding } : {}), ...style }}>
      {hasHeader && (
        <div className="card-hd">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
