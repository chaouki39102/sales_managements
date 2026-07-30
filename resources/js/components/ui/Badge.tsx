// components/ui/Badge.tsx
import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'teal' | 'orange' | 'gray' | 'indigo' | 'default' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  noDot?: boolean;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'be',
  danger:  'br',
  warning: 'bg',
  info:    'bb',
  purple:  'bp',
  teal:    'bt',
  orange:  'bo',
  gray:    'bz',
  indigo:  'bi',
  default: 'bz',
  primary: 'be',
};

export default function Badge({ children, variant = 'success', className = '', noDot = false, style, onClick }: BadgeProps) {
  return (
    <span className={`bx ${variantMap[variant]} ${noDot ? 'no-dot' : ''} ${className}`} style={style} onClick={onClick}>
      {children}
    </span>
  );
}
