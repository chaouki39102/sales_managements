// components/ui/ProgressBar.tsx

interface ProgressBarProps {
  value: number;       // 0–100
  color?: string;      // CSS color or var()
  height?: number;
}

export default function ProgressBar({ value, color = 'var(--em)', height = 6 }: ProgressBarProps) {
  return (
    <div className="pb" style={{ height }}>
      <div className="pb-f" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
