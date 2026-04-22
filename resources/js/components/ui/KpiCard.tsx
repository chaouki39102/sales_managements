// components/ui/KpiCard.tsx
import React from 'react';

type KpiVariant = 'green' | 'gold' | 'blue' | 'red' | 'purple' | 'teal' | 'orange';
type TrendDir   = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  variant?: KpiVariant;
  icon: string;            // Tabler icon e.g. "ti-cash"
  label: string;
  value: React.ReactNode;
  unit?: string;           // e.g. "دج"
  trend?: string;
  trendDir?: TrendDir;
  sub?: React.ReactNode;
  onClick?: () => void;
}

const varMap: Record<KpiVariant, string> = {
  green:  'ke',
  gold:   'kg',
  blue:   'kb',
  red:    'kr',
  purple: 'kp',
  teal:   'kt',
  orange: 'ko',
};

const trendClass: Record<TrendDir, string> = {
  up:      'up',
  down:    'dn',
  neutral: 'neu',
};

export default function KpiCard({
  variant = 'green', icon, label, value, unit,
  trend, trendDir = 'up', sub, onClick,
}: KpiCardProps) {
  return (
    <div className={`kpi ${varMap[variant]}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="kpi-top">
        <div className="kpi-ic ic">
          <i className={`ti ${icon}`} />
        </div>
        {trend && (
          <div className={`kpi-trend ${trendClass[trendDir]}`}>{trend}</div>
        )}
      </div>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">
        {unit && <span className="u">{unit}</span>}
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
