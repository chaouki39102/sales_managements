import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface FloatingTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  maxWidth?: number;
  disabled?: boolean;
  showArrow?: boolean;
  className?: string;
}

const GAP = 10;
const MARGIN = 12;

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(node);
      else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

export function FloatingTooltip({
  content,
  children,
  placement: preferredPlacement = 'top',
  delay = 150,
  maxWidth = 260,
  disabled = false,
  showArrow = true,
  className,
}: FloatingTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; placement: TooltipPlacement }>({
    top: -9999,
    left: -9999,
    placement: preferredPlacement,
  });
  const triggerRef = React.useRef<HTMLElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = React.useState<'closed' | 'measuring' | 'visible'>('closed');

  const show = React.useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      setOpen(true);
      setPhase('measuring');
    }, delay);
  }, [disabled, delay]);

  const hide = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('visible');
    requestAnimationFrame(() => setPhase('closed'));
  }, []);

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  React.useEffect(() => {
    if (phase !== 'measuring' || !triggerRef.current || !bubbleRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const bubble = bubbleRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const tryPlace = (p: TooltipPlacement) => {
      let top = 0, left = 0, fits = false;
      switch (p) {
        case 'top':
          top = trigger.top - bubble.height - GAP;
          left = trigger.left + trigger.width / 2 - bubble.width / 2;
          fits = top >= MARGIN;
          break;
        case 'bottom':
          top = trigger.bottom + GAP;
          left = trigger.left + trigger.width / 2 - bubble.width / 2;
          fits = top + bubble.height <= vh - MARGIN;
          break;
        case 'left':
          top = trigger.top + trigger.height / 2 - bubble.height / 2;
          left = trigger.left - bubble.width - GAP;
          fits = left >= MARGIN;
          break;
        case 'right':
          top = trigger.top + trigger.height / 2 - bubble.height / 2;
          left = trigger.right + GAP;
          fits = left + bubble.width <= vw - MARGIN;
          break;
      }
      return { top, left, fits };
    };

    const order: TooltipPlacement[] = [preferredPlacement, 'bottom', 'top', 'right', 'left'];
    let chosen = preferredPlacement;
    let chosenPos = tryPlace(chosen);

    for (const p of order) {
      const r = tryPlace(p);
      if (r.fits) { chosen = p; chosenPos = r; break; }
    }

    let { top, left } = chosenPos;
    left = Math.max(MARGIN, Math.min(left, vw - bubble.width - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - bubble.height - MARGIN));

    setPos({ top, left, placement: chosen });
    setPhase('visible');
  }, [phase, preferredPlacement]);

  const childRef = (children as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>).ref;

  const childProps = {
    ref: mergeRefs(triggerRef, childRef),
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    tabIndex: 0,
  };

  const p = pos.placement;
  const arrowStyle: Record<TooltipPlacement, React.CSSProperties> = {
    top:    { bottom: -6, left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid var(--t1)' },
    bottom: { top: -6, left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '6px solid var(--t1)' },
    left:   { right: -6, top: '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid var(--t1)' },
    right:  { left: -6, top: '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '6px solid var(--t1)' },
  };

  return (
    <>
      {React.cloneElement(children, childProps)}

      {createPortal(
        open && (
          <div
            ref={bubbleRef}
            role="tooltip"
            className={cn(
              'fixed z-[9999] pointer-events-none',
              'rounded-[var(--r2)]',
              'bg-[var(--t1)] text-[var(--bg2)]',
              'text-xs leading-relaxed font-medium',
              'shadow-[var(--shadow3)]',
              'border border-[var(--b4)]/20',
              phase === 'visible' ? 'opacity-100' : 'opacity-0',
              className,
            )}
            style={{
              top: pos.top,
              left: pos.left,
              maxWidth,
              padding: '10px 14px',
              transition: 'opacity 120ms ease',
            }}
          >
            {content}

            {showArrow && (
              <span
                style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  ...arrowStyle[p],
                }}
              />
            )}
          </div>
        ),
        document.body,
      )}
    </>
  );
}

export default FloatingTooltip;
