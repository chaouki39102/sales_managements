import React from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'em' | 'gold' | 'red' | 'blue'

const alertStyles: Record<AlertVariant, string> = {
  em:   'bg-[var(--emb)] border-[var(--embo)] text-[var(--em)]',
  gold: 'bg-[var(--goldb)] border-[var(--goldbo)] text-[var(--gold)]',
  red:  'bg-[var(--redb)] border-[var(--redbo)] text-[var(--red)]',
  blue: 'bg-[var(--blueb)] border-[var(--bluebo)] text-[var(--blue)]',
}

export function Alert({
  variant = 'em', icon, children, className,
}: {
  variant?: AlertVariant
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-[10px] px-[14px] py-[11px] rounded-[var(--r2)]',
        'text-[13px] leading-[1.5] mb-3 border',
        alertStyles[variant],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}
