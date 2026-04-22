// components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;       // Tabler icon class e.g. "ti-package"
  text: string;
  sub?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'ti-mood-empty', text, sub, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-ic"><i className={`ti ${icon}`} /></div>
      <div className="empty-tx">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
