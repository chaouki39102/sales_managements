// Note: The CSS classes like 'btn', 'btn-p', 'btn-r', etc., should be defined in your CSS files to style the button accordingly.
// components/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info' | 'outline' | 'secondary' | 'success' | 'ghost' | 'gray';
type ButtonSize    = 'xs' | 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;           // 🆕 إضافة
  children?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  default:  '',
  primary:  'btn-p',
  danger:   'btn-r',
  warning:  'btn-g',
  info:     'btn-b',
  outline:  'btn-outline',
  secondary:'btn-secondary',
  success:  'btn-p',
  ghost:    'btn-ghost',
  gray:     'btn-gray',
};

const sizeMap: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
};

function Button({
  variant = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,            // 🆕
  children,
  className = '',
  disabled: externalDisabled,
  ...props
}: ButtonProps) {
  const isDisabled = externalDisabled || loading;   // يعطل الزر أثناء التحميل

  return (
    <button
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'btn-w' : ''} ${className}`}
      disabled={isDisabled}
      {...props}    // لا نمرر loading هنا
    >
      {/* أيقونة التحميل أو الأيقونة العادية */}
      {loading ? (
        <span className="ic ic-xs" style={{ animation: 'spin 1s linear infinite' }}>
          <i className="ti ti-loader" />
        </span>
      ) : icon ? (
        <span className="ic ic-xs">{icon}</span>
      ) : null}
      {loading ? 'جارٍ التحميل...' : children}
    </button>
  );
}
export default Button;
export { Button };
