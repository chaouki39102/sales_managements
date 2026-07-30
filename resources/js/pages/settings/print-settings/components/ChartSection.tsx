import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { UniversalDocumentData } from '../types/data';

interface ChartSectionProps {
  data: UniversalDocumentData;
  chartType: 'bar' | 'pie';
  title?: string;
  width?: number;
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ChartSection({ data, chartType, title, width = 600 }: ChartSectionProps) {
  const breakdown = data.report?.paymentBreakdown || [];
  const hasData = breakdown.length > 0 && breakdown.some(b => b.amount > 0);

  const chartData = useMemo(() => {
    return breakdown.map(b => ({
      name: b.mode,
      value: b.amount,
    }));
  }, [breakdown]);

  if (!data.report) return null;
  if (!hasData) return null;

  const chartWidth = Math.min(width, 560);

  return (
    <div style={{ margin: '12px 0', textAlign: 'center' }}>
      {title && (
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#111' }}>
          {title}
        </div>
      )}

      {chartType === 'bar' ? (
        <div style={{ direction: 'ltr', display: 'inline-block' }}>
          <ResponsiveContainer width={chartWidth} height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#555' }}
                axisLine={{ stroke: '#ddd' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v.toLocaleString('ar-DZ')}`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} دج`, 'المبلغ']}
                contentStyle={{
                  fontSize: 12, borderRadius: 4, border: '1px solid #ddd',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ direction: 'ltr', display: 'inline-block' }}>
          <ResponsiveContainer width={chartWidth} height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} دج`, 'المبلغ']}
                contentStyle={{
                  fontSize: 12, borderRadius: 4, border: '1px solid #ddd',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
