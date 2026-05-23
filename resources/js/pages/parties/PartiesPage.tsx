// ════════════════════════════════════════════════════════════════════════════
// pages/parties/PartiesPage.tsx
// صفحة الأطراف الموحدة — زبائن + موردون + مختلط
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useMemo, useCallback, useRef, useEffect,
} from 'react';
import {
  useParties, useClients, useSuppliers, usePartyMutations,
} from '@/lib/api/endpoints/parties';
import { useModal }    from '@/hooks/useModal';
import PageHeader      from '@/components/ui/PageHeader';
import Badge           from '@/components/ui/Badge';
import Button          from '@/components/ui/Button';
import KpiCard         from '@/components/ui/KpiCard';
import Avatar          from '@/components/ui/Avatar';
import EmptyState      from '@/components/ui/EmptyState';
import Card            from '@/components/ui/Card';
import PartyFormModal  from '@/components/modals/PartyFormModal';
import PartyStatsModal from '@/components/modals/PartyStatsModal';
import type { Party }  from '@/types';

export const PT = { CUSTOMER: 1, SUPPLIER: 2, BOTH: 3 } as const;
type TabKey    = 'all' | 'customer' | 'supplier' | 'both';
type StatusKey = 'all' | 'active'   | 'inactive';

// ─── PartyTypeBadge ───────────────────────────────────────────────────────────
export function PartyTypeBadge({ typeId }: { typeId: number }) {
  const map: Record<number, { label: string; color: string; icon: string }> = {
    1: { label: 'زبون',        color: 'var(--em)',  icon: 'ti-user' },
    2: { label: 'مورد',        color: 'var(--gold)',icon: 'ti-truck' },
    3: { label: 'زبون & مورد', color: '#8b5cf6',    icon: 'ti-arrows-exchange' },
  };
  const cfg = map[typeId] ?? { label: '—', color: 'var(--t4)', icon: 'ti-user' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>
      <i className={`ti ${cfg.icon}`} style={{ fontSize: 11 }} />{cfg.label}
    </span>
  );
}

// ─── Dropdown New Button ──────────────────────────────────────────────────────
function NewPartyBtn({ onSelect }: { onSelect: (t: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus" />}
        onClick={() => onSelect(PT.CUSTOMER)}
        style={{ borderRadius: '8px 0 0 8px' }}>
        طرف جديد
      </Button>
      <button onClick={() => setOpen(v => !v)} style={{
        padding: '0 8px', background: 'var(--em)', border: '1px solid var(--em)',
        borderRadius: '0 8px 8px 0', cursor: 'pointer', color: '#fff',
        display: 'flex', alignItems: 'center',
      }}>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          minWidth: 160, overflow: 'hidden',
        }}>
          {[
            { id: PT.CUSTOMER, label: 'زبون جديد',  icon: 'ti-user',            color: 'var(--em)' },
            { id: PT.SUPPLIER, label: 'مورد جديد',   icon: 'ti-truck',           color: 'var(--gold)' },
            { id: PT.BOTH,     label: 'زبون و مورد', icon: 'ti-arrows-exchange', color: '#8b5cf6' },
          ].map(o => (
            <button key={o.id} onClick={() => { onSelect(o.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 14px', background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--b1)', cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif', fontSize: 13,
                color: o.color, fontWeight: 600, transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className={`ti ${o.icon}`} />{o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function PartiesPage() {
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [tabKey,       setTabKey]       = useState<TabKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [page,         setPage]         = useState(1);
  const [editing,      setEditing]      = useState<Party | null>(null);
  const [initType,     setInitType]     = useState(PT.CUSTOMER);
  const [viewParty,    setViewParty]    = useState<Party | null>(null);
  const formModal  = useModal();
  const statsModal = useModal();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const partyTypeId = tabKey === 'customer' ? PT.CUSTOMER
    : tabKey === 'supplier' ? PT.SUPPLIER
    : tabKey === 'both' ? PT.BOTH : undefined;

  const activeParam = statusFilter === 'active' ? true
    : statusFilter === 'inactive' ? false : undefined;

  const baseParams = {
    search: debouncedQ || undefined,
    party_type_id: partyTypeId,
    active: activeParam,
    per_page: 25, page,
    include: 'partyType,wilaya,commune',
  };

  const clientQ   = useClients({   ...baseParams, party_type_id: undefined });
  const supplierQ = useSuppliers({ ...baseParams, party_type_id: undefined });
  const allQ      = useParties(baseParams);

  const { data, isLoading } = tabKey === 'customer' ? clientQ
    : tabKey === 'supplier' ? supplierQ : allQ;

  const parties: Party[] = (data as any)?.data ?? [];
  const meta              = (data as any)?.meta;

  const kpi = useMemo(() => ({
    total:    meta?.total ?? parties.length,
    withDebt: parties.filter(p => (p.balance ?? 0) > 0).length,
    totalDebt:parties.reduce((s, p) => s + (p.balance ?? 0), 0),
    active:   parties.filter(p => p.active).length,
  }), [parties, meta]);

  const { create: createMut, update: updateMut } = usePartyMutations();

  const handleSubmit = useCallback(async (formData: Partial<Party>) => {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data: formData });
    else         await createMut.mutateAsync(formData);
  }, [editing, createMut, updateMut]);

  const openCreate = (type = PT.CUSTOMER) => { setEditing(null); setInitType(type); formModal.openModal(); };
  const openEdit   = (p: Party) => { setEditing(p); setInitType(p.party_type_id); formModal.openModal(); };
  const openStats  = (p: Party) => { setViewParty(p); statsModal.openModal(); };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'all',      label: 'الكل',     icon: 'ti-users' },
    { key: 'customer', label: 'الزبائن',  icon: 'ti-user' },
    { key: 'supplier', label: 'الموردون', icon: 'ti-truck' },
    { key: 'both',     label: 'مختلط',    icon: 'ti-arrows-exchange' },
  ];

  return (
    <div className="page on" id="p-parties">
      <PageHeader
        title="الأطراف"
        subtitle={`${meta?.total ?? '...'} طرف — زبائن وموردون`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" icon={<i className="ti ti-table-export" />}>تصدير</Button>
            <NewPartyBtn onSelect={openCreate} />
          </div>
        }
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="blue"  icon="ti-users"   label="الإجمالي"     value={kpi.total} />
        <KpiCard variant="green" icon="ti-check"   label="نشطون"        value={kpi.active} />
        <KpiCard variant="red"   icon="ti-receipt" label="ديون قائمة"
          value={kpi.totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
          unit="دج" sub={kpi.withDebt > 0 ? `${kpi.withDebt} متأخر` : undefined}
        />
        <KpiCard variant="gold" icon="ti-trending-up" label="الصفحة الحالية" value={parties.length} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--b2)', marginBottom: 16, direction: 'rtl' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTabKey(t.key); setPage(1); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              fontWeight: tabKey === t.key ? 700 : 400, fontSize: 13,
              color: tabKey === t.key ? 'var(--em)' : 'var(--t3)',
              borderBottom: tabKey === t.key ? '2px solid var(--em)' : '2px solid transparent',
              marginBottom: -2, transition: 'all .15s',
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />{t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ flex: 2, minWidth: 200, position: 'relative' }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الهاتف، NIF، RC..."
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            }}>
              <i className="ti ti-x" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>
        <select value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as StatusKey); setPage(1); }}
          style={{ width: 150 }}>
          <option value="all">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">موقوف فقط</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ic"><i className="ti ti-loader" /></div>
          <div className="empty-tx">جاري التحميل...</div>
        </div>
      ) : parties.length === 0 ? (
        <EmptyState icon="ti-users"
          text={search ? 'لا نتائج' : 'لا يوجد أطراف'}
          sub={search ? `لا يوجد ما يطابق "${search}"` : 'أضف زبونك أو موردك الأول'}
          action={!search ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={() => openCreate(PT.CUSTOMER)}>زبون جديد</Button>
              <Button onClick={() => openCreate(PT.SUPPLIER)}>مورد جديد</Button>
            </div>
          ) : undefined}
        />
      ) : (
        <Card noHeader style={{ padding: 0 }}>
          <div className="tw">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>الطرف</th>
                  <th>النوع</th>
                  <th>الهاتف</th>
                  <th>الولاية</th>
                  <th>NIF</th>
                  <th style={{ textAlign: 'end' }}>الرصيد</th>
                  <th style={{ textAlign: 'end' }}>الحد</th>
                  <th>الحالة</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p, idx) => {
                  const hasDebt   = (p.balance ?? 0) > 0;
                  const clr       = ((p.id % 7) + 1) as 1|2|3|4|5|6|7;
                  const rowNum    = ((page - 1) * (meta?.per_page ?? 25)) + idx + 1;
                  const location  = [p.wilaya?.name, p.commune?.name].filter(Boolean).join(' / ') || '—';

                  return (
                    <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55, cursor: 'pointer' }}
                      onClick={() => openStats(p)}>
                      <td style={{ color: 'var(--t4)', fontSize: 11 }}>{rowNum}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar initials={p.name?.[0] ?? '?'} color={clr} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                            {p.commercial_name && (
                              <div style={{ fontSize: 11, color: 'var(--t4)' }}>{p.commercial_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><PartyTypeBadge typeId={p.party_type_id} /></td>
                      <td style={{ fontSize: 12, color: 'var(--t3)' }}>{p.phone || p.mobile || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--t4)' }}>{location}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--t4)' }}>{p.nif || '—'}</td>
                      <td style={{ textAlign: 'end' }}>
                        {p.balance !== undefined ? (
                          <span style={{ color: hasDebt ? 'var(--red)' : 'inherit', fontWeight: hasDebt ? 600 : 400, fontSize: 13 }}>
                            {p.balance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                            <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>دج</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'end', fontSize: 12, color: 'var(--t4)' }}>
                        {p.credit_limit > 0
                          ? `${p.credit_limit.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`
                          : '—'}
                      </td>
                      <td>
                        <Badge variant={p.active ? 'success' : 'danger'}>
                          {p.active ? 'نشط' : 'موقوف'}
                        </Badge>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button size="xs" variant="ghost" title="إحصاءات"
                            icon={<i className="ti ti-chart-bar" />}
                            onClick={() => openStats(p)} />
                          <Button size="xs" variant="ghost" title="تعديل"
                            icon={<i className="ti ti-pencil" />}
                            onClick={() => openEdit(p)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <Button size="sm" onClick={() => setPage(1)}           disabled={page === 1}><i className="ti ti-chevrons-right" /></Button>
          <Button size="sm" onClick={() => setPage(p => p - 1)}  disabled={page === 1}><i className="ti ti-chevron-right" /> السابق</Button>
          <span style={{ padding: '6px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12 }}>
            {page} / {meta.last_page}
            <span style={{ color: 'var(--t4)', marginRight: 6 }}>({meta.total} طرف)</span>
          </span>
          <Button size="sm" onClick={() => setPage(p => p + 1)}   disabled={page === meta.last_page}>التالي <i className="ti ti-chevron-left" /></Button>
          <Button size="sm" onClick={() => setPage(meta.last_page)} disabled={page === meta.last_page}><i className="ti ti-chevrons-left" /></Button>
        </div>
      )}

      <PartyFormModal
        open={formModal.open} party={editing}
        initialPartyTypeId={initType}
        onClose={formModal.closeModal} onSaved={formModal.closeModal}
        isSubmitting={createMut.isPending || updateMut.isPending}
        onSubmit={handleSubmit}
      />
      <PartyStatsModal
        open={statsModal.open} party={viewParty}
        onClose={statsModal.closeModal}
        onEdit={p => { statsModal.closeModal(); openEdit(p); }}
      />
    </div>
  );
}
