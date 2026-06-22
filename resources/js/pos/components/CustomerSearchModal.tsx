import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug }   from '@/lib/store/appStore';
import type { Party }      from '@/types';
import type { PaginatedResponse } from '@/lib/api/core/types';

interface Props {
  currentClient: Party | null;
  onSelect:      (client: Party | null) => void;
  onClose:       () => void;
}

interface NewClientForm {
  name:   string;
  phone:  string;
  email:  string;
  nif:    string;
  is_client: boolean;
}

const EMPTY_FORM: NewClientForm = {
  name: '', phone: '', email: '', nif: '', is_client: true,
};

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

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

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const { data: searchResults, isLoading: searching } = useQuery<Party[]>({
    queryKey: [slug, 'parties', 'pos-search', debouncedQuery],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/parties', {
        search:    debouncedQuery,
        per_page:  15,
        is_client: 1,
        include:   'partyType',
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && isSearching,
    staleTime: 30_000,
  });

  const { data: recentClients } = useQuery<Party[]>({
    queryKey: [slug, 'parties', 'pos-recent'],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/parties', {
        per_page:  10,
        is_client: 1,
        sort:      '-updated_at',
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && !isSearching,
    staleTime: 5 * 60_000,
  });

  const displayList: Party[] = isSearching
    ? (searchResults ?? [])
    : (recentClients ?? []);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Party>) =>
      apiPost<Party>('/parties', data),
    onSuccess: (newParty) => {
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'parties'] });
      onSelect(newParty);
    },
    onError: (err: any) => {
      setFormError(err?.message ?? 'فشل إنشاء العميل');
    },
  });

  const handleCreate = useCallback(() => {
    if (!form.name.trim()) { setFormError('الاسم إلزامي'); return; }
    setFormError('');
    createMutation.mutate({
      name:       form.name.trim(),
      phone:      form.phone.trim() || null,
      email:      form.email.trim() || null,
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

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-users" style={{ marginLeft: 6 }} />
            {showCreate ? 'عميل جديد' : 'اختيار العميل'}
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

          {!showCreate && (
            <>
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

              <div className="cust-list-title">
                {isSearching
                  ? searching ? 'جارٍ البحث...' : `${displayList.length} نتيجة`
                  : 'آخر العملاء'
                }
              </div>

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
                        {!c.phone && !c.nif && <span style={{ opacity: 0.5 }}>لا معلومات إضافية</span>}
                      </div>
                    </div>
                    {currentClient?.id === c.id && (
                      <i className="ti ti-check cust-check" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {showCreate && (
            <div className="fgrid">
              <div className="fg s2">
                <label className="req">الاسم / السبب الاجتماعي</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="اسم العميل"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="fg">
                <label>الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="06XXXXXXXX"
                />
              </div>
              <div className="fg">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="exemple@mail.com"
                />
              </div>
              <div className="fg">
                <label>رقم التعريف الجبائي (NIF)</label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={e => setField('nif', e.target.value)}
                  placeholder="اختياري"
                />
              </div>
              <div className="fg s2">
                <label>النوع</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.is_client}
                      onChange={() => setField('is_client', true)}
                    />
                    عميل
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
