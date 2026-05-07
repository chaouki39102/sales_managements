import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight />,
  className = '',
}) => {
  return (
    <nav aria-label="breadcrumb" className={`breadcrumb ${className}`}>
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb__item">
              {index > 0 && (
                <span className="breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="breadcrumb__current" aria-current="page">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} className="breadcrumb__link">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="breadcrumb__link breadcrumb__button"
                  onClick={item.onClick}
                >
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .breadcrumb { display: inline-flex; }
        .breadcrumb__list {
          display: flex; align-items: center; flex-wrap: wrap;
          list-style: none; margin: 0; padding: 0; gap: 2px;
        }
        .breadcrumb__item { display: flex; align-items: center; gap: 2px; }
        .breadcrumb__separator {
          display: flex; align-items: center;
          color: var(--color-text-tertiary);
          margin: 0 2px;
        }
        .breadcrumb__link, .breadcrumb__button {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; color: var(--color-text-secondary);
          text-decoration: none; background: none; border: none;
          padding: 2px 4px; border-radius: 4px; cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .breadcrumb__link:hover, .breadcrumb__button:hover {
          color: var(--color-text-primary);
          background: var(--color-background-secondary);
        }
        .breadcrumb__current {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 500; color: var(--color-text-primary);
          padding: 2px 4px;
        }
        .breadcrumb__icon { display: flex; align-items: center; font-size: 14px; }
      `}</style>
    </nav>
  );
};

export default Breadcrumb;
