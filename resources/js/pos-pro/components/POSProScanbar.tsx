// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProScanbar.tsx
//
// شريط المسح الضوئي العام — يبقى ظاهراً في أعلى صفحة POS PRO حتى يمسح
// الكاشير الباركود دون الحاجة لفتح مودال المنتجات. يجد العنصر بالضبط
// (باركود / ref / باركود التغليف) عبر onScan ثم يضيفه الأب، وعند الفشل
// يومض بإطار أحمر.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef } from 'react';

interface Props {
  onScan: (code: string) => boolean;
}

export default function POSProScanbar({ onScan }: Props) {
  const [code, setCode]     = useState('');
  const [miss, setMiss]     = useState(false);
  const inputRef            = useRef<HTMLInputElement>(null);
  const missTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const ok = onScan(trimmed);
    if (ok) {
      setCode('');
      inputRef.current?.focus();
    } else {
      setMiss(true);
      if (missTimer.current) clearTimeout(missTimer.current);
      missTimer.current = setTimeout(() => setMiss(false), 500);
      inputRef.current?.select();
    }
  };

  return (
    <div className={`pp-scanbar${miss ? ' pp-scanbar--miss' : ''}`}>
      <i className="ti ti-scan" />
      <input
        ref={inputRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleEnter(); }}
        placeholder="امسح الباركود ثم Enter — يضاف مباشرة للسلة"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {code && (
        <button type="button" className="pp-scanbar-clear" onClick={() => { setCode(''); inputRef.current?.focus(); }}>
          <i className="ti ti-x" />
        </button>
      )}
      <button
        type="button"
        className="pp-scanbar-go"
        onClick={handleEnter}
        title="أضف بالباركود"
      >
        <i className="ti ti-corner-down-left" />
      </button>
    </div>
  );
}
