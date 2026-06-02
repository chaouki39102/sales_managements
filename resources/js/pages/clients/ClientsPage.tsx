// resources/js/pages/clients/ClientsPage.tsx
import React, { useState } from 'react';
import { useClients, usePartyMutations } from '@/lib/api/endpoints/parties';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import ClientModal from '@/components/modals/ClientModal';
import type { Party } from '@/types';

// دالة مساعدة لتوليد slug من الاسم (احتياطي)
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Party | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const modal = useModal();

  // جلب العملاء مع العلاقات المطلوبة
  const { data, isLoading, refetch } = useClients({
    search: search || undefined,
    per_page: 10,
    page: currentPage,
    include: 'wilaya,commune,legalForm,defaultPriceLevel'
  });

  const clients = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const meta = (data as any)?.meta;

  // تطبيق الفلتر المحلي (حسب الحالة)
  const filteredClients = clients.filter((c: Party) => {
    if (statusFilter === 'active') return c.active === true;
    if (statusFilter === 'inactive') return c.active === false;
    return true;
  });

  // إحصائيات سريعة
  const withDebt = clients.filter((c: Party) => (c.balance ?? 0) > 0).length;
  const totalDebt = clients.reduce((s: number, c: Party) => s + (c.balance ?? 0), 0);
  const totalBusiness = clients.reduce((s: number, c: Party) => s + (c.total_purchases ?? 0), 0);
  const activeCount = clients.filter((c: Party) => c.active).length;

  const openCreate = () => {
    setEditing(null);
    modal.openModal();
  };

  const openEdit = (c: Party) => {
    setEditing(c);
    modal.openModal();
  };

  // دوال حفظ البيانات
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
      await refetch(); // تحديث القائمة بعد الحفظ
    } catch (err: any) {
      console.error('Submit error:', err);
      throw err;
    }
  };

  // التنقل بين الصفحات
  const goToPage = (page: number) => {
    if (page >= 1 && page <= (meta?.last_page || 1)) {
      setCurrentPage(page);
    }
  };

  if (isLoading) {
    return (
      <div className="empty">
        <div className="empty-ic"><i className="ti ti-loader" /></div>
        <div className="empty-tx">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="page on" id="p-clients">
      <PageHeader
        title="العملاء"
        subtitle={`إدارة قاعدة العملاء — ${meta?.total ?? clients.length} زبون`}
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-table-export" />}>تصدير</Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus" />} onClick={openCreate}>
              زبون جديد
            </Button>
          </>
        }
      />

      {/* بطاقات الأداء */}
      <div className="kpis mb-20">
        <KpiCard variant="green" icon="ti-users" label="إجمالي العملاء" value={meta?.total ?? clients.length} />
        <KpiCard variant="blue" icon="ti-trending-up" label="إجمالي المشتريات" value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
        <KpiCard variant="red" icon="ti-receipt" label="ديون العملاء" value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" sub={`${withDebt} زبون متأخر`} />
        <KpiCard variant="gold" icon="ti-star" label="عملاء نشطون" value={activeCount} />
      </div>

      {/* فلاتر البحث والحالة */}
      <div className="filters mb-16">
        <div className="srch flex flex-1" style={{ minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="ابحث بالاسم، الهاتف، NIF..."
            className="w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="w-40"
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">موقوف فقط</option>
        </select>
      </div>

      {/* جدول العملاء */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon="ti-users"
          text="لا يوجد عملاء"
          sub="أضف زبونك الأول"
          action={<Button variant="primary" onClick={openCreate}>زبون جديد</Button>}
        />
      ) : (
        <Card noHeader className="p-0">
          <div className="tw">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>الولاية / البلدية</th>
                  <th>NIF</th>
                  <th>الرصيد الحالي</th>
                  <th>الحد الائتماني</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c: Party, idx: number) => {
                  const hasDebt = (c.balance ?? 0) > 0;
                  const location = [c.wilaya?.name, c.commune?.name].filter(Boolean).join(' - ') || '—';
                  const avatarColor = ((idx % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

                  return (
                    <tr key={c.id}>
                      <td>{((currentPage - 1) * (meta?.per_page || 10) + idx + 1)}</td>
                      <td>
                        <div className="flex items-center gap-8">
                          <Avatar
                            initials={c.name?.[0] || '?'}
                            color={avatarColor}
                            size={32}
                          />
                          <div>
                            <div className="s font-semibold">{c.name || 'بدون اسم'}</div>
                            {c.commercial_name && (
                              <div className="text-xs text-t4">{c.commercial_name}</div>
                            )}
                          </div>
                        </div>
                       </td>
                      <td className="m">{c.phone || '—'}</td>
                      <td className="text-sm text-t4">{location}</td>
                      <td className="m text-xs">{c.nif || '—'}</td>
                      <td className={hasDebt ? 'text-danger' : ''}>
                        {c.balance?.toLocaleString()} دج
                      </td>
                      <td>{c.credit_limit ? `${c.credit_limit.toLocaleString()} دج` : '—'}</td>
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
        </Card>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="pagination flex justify-center gap-8 mt-20">
          <Button size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
            السابق
          </Button>
          <span className="px-12 py-6 bg-3 rounded-sm">
            صفحة {currentPage} من {meta.last_page}
          </span>
          <Button size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === meta.last_page}>
            التالي
          </Button>
        </div>
      )}

      {/* مودال إضافة/تعديل العميل */}
      <ClientModal
        open={modal.open}
        party={editing}
        onClose={modal.closeModal}
        onSaved={() => refetch()}
        isSubmitting={createMut.isPending || updateMut.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
