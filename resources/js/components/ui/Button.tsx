// components/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info';
type ButtonSize    = 'xs' | 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-p',
  danger:  'btn-r',
  warning: 'btn-g',
  info:    'btn-b',
};

const sizeMap: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
};

export default function Button({
  variant = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'btn-w' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="ic ic-xs">{icon}</span>}
      {children}
    </button>
  );
}
