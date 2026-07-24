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
  success: 'var(--emb)',
  warning: 'var(--goldb)',
  danger:  'var(--redb)',
  info:    'var(--blueb)',
  default: 'var(--bg3)',
};
const badgeText: Record<string, string> = {
  success: 'var(--em)',
  warning: 'var(--gold)',
  danger:  'var(--red)',
  info:    'var(--blue)',
  default: 'var(--t3)',
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
    </div>
  );
};

export default PageHeader;
