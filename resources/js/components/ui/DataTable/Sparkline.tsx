// ════════════════════════════════════════════════════════════════════════════
// DataTable/Sparkline.tsx  —  v10.4
//
// 🆕 مخطط مصغّر (Sparkline) SVG بدون أي تبعيات خارجية.
// يُستخدم عادةً في خلية عمود عبر: col.render = row => <Sparkline data={...} />
// أنواع: خط (line) / منطقة ملوّنة (area) / أعمدة (bar).
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';

export interface SparklineProps {
  data: readonly number[];
  width?: number;
  height?: number;
  type?: 'line' | 'area' | 'bar';
  stroke?: string;
  fill?: string;
  min?: number;
  max?: number;
  strokeWidth?: number;
  barGap?: number;
  ariaLabel?: string;
}

export function Sparkline({
  data,
  width = 96,
  height = 28,
  type = 'line',
  stroke = 'var(--em, #0a8c5c)',
  fill,
  min,
  max,
  strokeWidth = 1.5,
  barGap = 1,
  ariaLabel = 'مخطط مصغّر',
}: SparklineProps): React.ReactElement | null {
  if (!data || data.length === 0) return null;

  const PAD = 2;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const range = hi - lo || 1;

  const x = (i: number): number => {
    if (data.length === 1) return width / 2;
    return PAD + (i / (data.length - 1)) * (width - PAD * 2);
  };
  const y = (v: number): number =>
    height - PAD - ((v - lo) / range) * (height - PAD * 2);

  const plotId = React.useId().replace(/:/g, '');
  const gradId = `spark-${plotId}`;

  if (type === 'bar') {
    const n = data.length;
    const barW = Math.max(
      1,
      (width - PAD * 2 - barGap * (n - 1)) / n,
    );
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={ariaLabel}
        role="img"
      >
        {data.map((v, i) => {
          const barX = PAD + i * (barW + barGap);
          const barY = y(v);
          return (
            <rect
              key={i}
              x={barX}
              y={barY}
              width={barW}
              height={Math.max(1, height - PAD - barY)}
              fill={fill ?? stroke}
              rx={Math.min(1, barW / 3)}
            />
          );
        })}
      </svg>
    );
  }

  const points = data.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={ariaLabel}
      role="img"
    >
      {type === 'area' && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill ?? stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fill ?? stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon
            points={`${points} ${x(data.length - 1).toFixed(2)},${height - PAD} ${x(0).toFixed(2)},${height - PAD}`}
            fill={`url(#${gradId})`}
            stroke="none"
          />
        </>
      )}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
