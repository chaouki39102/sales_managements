import React, { useMemo } from 'react';
import { useAllFamilies } from '@/lib/api/endpoints/productsEnhanced';
import { familyIcon } from '../utils/posHelpers';
import type { ProductVariant } from '@/lib/api/core/types';

interface CategoryTabsEnhancedProps {
  selected: number | null;
  onSelect: (id: number | null) => void;
  families?: Array<{ id: number; name: string; _count?: { products: number } }>;
  allowAll?: boolean;
  maxVisible?: number;
  className?: string;
}

const DEFAULT_MAX = 15;

export default function CategoryTabsEnhanced({
  selected,
  onSelect,
  families: externalFamilies,
  allowAll = true,
  maxVisible = DEFAULT_MAX,
  className = '',
}: CategoryTabsEnhancedProps) {
  const { data: apiFamilies, isLoading } = useAllFamilies();

  const activeFamilies = useMemo(() => {
    const source = externalFamilies ?? (apiFamilies as Array<{ id: number; name: string; _count?: { products: number } }> | undefined) ?? [];
    return source.slice(0, maxVisible);
  }, [externalFamilies, apiFamilies, maxVisible]);

  if (isLoading && !activeFamilies.length) return null;
  if (!activeFamilies.length) return null;

  return (
    <div className={`pos-cats ${className}`}>
      {allowAll && (
        <button
          className={`pos-cat ${selected === null ? 'on' : ''}`}
          onClick={() => onSelect(null)}
          title="الكل — Alt+0"
        >
          <i className="ti ti-layout-2" />
          <span>الكل</span>
        </button>
      )}
      {activeFamilies.map((f, idx) => (
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
