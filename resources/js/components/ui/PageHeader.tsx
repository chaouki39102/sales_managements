import React from 'react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

interface PageHeaderBadge {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: PageHeaderBadge;
  tabs?: React.ReactNode;
  className?: string;
}

const badgeVars: Record<string, string> = {
  success: 'var(--color-background-success, #f0fdf4)',
  warning: 'var(--color-background-warning, #fffbeb)',
  danger:  'var(--color-background-danger,  #fef2f2)',
  info:    'var(--color-background-info,    #eff6ff)',
  default: 'var(--color-background-secondary)',
};
const badgeText: Record<string, string> = {
  success: 'var(--color-text-success, #16a34a)',
  warning: 'var(--color-text-warning, #d97706)',
  danger:  'var(--color-text-danger,  #dc2626)',
  info:    'var(--color-text-info,    #2563eb)',
  default: 'var(--color-text-secondary)',
};

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  actions,
  badge,
  tabs,
  className = '',
}) => {
  const variant = badge?.variant ?? 'default';

  return (
    <div className={`ph-wrapper ${className}`}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="ph-breadcrumb">
          <Breadcrumb items={breadcrumb} />
        </div>
      )}

      {/* Main row */}
      <div className="ph-main">
        <div className="ph-title-group">
          <div className="ph-title-row">
            <h1 className="ph-title">{title}</h1>
            {badge && (
              <span
                className="ph-badge"
                style={{
                  background: badgeVars[variant],
                  color: badgeText[variant],
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && <p className="ph-description">{description}</p>}
        </div>

        {actions && <div className="ph-actions">{actions}</div>}
      </div>

      {/* Tabs slot */}
      {tabs && <div className="ph-tabs">{tabs}</div>}

      <style>{`
        .ph-wrapper { display: flex; flex-direction: column; gap: 6px; padding-bottom: 20px; }
        .ph-breadcrumb { margin-bottom: 2px; }
        .ph-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ph-title-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .ph-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ph-title { margin: 0; font-size: 22px; font-weight: 500; color: var(--color-text-primary); line-height: 1.2; }
        .ph-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 500; white-space: nowrap;
        }
        .ph-description { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .ph-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .ph-tabs { margin-top: 8px; border-bottom: 1px solid var(--color-border-tertiary); }
      `}</style>
    </div>
  );
};

export default PageHeader;
