// components/ui/Switch.tsx

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <div className="flex items-center gap-8">
      <div
        className={`sw ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(!checked); }}
      />
      {label && <span className="text-base text-t2">{label}</span>}
    </div>
  );
}
