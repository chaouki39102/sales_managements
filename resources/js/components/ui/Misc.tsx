import React from 'react'
import { cn } from '@/lib/cn'

// ════════════════════════════════════════════════════════════
// SWITCH
// ════════════════════════════════════════════════════════════
export function Switch({ checked, onChange, className }: {
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'switch-thumb relative w-[38px] h-[22px] rounded-[11px]',
        'border transition-all duration-[180ms] flex-shrink-0 cursor-pointer',
        checked ? 'bg-[var(--em)] border-[var(--em)]' : 'bg-[var(--bg5)] border-[var(--b3)]',
        checked && 'switch-on',
        className,
      )}
    />
  )
}

// ════════════════════════════════════════════════════════════
// PROGRESS BAR
// ════════════════════════════════════════════════════════════
export function ProgressBar({ value, color = 'em', className }: {
  value: number
  color?: 'em' | 'gold' | 'red' | 'blue'
  className?: string
}) {
  const fillColor = {
    em: 'bg-[var(--em)]', gold: 'bg-[var(--gold)]',
    red: 'bg-[var(--red)]', blue: 'bg-[var(--blue)]',
  }[color]

  return (
    <div className={cn('h-[5px] bg-[var(--bg4)] rounded-[4px] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-[4px] transition-[width_.4s_ease]', fillColor)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════
export function EmptyState({ icon, title, sub, action }: {
  icon?: React.ReactNode
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-[50px] px-5">
      {icon && <div className="text-[42px] opacity-20 mb-3">{icon}</div>}
      <p className="text-[14px] text-[var(--t4)]">{title}</p>
      {sub    && <p className="text-[12px] text-[var(--t4)] mt-1.5">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SEPARATOR
// ════════════════════════════════════════════════════════════
export function Sep({ className }: { className?: string }) {
  return <div className={cn('h-px bg-[var(--b1)] my-3', className)} />
}

export function DotSep() {
  return (
    <span className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--t4)] mx-[5px] align-middle" />
  )
}

// ════════════════════════════════════════════════════════════
// ICON BUTTON (Topbar)
// ════════════════════════════════════════════════════════════
export function IconButton({
  badge, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number }) {
  return (
    <button
      className={cn(
        'w-[34px] h-[34px] rounded-[var(--r2)] bg-[var(--bg3)] border border-[var(--b2)]',
        'flex items-center justify-center cursor-pointer',
        'text-[15px] text-[var(--t3)] transition-all duration-150 flex-shrink-0 relative',
        'hover:bg-[var(--bg4)] hover:text-[var(--t1)]',
        className,
      )}
      {...props}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'absolute -top-1 -right-1 w-4 h-4 rounded-full',
          'bg-[var(--red)] text-white text-[8.5px] font-extrabold',
          'flex items-center justify-center border-2 border-[var(--bg2)]',
        )}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════
interface TabDef {
  key: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export function Tabs({ tabs, active, onChange }: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-b border-[var(--b2)] mb-4 overflow-x-auto scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-[9px] cursor-pointer text-[13px] font-bold',
            'border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap select-none',
            'flex items-center gap-[6px]',
            tab.key === active
              ? 'text-[var(--em)] border-[var(--em)]'
              : 'text-[var(--t4)] border-transparent hover:text-[var(--t2)]',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[9px] font-extrabold px-[5px] py-px rounded-[20px]',
              tab.key === active
                ? 'bg-[var(--emb)] text-[var(--em)]'
                : 'bg-[var(--bg4)] text-[var(--t4)]',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SUMMARY ROW
// ════════════════════════════════════════════════════════════
export function SummaryRow({ label, value, className }: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-[9px] border-b border-[var(--b1)] gap-2 last:border-b-0',
      className,
    )}>
      <span className="text-[12.5px] text-[var(--t3)]">{label}</span>
      <span className="text-[13px] font-bold text-[var(--t1)]">{value}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// GRID LAYOUTS
// ════════════════════════════════════════════════════════════
export function Grid2({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-2 gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid3({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-3 gap-[14px] max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid4({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
export function Grid65({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-[1.8fr_1fr] gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function KpiGrid({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] mb-[18px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
