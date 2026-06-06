import React from 'react'
import { cn } from '@/lib/cn'

const inputBase = [
  'bg-[var(--bg2)] border border-[var(--b3)] rounded-[var(--r2)]',
  'px-[11px] py-2 text-[13px] text-[var(--t1)] outline-none',
  'font-sans w-full transition-[border-color_.15s,box-shadow_.15s]',
  'placeholder:text-[var(--t4)]',
  'focus:border-[var(--em)] focus:shadow-[0_0_0_3px_var(--emb)]',
  'dark:bg-[var(--bg3)]',
].join(' ')

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBase, 'resize-vertical min-h-[70px]', className)}
      {...props}
    />
  )
}

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn('text-[12px] font-bold text-[var(--t3)] tracking-[.3px]', className)}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--red)] ms-0.5">*</span>}
    </label>
  )
}

export function FormField({ className, children, span, ...props }: React.HTMLAttributes<HTMLDivElement> & { span?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[5px]',
        span === 2 && 'col-span-2',
        span === 3 && 'col-span-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function FormGrid({ cols = 2, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        'max-sm:grid-cols-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Input with suffix (e.g. "دج")
export function InputRow({ suffix, prefix, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  suffix?: string; prefix?: string
}) {
  return (
    <div
      className={cn(
        'flex items-stretch border border-[var(--b3)] rounded-[var(--r2)] overflow-hidden',
        'bg-[var(--bg2)] transition-[border-color_.15s,box-shadow_.15s]',
        'focus-within:border-[var(--em)] focus-within:shadow-[0_0_0_3px_var(--emb)]',
        className,
      )}
      {...props}
    >
      {prefix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-l border-[var(--b3)] flex-shrink-0">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-r border-[var(--b3)] flex-shrink-0">
          {suffix}
        </span>
      )}
    </div>
  )
}
