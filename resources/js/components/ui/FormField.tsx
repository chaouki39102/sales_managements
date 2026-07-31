// resources/js/components/ui/FormField.tsx
import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export default function FormField({ label, required = false, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-5">
      <label className="form-label uppercase tracking-widest">
        {label}
        {required && <span className="text-red ml-2">*</span>}
      </label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
}

export function FormInput({ size = 'md', className = '', ...props }: FormInputProps) {
  const sizeClasses = {
    sm: 'px-8 py-6 text-sm',
    md: 'px-12 py-9 text-base',
    lg: 'px-14 py-10 text-lg',
  };

  return (
    <input
      className={`
        w-full rounded-md border border-b3 bg-3 text-t1
        font-tajawal text-base outline-none transition
        focus:border-em focus:bg-2 focus:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    />
  );
}
