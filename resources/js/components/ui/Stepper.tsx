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

    </nav>
  );
};

export default Stepper;
