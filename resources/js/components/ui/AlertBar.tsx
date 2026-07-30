// components/ui/AlertBar.tsx
import React, { useState } from 'react';

type AlertVariant = 'green' | 'gold' | 'red' | 'blue';

interface AlertBarProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  dismissible?: boolean;
  style?: React.CSSProperties;
  onDismiss?: () => void;
}

const variantMap: Record<AlertVariant, string> = {
  green: 'al-g',
  gold:  'al-w',
  red:   'al-r',
  blue:  'al-b',
};

const iconMap: Record<AlertVariant, string> = {
  green: 'ti-alert-triangle',
  gold:  'ti-alert-circle',
  red:   'ti-alert-triangle',
  blue:  'ti-info-circle',
};

export default function AlertBar({ variant = 'green', children, dismissible = true, style, onDismiss }: AlertBarProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className={`al ${variantMap[variant]}`}
      style={{ borderRadius: 'var(--r3)', marginBottom: 18, ...style }}
    >
      <span className="ic ic-sm" style={{ flexShrink: 0, marginTop: 1 }}>
        <i className={`ti ${iconMap[variant]}`} />
      </span>
      <div style={{ flex: 1 }}>{children}</div>
      {dismissible && (
        <button
          onClick={() => { setVisible(false); onDismiss?.(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 0, color: 'inherit' }}
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  );
}
