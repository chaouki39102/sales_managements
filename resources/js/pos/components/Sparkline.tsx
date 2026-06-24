export default function Sparkline({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="pss-spark">
      <div className="pss-spark-bar" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}
