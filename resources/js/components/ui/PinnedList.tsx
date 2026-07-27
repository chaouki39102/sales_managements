import * as React from 'react';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PinnedListItem {
  id: string | number;
  name: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface PinnedListProps {
  items: PinnedListItem[];
  className?: string;
  pinnedLabel?: string;
  allLabel?: string;
  pinnedIds?: Set<string | number>;
  onTogglePin?: (id: string | number) => void;
  renderItem?: (item: PinnedListItem, pinned: boolean, onToggle: () => void) => React.ReactNode;
  selectedId?: string | number | null;
  onSelect?: (item: PinnedListItem) => void;
}

// ─── Default item card ───────────────────────────────────────────────────────

const DefaultItemCard = React.memo(function DefaultItemCard({
  item,
  pinned,
  onToggle,
  selected,
}: {
  item: PinnedListItem;
  pinned: boolean;
  onToggle: () => void;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[var(--r3)] px-3 py-3',
        'bg-[var(--bg3)] text-[var(--t3)]',
        'border border-transparent',
        'transition-all duration-150 ease-out',
        pinned && 'bg-[var(--em)]/5 border-[var(--em)]/20',
        selected && 'bg-[var(--em)]/10 border-[var(--em)]/30',
      )}
    >
      {item.icon && (
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--r2)]',
            'bg-[var(--bg2)] text-[var(--t3)]',
          )}
        >
          {item.icon}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--t1)]">
          {item.name}
        </p>
        {item.subtitle && (
          <p className="truncate text-[11px] text-[var(--t4)] mt-0.5">
            {item.subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={pinned ? 'إلغاء التثبيت' : 'تثبيت'}
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
          'transition-colors duration-200 cursor-pointer',
          pinned
            ? 'bg-[var(--em)] text-white hover:bg-[var(--em2)]'
            : 'bg-[var(--bg5)] text-[var(--t4)] hover:bg-[var(--bg4)] hover:text-[var(--t2)]',
        )}
      >
        <Pin
          size={14}
          strokeWidth={2}
          className={cn(
            'transition-transform duration-200',
            pinned && '-rotate-45',
          )}
        />
      </button>
    </div>
  );
});

// ─── Animated item wrapper (CSS transitions) ─────────────────────────────────

function AnimatedItem({
  children,
  id,
  items,
  onSelect,
}: {
  children: React.ReactNode;
  id: string | number;
  items: PinnedListItem[];
  onSelect?: (item: PinnedListItem) => void;
}) {
  const [state, setState] = React.useState<'entering' | 'idle' | 'exiting'>('entering');
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setState('idle')));
    return () => { mountedRef.current = false; };
  }, []);

  return (
    <div
      onClick={onSelect ? () => { const item = items.find(i => i.id === id); if (item) onSelect(item); } : undefined}
      className={cn(
        onSelect && 'cursor-pointer',
        'transition-all duration-150 ease-out',
        state === 'entering' && 'opacity-0 translate-y-[-4px]',
        state === 'idle' && 'opacity-100 translate-y-0',
      )}
    >
      {children}
    </div>
  );
}

// ─── Section heading (CSS transition) ────────────────────────────────────────

function SectionHeading({
  label,
  color,
  show,
  compact,
}: {
  label: string;
  color: 'em' | 't4';
  show: boolean;
  compact: boolean;
}) {
  if (!show) return null;
  return (
    <p
      className={cn(
        'px-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider',
        'transition-all duration-150 ease-out',
        color === 'em' ? 'text-[var(--em)]' : 'text-[var(--t4)]',
        compact ? 'pt-3' : 'pt-1',
      )}
    >
      {label}
    </p>
  );
}

// ─── PinnedList ───────────────────────────────────────────────────────────────

export function PinnedList({
  items,
  className,
  pinnedLabel = 'المُثبّتة',
  allLabel = 'الكل',
  pinnedIds: controlledPinnedIds,
  onTogglePin,
  renderItem,
  selectedId,
  onSelect,
}: PinnedListProps) {
  const isControlled = controlledPinnedIds !== undefined;

  const [internalPinnedIds, setInternalPinnedIds] = React.useState<Set<string | number>>(new Set());
  const pinnedIds = isControlled ? controlledPinnedIds : internalPinnedIds;

  const togglePin = React.useCallback((id: string | number) => {
    if (onTogglePin) {
      onTogglePin(id);
    } else {
      setInternalPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }, [onTogglePin]);

  const pinned = React.useMemo(() => items.filter((i) => pinnedIds.has(i.id)), [items, pinnedIds]);
  const unpinned = React.useMemo(() => items.filter((i) => !pinnedIds.has(i.id)), [items, pinnedIds]);

  const render = React.useMemo(() => renderItem ?? ((item: PinnedListItem, p: boolean, toggle: () => void) => (
    <DefaultItemCard
      item={item}
      pinned={p}
      onToggle={toggle}
      selected={selectedId === item.id}
    />
  )), [renderItem, selectedId]);

  const hasPinned = pinned.length > 0;
  const hasUnpinned = unpinned.length > 0;

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {hasPinned && (
        <div className="flex flex-col gap-1">
          <SectionHeading label={pinnedLabel} color="em" show compact={false} />
          {pinned.map((item) => (
            <AnimatedItem key={item.id} id={item.id} items={items} onSelect={onSelect}>
              {render(item, true, () => togglePin(item.id))}
            </AnimatedItem>
          ))}
        </div>
      )}

      {hasUnpinned && (
        <div className="flex flex-col gap-1">
          <SectionHeading label={allLabel} color="t4" show compact={hasPinned} />
          {unpinned.map((item) => (
            <AnimatedItem key={item.id} id={item.id} items={items} onSelect={onSelect}>
              {render(item, false, () => togglePin(item.id))}
            </AnimatedItem>
          ))}
        </div>
      )}
    </div>
  );
}

export default PinnedList;
