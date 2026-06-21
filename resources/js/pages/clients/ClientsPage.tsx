// resources/js/pages/clients/ClientsPage.tsx
import React, { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePartyMutations } from '@/lib/api/endpoints/parties';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import SearchInput from '@/components/ui/SearchInput';
import Skeleton from '@/components/ui/Skeleton';
import ClientModal from '@/components/modals/ClientModal';
import ImportWizardModal from '@/pages/import/ImportWizardModal';
import { PARTY_IMPORT_CONFIG } from '@/pages/import/entityConfig';
import apiClient from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Party } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginationMeta {
  current_page: number;
  last_page:    number;
  per_page:     number;
  total:        number;
  from?:        number;
  to?:          number;
}

interface ClientsApiResponse {
  status: 'success' | 'error';
  data:   Party[];
  meta:   PaginationMeta;
}

// ─── Pagination Component ──────────────────────────────────────────────────────

function ClientsPagination({
  meta,
  onPageChange,
  onPerPageChange,
}: {
  meta:            PaginationMeta;
  onPageChange:    (p: number) => void;
  onPerPageChange: (pp: number) => void;
}) {
  const { current_page, last_page, per_page, total, from, to } = meta;

  const pages: (number | '…')[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current_page > 3) pages.push('…');
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i);
    }
    if (current_page < last_page - 2) pages.push('…');
    pages.push(last_page);
  }

  const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, padding: '0 8px',
    border: `1px solid ${active ? 'var(--em)' : 'var(--bd)'}`,
    borderRadius: 6, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? 'var(--em)' : 'var(--bg1)',
    color: active ? '#fff' : disabled ? 'var(--t4)' : 'var(--t2)',
    opacity: disabled ? 0.45 : 1,
    transition: 'background .12s, border-color .12s',
    userSelect: 'none',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, padding: '10px 16px',
      borderTop: '1px solid var(--bd)', fontSize: 13,
    }}>
      <span style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {from ?? 1}–{to ?? total} من أصل{' '}
        <strong style={{ color: 'var(--t1)' }}>{total.toLocaleString('ar-DZ')}</strong>{' '}
        زبون
      </span>

      {/* direction:ltr دائماً لأرقام الصفحات */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button style={btnStyle(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(1)} title="الصفحة الأولى">
          <i className="ti ti-chevrons-right" style={{ fontSize: 13 }} />
        </button>
        <button style={btnStyle(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)} title="السابق">
          <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--t4)' }}>…</span>
          ) : (
            <button key={p} style={btnStyle(p === current_page)}
              onClick={() => p !== current_page && onPageChange(p as number)}>
              {p}
            </button>
          )
        )}

        <button style={btnStyle(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)} title="التالي">
          <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
        </button>
        <button style={btnStyle(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(last_page)} title="الصفحة الأخيرة">
          <i className="ti ti-chevrons-left" style={{ fontSize: 13 }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t3)' }}>
        <span>عدد السطور:</span>
        <select value={per_page} onChange={(e) => onPerPageChange(Number(e.target.value))}
          style={{
            padding: '3px 6px', border: '1px solid var(--bd)', borderRadius: 6,
            fontSize: 13, background: 'var(--bg1)', color: 'var(--t2)',
            outline: 'none', cursor: 'pointer',
          }}>
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Types & Helpers ──────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive';
const AVATAR_COLORS = [1, 2, 3, 4, 5, 6, 7] as const;

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ─── دالة الجلب — مبنية خارج المكوّن لتجنب إعادة الإنشاء ──────────────────

function fetchClients(params: {
  search:      string;
  activeParam: number | undefined;
  page:        number;
  perPage:     number;
}) {
  // ✅ الإصلاح الأول: إرسال filter كـ nested object — axios يُحوّله إلى
  //    filter[search]=... و filter[active]=... تلقائياً (القيم الصحيحة لـ Laravel)
  //    بدلاً من مفاتيح نقطية "filter[search]" التي تُرسَل كمفتاح مسطح واحد
  const filter: Record<string, unknown> = {};
  if (params.search)                    filter['search'] = params.search;
  if (params.activeParam !== undefined) filter['active'] = params.activeParam;

  return apiClient
    .get<ClientsApiResponse>('/customers', {
      params: {
        per_page: params.perPage,
        page:     params.page,
        include:  'wilaya,commune,legalForm,defaultPriceLevel',
        // ✅ filter كـ object — axios يُسلسله كـ filter[search]= و filter[active]=
        ...(Object.keys(filter).length ? { filter } : {}),
      },
    })
    .then((r) => r.data);
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing]           = useState<Party | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [perPage, setPerPage]           = useState(25);

  const modal       = useModal();
  const importModal = useModal();
  const slug        = useActiveSlug();

  const activeParam: number | undefined =
    statusFilter === 'active' ? 1 : statusFilter === 'inactive' ? 0 : undefined;

  // ✅ الإصلاح الثاني: queryKey يحوي جميع القيم الفردية — React Query يُعيد
  //    الجلب تلقائياً عند تغيير أي منها، بدون الحاجة لـ object كـ dependency
  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ClientsApiResponse>({
    queryKey: ['clients', slug, search, activeParam, currentPage, perPage],
    // ✅ الإصلاح الثالث: params تُبنى داخل queryFn — تضمن دائماً استخدام
    //    القيم الحالية وقت التنفيذ لا وقت بناء الـ object خارجها
    queryFn: () => fetchClients({ search, activeParam, page: currentPage, perPage }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000,
    enabled: !!slug,
  });

  const clients: Party[]            = response?.data ?? [];
  const meta: PaginationMeta | null = response?.meta ?? null;

  // KPI من الصفحة الحالية فقط (إجماليات حقيقية تحتاج /customers/stats)
  const withDebt      = clients.filter((c) => (c.balance ?? 0) > 0).length;
  const totalDebt     = clients.reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalBusiness = clients.reduce((s, c) => s + (c.total_purchases ?? 0), 0);
  const activeCount   = clients.filter((c) => c.active).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp);
    setCurrentPage(1);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); modal.openModal(); };
  const openEdit   = (c: Party) => { setEditing(c); modal.openModal(); };

  const { create: createMut, update: updateMut } = usePartyMutations();
  const isSubmitting = createMut.isPending || updateMut.isPending;

  const handleSubmit = async (formData: any) => {
    if (!editing && !formData.slug) formData.slug = generateSlug(formData.name);
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data: formData });
      else         await createMut.mutateAsync(formData);
      await refetch();
    } catch (err: any) {
      console.error('Submit error:', err);
      throw err;
    }
  };

  const filterBtnStyle = (val: StatusFilter): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 13,
    fontWeight: statusFilter === val ? 600 : 400,
    border: `1px solid ${statusFilter === val ? 'var(--em)' : 'var(--bd)'}`,
    borderRadius: 6,
    background: statusFilter === val ? 'var(--emb)' : 'var(--bg1)',
    color: statusFilter === val ? 'var(--em)' : 'var(--t2)',
    cursor: 'pointer', transition: 'all .12s', userSelect: 'none',
  });

  return (
    <div className="page on" id="p-clients">

      <PageHeader
        title="العملاء"
        subtitle={
          isLoading
            ? 'جاري التحميل...'
            : `إدارة قاعدة العملاء — ${(meta?.total ?? clients.length).toLocaleString('ar-DZ')} زبون`
        }
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-table-import" />} onClick={importModal.openModal}>
              استيراد
            </Button>
            <Button size="sm" icon={<i className="ti ti-table-export" />}>
              تصدير
            </Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus" />} onClick={openCreate}>
              زبون جديد
            </Button>
          </>
        }
      />

      {/* ── KPI ─────────────────────────────────────────────────────────────── */}
      <div className="kpis mb-20">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi ke"><Skeleton variant="kpi" /></div>
          ))
        ) : (
          <>
            <KpiCard variant="green" icon="ti-users" label="إجمالي العملاء"
              value={(meta?.total ?? clients.length).toLocaleString('ar-DZ')} />
            <KpiCard variant="blue" icon="ti-trending-up" label="مشتريات الصفحة"
              value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
            <KpiCard variant="red" icon="ti-receipt" label="ديون الصفحة"
              value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
              sub={`${withDebt} زبون متأخر`} />
            <KpiCard variant="gold" icon="ti-star" label="نشطون في الصفحة"
              value={activeCount.toLocaleString('ar-DZ')} />
          </>
        )}
      </div>

      {/* ── الفلاتر ──────────────────────────────────────────────────────────── */}
      <div className="filters mb-16" style={{ gap: 10 }}>
        <SearchInput
          value={search}
          onSearch={handleSearch}
          onChange={handleSearch}
          placeholder="ابحث بالاسم، الهاتف، NIF..."
          loading={isFetching && !!search}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((val) => (
            <button key={val} style={filterBtnStyle(val)} onClick={() => handleStatusFilter(val)}>
              {val === 'all' ? 'الكل' : val === 'active' ? 'نشط' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* ── المحتوى ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <Card noHeader className="p-0">
          <div style={{ padding: 16 }}><Skeleton variant="table" rows={8} /></div>
        </Card>
      ) : clients.length === 0 ? (
        <EmptyState
          icon="ti-users"
          text={search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء'}
          sub={
            search ? `لا يوجد عملاء يطابقون "${search}"`
            : statusFilter !== 'all' ? 'جرّب تغيير فلتر الحالة'
            : 'أضف زبونك الأول'
          }
          action={
            search
              ? <Button onClick={() => handleSearch('')}>مسح البحث</Button>
              : <Button variant="primary" onClick={openCreate}>زبون جديد</Button>
          }
        />
      ) : (
        <Card noHeader className="p-0">
          <div className="tw">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 48, color: 'var(--t4)' }}>#</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>الولاية / البلدية</th>
                  <th>NIF</th>
                  <th style={{ textAlign: 'end' }}>الرصيد</th>
                  <th style={{ textAlign: 'end' }}>الحد الائتماني</th>
                  <th>الحالة</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {clients.map((c, idx) => {
                  const hasDebt     = (c.balance ?? 0) > 0;
                  const location    = [c.wilaya?.name, c.commune?.name].filter(Boolean).join(' / ') || '—';
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length] as 1|2|3|4|5|6|7;
                  const rowNum      = (currentPage - 1) * perPage + idx + 1;

                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{rowNum}</td>

                      <td>
                        <div className="flex items-center gap-8">
                          <Avatar initials={c.name?.[0]?.toUpperCase() || '؟'} color={avatarColor} size={32} />
                          <div>
                            <div className="s font-semibold">{c.name || 'بدون اسم'}</div>
                            {c.commercial_name && (
                              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                                {c.commercial_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="m">{c.phone || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--t4)' }}>{location}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.nif || '—'}</td>

                      <td style={{ textAlign: 'end' }}>
                        <span style={{ color: hasDebt ? 'var(--red)' : 'var(--t3)', fontWeight: hasDebt ? 600 : 400 }}>
                          {(c.balance ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 3 }}>دج</span>
                      </td>

                      <td style={{ textAlign: 'end' }}>
                        {c.credit_limit ? (
                          <>
                            <span>{(+c.credit_limit).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span>
                            <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 3 }}>دج</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--t4)' }}>—</span>
                        )}
                      </td>

                      <td>
                        <Badge variant={c.active ? 'success' : 'danger'}>
                          {c.active ? 'نشط' : 'موقوف'}
                        </Badge>
                      </td>

                      <td>
                        <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(c)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && (
            <ClientsPagination
              meta={meta}
              onPageChange={setCurrentPage}
              onPerPageChange={handlePerPageChange}
            />
          )}
        </Card>
      )}

      <ClientModal
        open={modal.open}
        party={editing}
        onClose={modal.closeModal}
        onSaved={() => refetch()}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ImportWizardModal
        open={importModal.open}
        onClose={importModal.closeModal}
        config={PARTY_IMPORT_CONFIG}
      />
    </div>
  );
}
