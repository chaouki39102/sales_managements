import { useState, useMemo } from 'react';
import { printFieldRegistry, type PrintFieldGroup } from '../../services/PrintFieldRegistry';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (fieldId: string, label: string) => void;
  group?: PrintFieldGroup;
}

const GROUP_LABELS: Record<PrintFieldGroup, string> = {
  customer: 'العميل', document: 'المستند', company: 'الشركة',
  session: 'الجلسة', warehouse: 'المستودع', item: 'المنتجات',
  totals: 'الإجماليات', balance: 'الرصيد', payment: 'الدفع',
  tvaBreakdown: 'تفصيل TVA', footer: 'التذييل', barcode: 'الباركود',
  qr: 'رمز QR', signature: 'التوقيع', report: 'التقرير',
};

export default function FieldPickerModal({ open, onClose, onSelect, group }: Props) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<PrintFieldGroup | 'all'>(group ?? 'all');

  const fields = useMemo(() => {
    const all = printFieldRegistry.getAllFields().filter(f => !f.isRepeating);
    const filtered = activeGroup === 'all' ? all : all.filter(f => f.group === activeGroup);
    if (!search.trim()) return filtered;
    const q = search.trim().toLowerCase();
    return filtered.filter(f =>
      f.id.toLowerCase().includes(q) || f.label.toLowerCase().includes(q)
    );
  }, [search, activeGroup, group]);

  const groups = useMemo(() => {
    const all = printFieldRegistry.getAllFields().filter(f => !f.isRepeating);
    const gs = new Set(all.map(f => f.group));
    return Array.from(gs);
  }, []);

  if (!open) return null;

  return (
    <div className="ps-modal-overlay" onClick={onClose}>
      <div className="ps-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="ps-modal-header">
          <h3>اختيار حقل</h3>
          <button onClick={onClose} className="ps-modal-close">✕</button>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <input
            type="text"
            placeholder="ابحث عن حقل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className={`ps-paper-pill ${activeGroup === 'all' ? 'on' : ''}`}
              onClick={() => setActiveGroup('all')}>الكل</button>
            {groups.map(g => (
              <button key={g} className={`ps-paper-pill ${activeGroup === g ? 'on' : ''}`}
                onClick={() => setActiveGroup(g)}>{GROUP_LABELS[g] || g}</button>
            ))}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
            {fields.map(f => (
              <div key={f.id}
                onClick={() => { onSelect(f.id, f.label); onClose(); }}
                style={{
                  padding: '6px 10px', cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f7fa')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span>{f.label}</span>
                <span style={{ color: '#999', fontSize: 11, direction: 'ltr' }}>{f.id}</span>
              </div>
            ))}
            {fields.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>لا توجد حقول</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
