import React, { useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactNode;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    let top = 0, left = 0;

    switch (position) {
      case 'top':
        top = trigger.top - tooltip.height - gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'bottom':
        top = trigger.bottom + gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.left - tooltip.width - gap + window.scrollX;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.right + gap + window.scrollX;
        break;
    }

    setCoords({ top, left });
  }, [visible, position]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip--${position}`}
          style={{ top: coords.top, left: coords.left }}
          role="tooltip"
        >
          {content}
          <span className="tooltip__arrow" />
        </div>
      )}

      <style>{`
        .tooltip-trigger { display: inline-flex; }
        .tooltip {
          position: fixed;
          z-index: 9999;
          background: var(--color-text-primary, #1a1a1a);
          color: var(--color-background-primary, #fff);
          font-size: 12px;
          line-height: 1.4;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          max-width: 240px;
          white-space: normal;
          animation: tooltip-in 0.12s ease;
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .tooltip__arrow {
          position: absolute;
          width: 0; height: 0;
          border: 5px solid transparent;
        }
        .tooltip--top    .tooltip__arrow { bottom: -10px; left: 50%; transform: translateX(-50%); border-top-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--bottom .tooltip__arrow { top: -10px;    left: 50%; transform: translateX(-50%); border-bottom-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--left   .tooltip__arrow { right: -10px;  top:  50%; transform: translateY(-50%); border-left-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--right  .tooltip__arrow { left:  -10px;  top:  50%; transform: translateY(-50%); border-right-color: var(--color-text-primary, #1a1a1a); }
      `}</style>
    </>
  );
};

export default Tooltip;
