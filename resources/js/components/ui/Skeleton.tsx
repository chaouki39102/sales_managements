import React from 'react';

type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card' | 'table' | 'kpi';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

const Pulse: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className = '' }) => (
  <div className={`skeleton-pulse ${className}`} style={style} />
);

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  rows = 3,
  className = '',
}) => {
  if (variant === 'text') {
    return (
      <div className={`skeleton-text-block ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse
            key={i}
            style={{
              width: i === rows - 1 ? '60%' : (width ?? '100%'),
              height: height ?? 14,
              borderRadius: 4,
            }}
          />
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'circle') {
    const size = width ?? height ?? 40;
    return (
      <>
        <Pulse style={{ width: size, height: size, borderRadius: '50%' }} className={className} />
        <style>{skeletonStyle}</style>
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`skeleton-card ${className}`}>
        <Pulse style={{ height: 120, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 14, width: '70%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 14, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'kpi') {
    return (
      <div className={`skeleton-kpi ${className}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pulse style={{ height: 14, width: '50%', borderRadius: 4 }} />
          <Pulse style={{ width: 32, height: 32, borderRadius: 6 }} />
        </div>
        <Pulse style={{ height: 28, width: '60%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 12, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`skeleton-table ${className}`}>
        {/* Header */}
        <div className="skeleton-table__row skeleton-table__header">
          {[30, 20, 20, 15, 15].map((w, i) => (
            <Pulse key={i} style={{ height: 13, width: `${w}%`, borderRadius: 4 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table__row">
            {[30, 20, 20, 15, 15].map((w, j) => (
              <Pulse key={j} style={{ height: 13, width: `${w - (i % 2) * 5}%`, borderRadius: 4 }} />
            ))}
          </div>
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  // rect (default)
  return (
    <>
      <Pulse
        className={className}
        style={{
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: 6,
        }}
      />
      <style>{skeletonStyle}</style>
    </>
  );
};

const skeletonStyle = `
  @keyframes skeleton-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-pulse {
    display: block;
    background: linear-gradient(
      90deg,
      var(--color-background-secondary, #f0f0f0) 25%,
      var(--color-background-tertiary,  #e0e0e0) 50%,
      var(--color-background-secondary, #f0f0f0) 75%
    );
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.4s infinite linear;
  }
  .skeleton-text-block { display: flex; flex-direction: column; gap: 8px; }
  .skeleton-card { padding: 16px; }
  .skeleton-kpi  { padding: 16px; }
  .skeleton-table { display: flex; flex-direction: column; }
  .skeleton-table__row {
    display: flex; align-items: center; gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border-tertiary);
  }
  .skeleton-table__header { border-bottom: 2px solid var(--color-border-secondary); }
`;

export default Skeleton;
