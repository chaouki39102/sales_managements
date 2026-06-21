// resources/js/pages/clients/ClientsPage.tsx
import React, { useState, useCallback } from 'react';
import { useClients, usePartyMutations } from '@/lib/api/endpoints/parties';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import SearchInput from '@/components/ui/SearchInput';
import Skeleton from '@/components/ui/Skeleton';
import ClientModal from '@/components/modals/ClientModal';
import ImportWizardModal from '@/pages/import/ImportWizardModal';
import { PARTY_IMPORT_CONFIG } from '@/pages/import/entityConfig';
import type { Party } from '@/types';

// دالة مساعدة لتوليد slug من الاسم (احتياطي)
const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const AVATAR_COLORS = [1, 2, 3, 4, 5, 6, 7] as const;
type StatusFilter = 'all' | 'active' | 'inactive';

export default function ClientsPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing]         = useState<Party | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage]         = useState(25);

  const modal       = useModal();
  const importModal = useModal();

  // ─── جلب البيانات ─────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useClients({
    search:    search || undefined,
    per_page:  perPage,
    page:      currentPage,
    active:    statusFilter === 'all' ? undefined : statusFilter === 'active' ? 1 : 0,
    include:   'wilaya,commune,legalForm,defaultPriceLevel',
  });

  const clients: Party[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const meta             = (data as any)?.meta;

  // ─── إحصائيات KPI ─────────────────────────────────────────────────────────
  const withDebt     = clients.filter((c) => (c.balance ?? 0) > 0).length;
  const totalDebt    = clients.reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalBusiness = clients.reduce((s, c) => s + (c.total_purchases ?? 0), 0);
  const activeCount  = clients.filter((c) => c.active).length;

  // ─── تبديل الفلتر مع إعادة الصفحة للأولى ────────────────────────────────
  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setCurrentPage(1);
  }, []);

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp);
    setCurrentPage(1);
  };

  // ─── مودال إضافة/تعديل ───────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); modal.openModal(); };
  const openEdit   = (c: Party) => { setEditing(c); modal.openModal(); };

  const { create: createMut, update: updateMut } = usePartyMutations();

  const handleSubmit = async (formData: any) => {
    if (!editing && !formData.slug) {
      formData.slug = generateSlug(formData.name);
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: formData });
      } else {
        await createMut.mutateAsync(formData);
      }
      await refetch();
    } catch (err: any) {
      console.error('Submit error:', err);
      throw err;
    }
  };

  // ─── حالة التحميل ────────────────────────────────────────────────────────
  const isSubmitting = createMut.isPending || updateMut.isPending;

  return (
    <div className="page on" id="p-clients">

      {/* ── رأس الصفحة ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="العملاء"
        subtitle={
          isLoading
            ? 'جاري التحميل...'
            : `إدارة قاعدة العملاء — ${(meta?.total ?? clients.length).toLocaleString('ar-DZ')} زبون`
        }
        actions={
          <>
            <Button
              size="sm"
              icon={<i className="ti ti-table-import" />}
              onClick={importModal.openModal}
            >
              استيراد
            </Button>
            <Button size="sm" icon={<i className="ti ti-table-export" />}>
              تصدير
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<i className="ti ti-user-plus" />}
              onClick={openCreate}
            >
              زبون جديد
            </Button>
          </>
        }
      />

      {/* ── بطاقات KPI ─────────────────────────────────────────────────────── */}
      <div className="kpis mb-20">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="kpi ke">
                <Skeleton variant="kpi" />
              </div>
            ))}
          </>
        ) : (
          <>
            <KpiCard
              variant="green"
              icon="ti-users"
              label="إجمالي العملاء"
              value={(meta?.total ?? clients.length).toLocaleString('ar-DZ')}
            />
            <KpiCard
              variant="blue"
              icon="ti-trending-up"
              label="إجمالي المشتريات"
              value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
              unit="دج"
            />
            <KpiCard
              variant="red"
              icon="ti-receipt"
              label="ديون العملاء"
              value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
              unit="دج"
              sub={`${withDebt} زبون متأخر`}
            />
            <KpiCard
              variant="gold"
              icon="ti-star"
              label="عملاء نشطون"
              value={activeCount.toLocaleString('ar-DZ')}
            />
          </>
        )}
      </div>

      {/* ── شريط الفلاتر ───────────────────────────────────────────────────── */}
      <div className="filters mb-16">
        {/* بحث نصي */}
        <SearchInput
          value={search}
          onSearch={handleSearch}
          onChange={handleSearch}
          placeholder="ابحث بالاسم، الهاتف، NIF..."
          loading={isLoading && !!search}
          width="auto"
        />

        {/* فلتر الحالة — أزرار تبديل */}
        <div className="flex gap-4">
          {(
            [
              { val: 'all',      label: 'الكل' },
              { val: 'active',   label: 'نشط' },
              { val: 'inactive', label: 'موقوف' },
            ] as { val: StatusFilter; label: string }[]
          ).map(({ val, label }) => (
            <button
              key={val}
              onClick={() => handleStatusFilter(val)}
              className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── الجدول أو الحالات الفارغة ──────────────────────────────────────── */}
      {isLoading ? (
        <Card noHeader className="p-0">
          <div style={{ padding: 16 }}>
            <Skeleton variant="table" rows={8} />
          </div>
        </Card>
      ) : clients.length === 0 ? (
        <EmptyState
          icon="ti-users"
          text={search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء'}
          sub={search ? `لا يوجد عملاء يطابقون "${search}"` : 'أضف زبونك الأول'}
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
                  <th style={{ width: 48 }}>#</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>الولاية / البلدية</th>
                  <th>NIF</th>
                  <th style={{ textAlign: 'end' }}>الرصيد الحالي</th>
                  <th style={{ textAlign: 'end' }}>الحد الائتماني</th>
                  <th>الحالة</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, idx) => {
                  const hasDebt     = (c.balance ?? 0) > 0;
                  const location    = [c.wilaya?.name, c.commune?.name].filter(Boolean).join(' / ') || '—';
                  const avatarColor = (AVATAR_COLORS[idx % AVATAR_COLORS.length]) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
                  const rowNum      = (currentPage - 1) * perPage + idx + 1;

                  return (
                    <tr key={c.id}>
                      <td className="text-xs" style={{ color: 'var(--t4)' }}>
                        {rowNum}
                      </td>

                      <td>
                        <div className="flex items-center gap-8">
                          <Avatar
                            initials={c.name?.[0]?.toUpperCase() || '؟'}
                            color={avatarColor}
                            size={32}
                          />
                          <div>
                            <div className="s font-semibold">{c.name || 'بدون اسم'}</div>
                            {c.commercial_name && (
                              <div className="text-xs" style={{ color: 'var(--t4)' }}>
                                {c.commercial_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="m">{c.phone || '—'}</td>

                      <td className="text-sm" style={{ color: 'var(--t4)' }}>
                        {location}
                      </td>

                      <td className="m text-xs" style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {c.nif || '—'}
                      </td>

                      <td style={{ textAlign: 'end' }}>
                        <span
                          className={hasDebt ? 'text-danger font-semibold' : ''}
                          style={!hasDebt ? { color: 'var(--t3)' } : undefined}
                        >
                          {(c.balance ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })}
                          <span className="text-xs mr-4" style={{ color: 'var(--t4)' }}>دج</span>
                        </span>
                      </td>

                      <td style={{ textAlign: 'end' }}>
                        {c.credit_limit
                          ? (
                            <>
                              {(+c.credit_limit).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                              <span className="text-xs mr-4" style={{ color: 'var(--t4)' }}>دج</span>
                            </>
                          )
                          : <span style={{ color: 'var(--t4)' }}>—</span>
                        }
                      </td>

                      <td>
                        <Badge variant={c.active ? 'success' : 'danger'}>
                          {c.active ? 'نشط' : 'موقوف'}
                        </Badge>
                      </td>

                      <td>
                        <Button
                          size="xs"
                          icon={<i className="ti ti-pencil" />}
                          onClick={() => openEdit(c)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination داخل البطاقة ───────────────────────────────────── */}
          {meta && meta.last_page > 1 && (
            <div style={{ padding: '0 16px', borderTop: '1px solid var(--bd)' }}>
              <Pagination
                meta={{
                  current_page: meta.current_page,
                  last_page:    meta.last_page,
                  per_page:     meta.per_page ?? perPage,
                  total:        meta.total,
                  from:         meta.from,
                  to:           meta.to,
                  is_first_page: meta.current_page === 1,
                  is_last_page:  meta.current_page === meta.last_page,
                }}
                onPageChange={setCurrentPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={[10, 25, 50, 100]}
                showTotal
                showPageSize
              />
            </div>
          )}

          {/* ── شريط معلومات بسيط عندما الصفحة وحيدة ───────────────────── */}
          {meta && meta.last_page === 1 && (
            <div
              className="flex items-center justify-between"
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--bd)',
                fontSize: 13,
                color: 'var(--t4)',
              }}
            >
              <span>
                عرض {meta.from ?? 1}–{meta.to ?? clients.length} من أصل {(meta.total ?? clients.length).toLocaleString('ar-DZ')} زبون
              </span>
              <div className="flex items-center gap-8">
                <span>عدد السطور:</span>
                <select
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--bd)',
                    fontSize: 13,
                    background: 'var(--bg1)',
                    color: 'var(--t2)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── مودال إضافة / تعديل ────────────────────────────────────────────── */}
      <ClientModal
        open={modal.open}
        party={editing}
        onClose={modal.closeModal}
        onSaved={() => refetch()}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      {/* ── مودال الاستيراد ─────────────────────────────────────────────────── */}
      <ImportWizardModal
        open={importModal.open}
        onClose={importModal.closeModal}
        config={PARTY_IMPORT_CONFIG}
      />
    </div>
  );
}
