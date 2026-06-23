// ════════════════════════════════════════════════════════════════════════════
// pos/components/CustomerSearchModal.tsx
//
// ✅ ميزات:
//   1. بحث فوري بالاسم / الهاتف / رقم التعريف الجبائي
//      — debounced 250ms — يبدأ من حرفين
//   2. إنشاء زبون جديد من POS بدون مغادرة الشاشة
//      الحقول: الاسم + الهاتف + النوع (زبون/مورد) فقط
//      — الباقي اختياري ويُكمَل لاحقاً من صفحة الزبائن
//   3. عرض آخر X زبائن للاختيار السريع
//   4. يُغلَق بـ Escape
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug }   from '@/lib/store/appStore';
import { formatCurrency }  from '@/lib/utils';
import type { Party }      from '@/types';
import type { PaginatedResponse, PartyBalance } from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentClient: Party | null;
  onSelect:      (client: Party | null) => void;
  onClose:       () => void;
}

interface NewClientForm {
  name:         string;
  phone:        string;
  email:        string;
  trade_name:   string;
  nif:          string;
  is_client:    boolean;
}

const EMPTY_FORM: NewClientForm = {
  name:       '',
  phone:      '',
  email:      '',
  trade_name: '',
  nif:        '',
  is_client:  true,
};

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── BalanceLabel ─────────────────────────────────────────────────────────────

function BalanceLabel({ balance }: { balance: PartyBalance | undefined }) {
  if (!balance || balance.current_balance === 0) return null;
  const isDebit = balance.balance_type === 'debit';
  return (
    <div style={{
      fontSize: 11, marginTop: 2, direction: 'ltr', textAlign: 'right',
      color: isDebit ? '#e53935' : '#43a047',
      fontWeight: 600,
    }}>
      {isDebit ? 'مدين: ' : 'دائن: '}
      {formatCurrency(balance.current_balance)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerSearchModal({
  currentClient, onSelect, onClose,
}: Props) {
  const slug          = useActiveSlug();
  const qc            = useQueryClient();
  const searchRef     = useRef<HTMLInputElement>(null);

  const [query,      setQuery]      = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState<NewClientForm>(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');

  const debouncedQuery = useDebounce(query.trim(), 250);
  const isSearching    = debouncedQuery.length >= 2;

  // Focus البحث عند الفتح
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  // Escape يُغلق
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── بحث فوري ──────────────────────────────────────────────────────────────
  const { data: searchResults, isLoading: searching } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-search', debouncedQuery],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        search:   debouncedQuery,
        per_page: 15,
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && isSearching,
    staleTime: 30_000,
  });

  // ── آخر زبائن (بدون بحث) ──────────────────────────────────────────────────
  const { data: recentClients } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-recent'],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        per_page: 500,
        sort_by:  'name',
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && !isSearching,
    staleTime: 5 * 60_000,
  });

  // ── أرصدة الزبائن ─────────────────────────────────────────────────────────
  const { data: balances } = useQuery<PartyBalance[]>({
    queryKey: [slug, 'party-balances'],
    queryFn:  () =>
      apiGet<PartyBalance[]>('/party-balances').then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug,
    staleTime: 60_000,
  });

  const balanceMap = useMemo(() => {
    if (!balances) return new Map<number, PartyBalance>();
    const m = new Map<number, PartyBalance>();
    for (const b of balances) m.set(b.party_id, b);
    return m;
  }, [balances]);

  const displayList: Party[] = isSearching
    ? (searchResults ?? [])
    : (recentClients ?? []);

  // ── إنشاء زبون جديد ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Partial<Party>) =>
      apiPost<Party>('/parties', data),
    onSuccess: (newParty) => {
      // invalidate قائمة الزبائن
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'parties'] });
      onSelect(newParty);
    },
    onError: (err: any) => {
      setFormError(err?.message ?? 'فشل إنشاء الزبون');
    },
  });

  const handleCreate = useCallback(() => {
    if (!form.name.trim()) { setFormError('الاسم إلزامي'); return; }
    setFormError('');
    createMutation.mutate({
      name:       form.name.trim(),
      phone:      form.phone.trim() || null,
      email:      form.email.trim() || null,
      trade_name: form.trade_name.trim() || null,
      nif:        form.nif.trim() || null,
      is_client:  form.is_client,
      is_supplier: !form.is_client,
    } as any);
  }, [form, createMutation]);

  const setField = useCallback(<K extends keyof NewClientForm>(
    key: K, val: NewClientForm[K],
  ) => {
    setForm(p => ({ ...p, [key]: val }));
    setFormError('');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-users" style={{ marginLeft: 6 }} />
            {showCreate ? 'زبون جديد' : 'اختيار الزبون'}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!showCreate && (
              <button
                className="btn btn-xs btn-p"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                <i className="ti ti-plus" /> جديد
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>

        <div className="m-body" style={{ padding: 16 }}>

          {/* ════ وضع البحث ════ */}
          {!showCreate && (
            <>
              {/* شريط البحث */}
              <div className="pos-inp" style={{ marginBottom: 12 }}>
                <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف أو NIF..."
                  style={{ flex: 1 }}
                />
                {query && (
                  <button
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--t4)', cursor: 'pointer', padding: '0 4px',
                    }}
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* زبون عابر */}
              <button
                className={`cust-row cust-anon ${!currentClient ? 'on' : ''}`}
                onClick={() => onSelect(null)}
                type="button"
              >
                <div className="cust-av">
                  <i className="ti ti-user-off" style={{ fontSize: 16 }} />
                </div>
                <div className="cust-info">
                  <div className="cust-name">زبون عابر</div>
                  <div className="cust-meta">بدون تسجيل</div>
                </div>
                {!currentClient && <i className="ti ti-check cust-check" />}
              </button>

              {/* عنوان القائمة */}
              <div className="cust-list-title">
                {isSearching
                  ? searching ? 'جارٍ البحث...' : `${displayList.length} نتيجة`
                  : 'آخر الزبائن'
                }
              </div>

              {/* القائمة */}
              <div className="cust-list">
                {displayList.length === 0 && !searching && isSearching && (
                  <div className="cust-empty">
                    <i className="ti ti-search-off" style={{ fontSize: 28, opacity: 0.3 }} />
                    <div>لا توجد نتائج</div>
                    <button
                      className="btn btn-xs btn-p"
                      onClick={() => { setShowCreate(true); setForm(f => ({ ...f, name: query })); }}
                      type="button"
                      style={{ marginTop: 8 }}
                    >
                      <i className="ti ti-plus" /> إنشاء "{query}"
                    </button>
                  </div>
                )}

                {displayList.map(c => (
                  <button
                    key={c.id}
                    className={`cust-row ${currentClient?.id === c.id ? 'on' : ''}`}
                    onClick={() => onSelect(c)}
                    type="button"
                  >
                    <div className="cust-av">
                      {(c.name?.[0] ?? '؟').toUpperCase()}
                    </div>
                    <div className="cust-info">
                      <div className="cust-name">{c.name}</div>
                      <div className="cust-meta">
                        {c.phone && <span><i className="ti ti-phone" style={{ fontSize: 10 }} /> {c.phone}</span>}
                        {c.nif   && <span>NIF: {c.nif}</span>}
                      </div>
                      <BalanceLabel balance={balanceMap.get(c.id)} />
                    </div>
                    {currentClient?.id === c.id && (
                      <i className="ti ti-check cust-check" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════ وضع الإنشاء ════ */}
          {showCreate && (
            <div className="fgrid">
              {/* الاسم */}
              <div className="fg s2">
                <label className="req">الاسم / السبب الاجتماعي</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="اسم الزبون"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* الهاتف */}
              <div className="fg">
                <label>الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="06XXXXXXXX"
                />
              </div>

              {/* البريد */}
              <div className="fg">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="exemple@mail.com"
                />
              </div>

              {/* الاسم التجاري */}
              <div className="fg">
                <label>الاسم التجاري</label>
                <input
                  type="text"
                  value={form.trade_name}
                  onChange={e => setField('trade_name', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* NIF */}
              <div className="fg">
                <label>رقم التعريف الجبائي (NIF)</label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={e => setField('nif', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* نوع الطرف */}
              <div className="fg s2">
                <label>النوع</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.is_client}
                      onChange={() => setField('is_client', true)}
                    />
                    زبون
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!form.is_client}
                      onChange={() => setField('is_client', false)}
                    />
                    مورد
                  </label>
                </div>
              </div>

              {/* خطأ */}
              {formError && (
                <div className="fg s2">
                  <div className="al al-r">
                    <i className="ti ti-alert-circle" /> {formError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          {showCreate ? (
            <>
              <button
                className="btn"
                onClick={() => { setShowCreate(false); setFormError(''); }}
                type="button"
              >
                <i className="ti ti-arrow-right" /> رجوع
              </button>
              <button
                className="btn btn-p"
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name.trim()}
                type="button"
              >
                {createMutation.isPending
                  ? <><i className="ti ti-loader-2 spin" /> جارٍ الإنشاء...</>
                  : <><i className="ti ti-user-plus" /> إنشاء وتحديد</>
                }
              </button>
            </>
          ) : (
            <button className="btn" onClick={onClose} type="button">إغلاق</button>
          )}
        </div>
      </div>
    </div>
  );
}
