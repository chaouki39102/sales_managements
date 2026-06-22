import React from 'react';
import { familyIcon } from '../utils/posHelpers';

interface CategoryTabsProps {
  families: { id: number; name: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function CategoryTabs({
  families, selected, onSelect,
}: CategoryTabsProps) {
  if (!families.length) return null;
  return (
    <div className="pos-cats">
      <button
        className={`pos-cat ${selected === null ? 'on' : ''}`}
        onClick={() => onSelect(null)}
        title="الكل — Alt+0"
      >
        <i className="ti ti-layout-2" />
        <span>الكل</span>
      </button>
      {families.map((f, idx) => (
        <button
          key={f.id}
          className={`pos-cat ${selected === f.id ? 'on' : ''}`}
          onClick={() => onSelect(f.id)}
          title={`${f.name} — Alt+${idx + 1}`}
        >
          <i className={`ti ${familyIcon(f.name)}`} />
          <span>{f.name}</span>
          {idx < 9 && <kbd className="cat-kb">Alt+{idx + 1}</kbd>}
        </button>
      ))}
    </div>
  );
}
