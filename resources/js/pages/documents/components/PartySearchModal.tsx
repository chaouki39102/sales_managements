import React from 'react';
import Modal from '@/components/ui/Modal';
import type { PartyType } from '@/lib/api/core/types';
import PartyQuickCreateForm, { type PartyQuickCreatePayload } from './PartyQuickCreateForm';

export interface PartyOption {
  id: number;
  label: string;
  sub?: string;
  badge?: string;
}

interface PartySearchModalProps {
  open: boolean;
  isPurchase: boolean;
  options: PartyOption[];
  value: string;
  quickCreateEnabled: boolean;
  partyTypes?: PartyType[];
  creatingParty?: boolean;
  onChange: (id: string) => void;
  onQuickCreate?: (payload: PartyQuickCreatePayload) => void;
  onClose: () => void;
}

const MAX_RESULTS = 80;

function matchesQuery(opt: PartyOption, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    opt.label.toLowerCase().includes(needle) ||
    (opt.sub ?? '').toLowerCase().includes(needle) ||
    (opt.badge ?? '').toLowerCase().includes(needle)
  );
}

/** قائمة بحث المتعاملين بأسلوب POS Pro: فتحة البحث بديلة عن ComboBox داخل
 *  بطاقة المتعامل، مع إنشاء سريع مضمّن ودعم لوحة المفاتيح بالكامل. */
export default function PartySearchModal({
  open, isPurchase, options, value, quickCreateEnabled,
  partyTypes, creatingParty, onChange, onQuickCreate, onClose,
}: PartySearchModalProps) {
  const [query, setQuery] = React.useState('');
  const [hl, setHl] = React.useState(-1);
  const [showCreate, setShowCreate] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const term = isPurchase ? 'مورد' : 'زبون';

  const results = React.useMemo(
    () => options.filter((o) => matchesQuery(o, query)).slice(0, MAX_RESULTS),
    [options, query],
  );

  // ── إعادة ضبط عند كل فتح + تركيز يدوي (المودال يحتفظ بالمحتوى محمّلاً) ──
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setHl(-1);
      setShowCreate(false);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const pick = (o: PartyOption) => {
    onChange(String(o.id));
    onClose();
  };

  const openCreateView = () => {
    if (!quickCreateEnabled || !query.trim()) return;
    setShowCreate(true);
    setHl(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCreate) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!results.length) return;
      const next = (hl + 1) % results.length;
      setHl(next);
      itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      const prev = (hl - 1 + results.length) % results.length;
      setHl(prev);
      itemRefs.current[prev]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (results.length && hl >= 0) {
        e.preventDefault();
        pick(results[hl]);
      } else if (quickCreateEnabled && query.trim()) {
        e.preventDefault();
        openCreateView();
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isPurchase ? 'قائمة الموردين' : 'قائمة الزبائن'}
      size="sm"
      resizable={false}
    >
      <div className="psm">
        <div className="psm-search">
          <i className="ti ti-search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHl(-1); }}
            onKeyDown={handleKeyDown}
            placeholder={`ابحث عن ${term}...`}
          />
          {query && (
            <button
              type="button"
              className="psm-clear"
              onClick={() => { setQuery(''); setHl(-1); inputRef.current?.focus(); }}
              aria-label="مسح البحث"
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {showCreate ? (
          <div className="psm-create">
            <div className="psm-create-hd">
              <i className="ti ti-plus" />
              <span>الإنشاء السريع لـ{term}</span>
              <button
                type="button"
                className="psm-clear"
                onClick={() => setShowCreate(false)}
                aria-label="رجوع"
              >
                <i className="ti ti-arrow-right" />
              </button>
            </div>
            <PartyQuickCreateForm
              key={`${open}-${showCreate}`}
              initialName={query.trim()}
              isPurchase={isPurchase}
              partyTypes={partyTypes}
              creatingParty={creatingParty}
              onCancel={() => setShowCreate(false)}
              onSubmit={(p) => { onQuickCreate?.(p); setShowCreate(false); }}
            />
          </div>
        ) : (
          <>
            <div className="psm-count">
              <span>{results.length}</span> {term}
              {query.trim() && results.length === 0 ? ' — لا توجد نتائج' : ''}
            </div>

            <div className="psm-list">
              {results.length === 0 && (
                <div className="psm-empty">
                  {quickCreateEnabled && query.trim() ? (
                    <>
                      <i className="ti ti-user-plus" />
                      <span>لم يتم العثور على {term} باسم «{query.trim()}»</span>
                      <button type="button" className="psm-create-btn" onClick={openCreateView}>
                        <i className="ti ti-plus" /> إنشاء {term} جديد
                      </button>
                    </>
                  ) : (
                    <>لم يتم العثور على {term}</>
                  )}
                </div>
              )}

              {results.map((o, i) => {
                const selected = String(o.id) === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className={`psm-item${hl === i ? ' hi' : ''}${selected ? ' on' : ''}`}
                    onClick={() => pick(o)}
                    onMouseEnter={() => setHl(i)}
                  >
                    <span className="psm-item-main">
                      <span className="psm-item-label">{o.label}</span>
                      {o.sub && <span className="psm-item-sub">{o.sub}</span>}
                    </span>
                    {o.badge && <span className="psm-item-badge">{o.badge}</span>}
                    {selected && <i className="ti ti-check psm-item-check" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {quickCreateEnabled && !showCreate && (
          <div className="psm-hint">
            لم تجد {term}؟ اكتب الاسم ثم اضغط Enter أو اختر «إنشاء {term} جديد»
          </div>
        )}
      </div>
    </Modal>
  );
}