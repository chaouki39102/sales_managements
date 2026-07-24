import React, { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fill?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  color = 'var(--blue)',
  fill = true,
  showDots = true,
  showGrid = true,
  formatValue = (v) => v.toLocaleString('ar-DZ'),
  className = '',
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const { points, pathD, fillD, minVal, maxVal } = useMemo(() => {
    if (!data.length) return { points: [], pathD: '', fillD: '', minVal: 0, maxVal: 0 };

    const W = 600;
    const H = height - 40; // padding for labels
    const padL = 48, padR = 16, padT = 16, padB = 24;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => ({
      x: padL + (i / (data.length - 1 || 1)) * chartW,
      y: padT + chartH - ((d.value - minVal) / range) * chartH,
      ...d,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

    return { points, pathD, fillD, minVal, maxVal };
  }, [data, height]);

  const W = 600;
  const H = height;

  if (!data.length) {
    return <div className={`lc-empty ${className}`}>لا توجد بيانات</div>;
  }

  return (
    <div className={`lc-wrapper ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        role="img"
        aria-label="مخطط خطي"
      >
        <defs>
          <linearGradient id="lc-fill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = 16 + (1 - f) * (H - 40);
          const val = minVal + f * (maxVal - minVal);
          return (
            <g key={i}>
              <line
                x1={48} y1={y} x2={W - 16} y2={y}
                stroke="var(--b3)"
                strokeWidth="0.8"
                strokeDasharray="4 3"
              />
              <text
                x={44} y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--t3)"
                fontFamily="inherit"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* Fill area */}
        {fill && <path d={fillD} fill="url(#lc-fill-grad)" />}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
               fill="var(--bg2)"
              stroke={color}
              strokeWidth="2"
              style={{ transition: 'r 0.1s' }}
              r={hovered === i ? 6 : 4}
            />
            {/* Invisible larger hit area */}
            <circle
              cx={p.x} cy={p.y} r="12"
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          // Show fewer labels on crowded charts
          (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
            <text
              key={i}
              x={p.x} y={H - 4}
              textAnchor="middle"
              fontSize="11"
              fill={hovered === i ? "var(--t1)" : "var(--t3)"}
              fontFamily="inherit"
            >
              {p.label}
            </text>
          )
        ))}

        {/* Tooltip */}
        {hovered !== null && points[hovered] && (() => {
          const p = points[hovered];
          const tooltipW = 90;
          const tooltipX = Math.min(Math.max(p.x - tooltipW / 2, 48), W - tooltipW - 16);
          const tooltipY = p.y - 48;
          return (
            <g>
              {/* Vertical guide */}
              <line
                x1={p.x} y1={16} x2={p.x} y2={H - 24}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              {/* Tooltip box */}
              <rect
                x={tooltipX} y={tooltipY}
                width={tooltipW} height={34}
                rx="6"
                fill="var(--t1)"
                opacity="0.9"
              />
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 13} textAnchor="middle" fontSize="11" fill="var(--bg2)" fontFamily="inherit">{p.label}</text>
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 27} textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--bg2)" fontFamily="inherit">{formatValue(p.value)}</text>
            </g>
          );
        })()}
      </svg>


    </div>
  );
};

export default LineChart;
