import React from 'react';

export interface StepperStep {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

type StepStatus = 'complete' | 'current' | 'upcoming';

interface StepperProps {
  steps: StepperStep[];
  currentStep: number; // 0-indexed
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  className = '',
}) => {
  const getStatus = (index: number): StepStatus => {
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="الخطوات" className={`stepper stepper--${orientation} ${className}`}>
      <ol className="stepper__list">
        {steps.map((step, index) => {
          const status = getStatus(index);
          return (
            <li key={index} className={`stepper__item stepper__item--${status}`}>
              {/* Connector line before (not for first item) */}
              {index > 0 && <div className="stepper__connector" />}

              {/* Step indicator */}
              <div className="stepper__indicator-wrapper">
                <div className="stepper__indicator" aria-hidden="true">
                  {status === 'complete'
                    ? <CheckIcon />
                    : step.icon ?? <span className="stepper__number">{index + 1}</span>
                  }
                </div>
              </div>

              {/* Step content */}
              <div className="stepper__content">
                <span className="stepper__label">{step.label}</span>
                {step.description && (
                  <span className="stepper__description">{step.description}</span>
                )}
              </div>

              {/* Connector line after (horizontal only, not for last) */}
              {orientation === 'horizontal' && index < steps.length - 1 && (
                <div className={`stepper__line stepper__line--${status === 'complete' ? 'done' : 'pending'}`} />
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .stepper__list { display: flex; list-style: none; margin: 0; padding: 0; }

        /* Horizontal */
        .stepper--horizontal .stepper__list { flex-direction: row; align-items: flex-start; }
        .stepper--horizontal .stepper__item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; gap: 8px; }
        .stepper--horizontal .stepper__connector { display: none; }
        .stepper--horizontal .stepper__line {
          position: absolute; top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px);
          height: 2px; z-index: 0;
        }
        .stepper--horizontal .stepper__line--done  { background: var(--color-text-info, #3b82f6); }
        .stepper--horizontal .stepper__line--pending { background: var(--color-border-secondary); }
        .stepper--horizontal .stepper__content { text-align: center; display: flex; flex-direction: column; gap: 2px; }

        /* Vertical */
        .stepper--vertical .stepper__list { flex-direction: column; gap: 0; }
        .stepper--vertical .stepper__item { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; position: relative; padding-bottom: 24px; }
        .stepper--vertical .stepper__item:last-child { padding-bottom: 0; }
        .stepper--vertical .stepper__line { display: none; }
        .stepper--vertical .stepper__connector {
          position: absolute; left: 15px; top: -24px; height: 24px; width: 2px;
          background: var(--color-border-secondary);
        }
        .stepper--vertical .stepper__item--complete .stepper__connector { background: var(--color-text-info, #3b82f6); }
        .stepper--vertical .stepper__content { padding-top: 6px; display: flex; flex-direction: column; gap: 2px; }

        /* Indicator */
        .stepper__indicator-wrapper { position: relative; z-index: 1; flex-shrink: 0; }
        .stepper__indicator {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600;
          border: 2px solid;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .stepper__item--complete .stepper__indicator {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff;
        }
        .stepper__item--current .stepper__indicator {
          background: var(--color-background-primary);
          border-color: var(--color-text-info, #3b82f6);
          color: var(--color-text-info, #3b82f6);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent);
        }
        .stepper__item--upcoming .stepper__indicator {
          background: var(--color-background-secondary);
          border-color: var(--color-border-secondary);
          color: var(--color-text-tertiary);
        }
        .stepper__number { font-size: 13px; font-weight: 500; }

        /* Labels */
        .stepper__label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); line-height: 1.3; }
        .stepper__item--current  .stepper__label { color: var(--color-text-primary); }
        .stepper__item--complete .stepper__label { color: var(--color-text-secondary); }
        .stepper__item--upcoming .stepper__label { color: var(--color-text-tertiary); }
        .stepper__description { font-size: 12px; color: var(--color-text-tertiary); }
      `}</style>
    </nav>
  );
};

export default Stepper;
