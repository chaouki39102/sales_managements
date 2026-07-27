import * as React from 'react';
import { motion, AnimatePresence, LayoutGroup, type Variants } from 'motion/react';
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
  /** Controlled pinned ids — if omitted, PinnedList manages its own state */
  pinnedIds?: Set<string | number>;
  /** Called when a pin is toggled (required if pinnedIds is provided) */
  onTogglePin?: (id: string | number) => void;
  /** Custom item renderer — receives the item, whether it's pinned, and toggle callback */
  renderItem?: (item: PinnedListItem, pinned: boolean, onToggle: () => void) => React.ReactNode;
  /** Highlighted item id (for selection / keyboard nav) */
  selectedId?: string | number | null;
  /** Callback when an item is clicked */
  onSelect?: (item: PinnedListItem) => void;
}

// ─── Animation variants ──────────────────────────────────────────────────────

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 20, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 22 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ─── Default item card ───────────────────────────────────────────────────────

function DefaultItemCard({
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
    <motion.div
      layoutId={String(item.id)}
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'flex items-center gap-3 rounded-[var(--r3)] px-3 py-3',
        'bg-[var(--bg3)] text-[var(--t3)]',
        'border border-transparent',
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
    </motion.div>
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

  const pinned = items.filter((i) => pinnedIds.has(i.id));
  const unpinned = items.filter((i) => !pinnedIds.has(i.id));

  const [showPinnedSection, setShowPinnedSection] = React.useState(pinned.length > 0);
  const pinnedLengthRef = React.useRef(pinned.length);
  pinnedLengthRef.current = pinned.length;

  const [showAllSection, setShowAllSection] = React.useState(true);
  const unpinnedLengthRef = React.useRef(unpinned.length);
  unpinnedLengthRef.current = unpinned.length;

  React.useEffect(() => {
    if (pinned.length > 0) setShowPinnedSection(true);
  }, [pinned.length]);

  React.useEffect(() => {
    if (unpinned.length > 0) setShowAllSection(true);
  }, [unpinned.length]);

  const render = renderItem ?? ((item, p, toggle) => (
    <DefaultItemCard
      item={item}
      pinned={p}
      onToggle={toggle}
      selected={selectedId === item.id}
    />
  ));

  return (
    <LayoutGroup>
      <motion.div
        layout
        className={cn('flex w-full flex-col gap-1', className)}
      >
        <AnimatePresence onExitComplete={() => setShowPinnedSection(false)}>
          {showPinnedSection && pinned.length > 0 && (
            <motion.div
              key="pinned-section"
              layout
              variants={headingVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-1"
            >
              <motion.p
                layout="position"
                className="px-1 pb-0.5 pt-1 text-[11px] font-semibold text-[var(--em)] uppercase tracking-wider"
              >
                {pinnedLabel}
              </motion.p>
              <AnimatePresence
                mode="popLayout"
                onExitComplete={() => {
                  if (pinnedLengthRef.current === 0) setShowPinnedSection(false);
                }}
              >
                {pinned.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={String(item.id)}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => onSelect?.(item)}
                    className={onSelect ? 'cursor-pointer' : undefined}
                  >
                    {render(item, true, () => togglePin(item.id))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence onExitComplete={() => setShowAllSection(false)}>
          {showAllSection && (
            <motion.div
              key="all-section"
              layout
              variants={headingVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-1"
            >
              <motion.p
                layout="position"
                className={cn(
                  'px-1 pb-0.5 text-[11px] font-semibold text-[var(--t4)] uppercase tracking-wider',
                  pinned.length > 0 ? 'pt-3' : 'pt-1',
                )}
              >
                {allLabel}
              </motion.p>
              <AnimatePresence
                mode="popLayout"
                onExitComplete={() => {
                  if (unpinnedLengthRef.current === 0) setShowAllSection(false);
                }}
              >
                {unpinned.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={String(item.id)}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => onSelect?.(item)}
                    className={onSelect ? 'cursor-pointer' : undefined}
                  >
                    {render(item, false, () => togglePin(item.id))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}

export default PinnedList;
