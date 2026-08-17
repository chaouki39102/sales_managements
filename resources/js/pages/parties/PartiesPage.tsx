// ════════════════════════════════════════════════════════════════════════════
// pages/parties/PartiesPage.tsx
// صفحة الأطراف الموحدة — زبائن + موردون + مختلط
// ════════════════════════════════════════════════════════════════════════════
import {
  useState, useMemo, useCallback, useRef, useEffect, Suspense, lazy,
} from 'react';
import {
  useParties, useClients, useSuppliers, usePartyMutations, partiesApi,
} from '@/lib/api/endpoints/parties';
import { useQueryClient } from '@tanstack/react-query';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useModal }    from '@/hooks/useModal';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useNotification } from '@/hooks/useNotification';
import { buildWhatsAppLink } from '@/lib/wa';

const BarcodeScannerModal = lazy(() => import('@/components/BarcodeScannerModal'));
import PageHeader      from '@/components/ui/PageHeader';
import Badge           from '@/components/ui/Badge';
import Button          from '@/components/ui/Button';
import KpiCard         from '@/components/ui/KpiCard';
import Avatar          from '@/components/ui/Avatar';
import EmptyState      from '@/components/ui/EmptyState';
import SimpleTable     from '@/components/ui/SimpleTable';
import Card            from '@/components/ui/Card';
import PartyFormModal  from '@/components/modals/PartyFormModal';
import PartyStatsModal from '@/components/modals/PartyStatsModal';
import ImportWizardModal from '@/pages/import/ImportWizardModal';
import { PARTY_IMPORT_CONFIG } from '@/pages/import/entityConfig';
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
  const [initType,     setInitType]     = useState<number>(PT.CUSTOMER);
  const [viewParty,    setViewParty]    = useState<Party | null>(null);
  const formModal  = useModal();
  const statsModal = useModal();
  const importModal = useModal();
  const qc = useQueryClient();
  const slug = useActiveSlug();
  const refreshParties = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) }); };

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

  const openCreate = (type: number = PT.CUSTOMER) => { setEditing(null); setInitType(type); formModal.openModal(); };
  const openEdit   = (p: Party) => { setEditing(p); setInitType(p.party_type_id); formModal.openModal(); };
  const openStats  = (p: Party) => { setViewParty(p); statsModal.openModal(); };

  // ── مسح NIF/RC/كود/هاتف بالكاميرا → فتح الطرف (مطابقة الصفحة ثم بحث الخادم) ──
  const notify = useNotification();
  const matchParty = (p: Party, code: string) =>
    p.nif === code || p.rc === code || p.code === code ||
    p.phone === code || p.mobile === code;
  const partyScanner = useBarcodeScan<Party>({
    resolve: async (code) => {
      const local = parties.find((p) => matchParty(p, code));
      if (local) return local;
      try {
        const res = await partiesApi.list({ search: code, per_page: 5, include: 'partyType,wilaya,commune' });
        return (res?.data ?? []).find((p) => matchParty(p, code)) ?? null;
      } catch {
        return null;
      }
    },
    onFound: (p) => openStats(p),
    onNotFound: () => notify.error('لم يتم العثور على طرف بهذا الرقم'),
  });

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
            <Button size="sm" variant="outline" icon={<i className="ti ti-camera" />} onClick={partyScanner.openScanner}>
              مسح بالكاميرا
            </Button>
            <Button size="sm" icon={<i className="ti ti-table-export" />}>تصدير</Button>
            <Button size="sm" icon={<i className="ti ti-table-import" />} onClick={importModal.openModal}>استيراد</Button>
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
          <SimpleTable
            columns={[
              {
                key: '_num',
                label: '#',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  const idx = parties.indexOf(p);
                  return ((page - 1) * (meta?.per_page ?? 25)) + idx + 1;
                },
              },
              {
                key: 'name',
                label: 'الطرف',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  const clr = ((p.id % 7) + 1) as 1|2|3|4|5|6|7;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={p.name?.[0] ?? '?'} color={clr} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        {p.commercial_name && (
                          <div style={{ fontSize: 11, color: 'var(--t4)' }}>{p.commercial_name}</div>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'party_type_id',
                label: 'النوع',
                render: (_v, row) => <PartyTypeBadge typeId={(row as unknown as Party).party_type_id} />,
              },
              {
                key: 'phone',
                label: 'الهاتف',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  const phone = p.phone || p.mobile || '';
                  if (!phone) return <span style={{ fontSize: 12, color: 'var(--t3)' }}>—</span>;
                  const wa = buildWhatsAppLink(phone, '');
                  return wa
                    ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#25D366' }} title="واتساب">{phone} <i className="ti ti-brand-whatsapp" style={{ fontSize: 10 }}/></a>
                    : <span style={{ fontSize: 12, color: 'var(--t3)' }}>{phone}</span>;
                },
              },
              {
                key: 'wilaya',
                label: 'الولاية',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  const location = [p.wilaya?.name, p.commune?.name].filter(Boolean).join(' / ') || '—';
                  return <span style={{ fontSize: 11, color: 'var(--t4)' }}>{location}</span>;
                },
              },
              {
                key: 'nif',
                label: 'NIF',
                render: (_v, row) => (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--t4)' }}>
                    {(row as unknown as Party).nif || '—'}
                  </span>
                ),
              },
              {
                key: 'balance',
                label: 'الرصيد',
                align: 'end',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  const hasDebt = (p.balance ?? 0) > 0;
                  return p.balance !== undefined ? (
                    <span style={{ color: hasDebt ? 'var(--red)' : 'inherit', fontWeight: hasDebt ? 600 : 400, fontSize: 13 }}>
                      {p.balance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>دج</span>
                    </span>
                  ) : '—';
                },
              },
              {
                key: 'credit_limit',
                label: 'الحد',
                align: 'end',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  return (
                    <span style={{ fontSize: 12, color: 'var(--t4)' }}>
                      {p.credit_limit > 0
                        ? `${p.credit_limit.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`
                        : '—'}
                    </span>
                  );
                },
              },
              {
                key: 'active',
                label: 'الحالة',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  return (
                    <Badge variant={p.active ? 'success' : 'danger'}>
                      {p.active ? 'نشط' : 'موقوف'}
                    </Badge>
                  );
                },
              },
              {
                key: '_actions',
                label: '',
                render: (_v, row) => {
                  const p = row as unknown as Party;
                  return (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <Button size="xs" variant="ghost" title="إحصاءات"
                        icon={<i className="ti ti-chart-bar" />}
                        onClick={() => openStats(p)} />
                      <Button size="xs" variant="ghost" title="تعديل"
                        icon={<i className="ti ti-pencil" />}
                        onClick={() => openEdit(p)} />
                    </div>
                  );
                },
              },
            ]}
            data={parties}
            rowKey="id"
            onRowClick={(row) => openStats(row as unknown as Party)}
            rowClassName={(row) => (row as unknown as Party).active ? '' : 'opacity-55'}
          />
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
        onEdit={(p: any) => { statsModal.closeModal(); openEdit(p); }}
      />

      <ImportWizardModal
        open={importModal.open}
        onClose={importModal.closeModal}
        onImported={refreshParties}
        config={PARTY_IMPORT_CONFIG}
      />

      {/* Scan NIF/RC → فتح الطرف */}
      <Suspense fallback={null}>
        <BarcodeScannerModal
          open={partyScanner.open}
          onScan={partyScanner.handleScan}
          onClose={partyScanner.closeScanner}
          title="مسح NIF / RC لفتح الطرف"
          hint="صوّب الكاميرا على رمز NIF أو RC أو هاتف طرف لفتح إحصاءاته"
        />
      </Suspense>
    </div>
  );
}
