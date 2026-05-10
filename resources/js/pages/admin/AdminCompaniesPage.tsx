// pages/admin/AdminCompaniesPage.tsx
import { useState, useMemo } from 'react';
import { useAdminCompanies, useAdminCompanyMutations } from '@/hooks/useAdmin';
import type { AdminCompany } from '@/types/admin';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SelectInput from '@/components/forms/SelectInput';
import AlertBar from '@/components/ui/AlertBar';

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};
const STATUS_OPTIONS = [
  { label: 'الكل', value: '' },
  { label: 'نشطة', value: 'active' },
  { label: 'موقوفة', value: 'suspended' },
  { label: 'غير نشطة', value: 'inactive' },
  { label: 'موثقة', value: 'verified' },
];

export default function AdminCompaniesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [planForm, setPlanForm] = useState({ plan: '', max_users: 0, max_products: 0, max_warehouses: 0 });

  const params = useMemo(() => ({
    search: search || undefined,
    status: status || undefined,
    plan: plan || undefined,
    page,
    per_page: 20,
  }), [search, status, plan, page]);

  const { data, isLoading, isError, error, refetch } = useAdminCompanies(params);
  const companies = data?.data ?? [];
  const meta = data?.meta;
  const muts = useAdminCompanyMutations();

  const handleView = (co: AdminCompany) => {
    setSelected(co);
    setNotes(co.notes ?? '');
    setPlanForm({
      plan: co.plan,
      max_users: co.max_users,
      max_products: co.max_products,
      max_warehouses: co.max_warehouses,
    });
    setDetailOpen(true);
  };

  const handleSavePlan = async () => {
    if (!selected) return;
    await muts.changePlan.mutateAsync({ id: selected.id, ...planForm });
    refetch();
  };
  const handleSaveNotes = async () => {
    if (!selected) return;
    await muts.updateNotes.mutateAsync({ id: selected.id, notes });
    refetch();
  };

  const statusBadge = (co: AdminCompany) => {
    if (co.is_suspended) return <Badge variant="danger">موقوف</Badge>;
    if (!co.active) return <Badge variant="gray">غير نشط</Badge>;
    if (co.verified_at) return <Badge variant="success">موثقة</Badge>;
    return <Badge variant="success">نشط</Badge>;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="الشركات" subtitle={`${meta?.total ?? 0} شركة في المنصة`} actions={<Button onClick={() => refetch()}>تحديث</Button>} />

      <div className="filters">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد" />
        <SelectInput options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <SelectInput options={[{ label: 'كل الخطط', value: '' }, ...Object.entries(PLAN_LABELS).map(([v, l]) => ({ label: l, value: v }))]} value={plan} onChange={setPlan} />
        <Button onClick={() => setPage(1)}>تطبيق</Button>
      </div>

      {isError && (
        <AlertBar variant="red">
          تعذّر تحميل الشركات. {(error as any)?.message || 'خطأ غير متوقع'}{' '}
          <button onClick={() => refetch()} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>إعادة المحاولة</button>
        </AlertBar>
      )}

      <Card padding={0}>
        {isLoading ? (
          <div className="empty"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جار التحميل...</div>
        ) : companies.length === 0 ? (
          <div className="empty"><i className="ti ti-building-off" style={{ fontSize: 40, opacity: 0.4 }} /><div>لا توجد شركات</div></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tw">
              <thead>
                <tr><th>الشركة</th><th>المالك</th><th>الخطة</th><th>المستخدمون</th><th>الحالة</th><th></th></tr>
              </thead>
              <tbody>
                {companies.map(co => (
                  <tr key={co.id}>
                    <td><strong>{co.name}</strong><br /><small>/{co.slug}</small></td>
                    <td>{co.owner?.name ?? '—'}</td>
                    <td><Badge variant="info" style={{ background: PLAN_COLORS[co.plan] + '1a', color: PLAN_COLORS[co.plan] }}>{PLAN_LABELS[co.plan] ?? co.plan}</Badge></td>
                    <td>{co.users_count} / {co.max_users}</td>
                    <td>{statusBadge(co)}</td>
                    <td><Button size="xs" onClick={() => handleView(co)}>إدارة</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابقة</Button>
            <span>{page} / {meta.last_page}</span>
            <Button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
          </div>
        )}
      </Card>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.name ?? ''} size="lg">
        {selected && (
          <div>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className="tab on">الخطة</button>
              <button className="tab">ملاحظات</button>
              <button className="tab">إجراءات</button>
            </div>
            <div>
              <SelectInput options={Object.entries(PLAN_LABELS).map(([v, l]) => ({ label: l, value: v }))} value={planForm.plan} onChange={v => setPlanForm(p => ({ ...p, plan: v }))} label="الخطة" />
              <div className="fgrid">
                <div className="fg"><label>حد المستخدمين</label><input type="number" value={planForm.max_users} onChange={e => setPlanForm(p => ({ ...p, max_users: Number(e.target.value) }))} /></div>
                <div className="fg"><label>حد المنتجات</label><input type="number" value={planForm.max_products} onChange={e => setPlanForm(p => ({ ...p, max_products: Number(e.target.value) }))} /></div>
                <div className="fg"><label>حد المستودعات</label><input type="number" value={planForm.max_warehouses} onChange={e => setPlanForm(p => ({ ...p, max_warehouses: Number(e.target.value) }))} /></div>
              </div>
              <Button onClick={handleSavePlan}>حفظ الخطة</Button>

              <div style={{ marginTop: 20 }}>
                <label>ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--b3)' }} />
                <Button onClick={handleSaveNotes}>حفظ الملاحظات</Button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <Button variant="danger" onClick={() => muts.suspend.mutate({ id: selected.id, reason: 'قرار إداري' })}>تعليق</Button>
                <Button variant="warning" onClick={() => muts.unsuspend.mutate(selected.id)}>رفع التعليق</Button>
                <Button variant="success" onClick={() => muts.verify.mutate(selected.id)}>توثيق</Button>
                <Button variant="secondary" onClick={() => muts.unverify.mutate(selected.id)}>إلغاء التوثيق</Button>
                <Button variant="primary" onClick={() => muts.activate.mutate(selected.id)}>تفعيل</Button>
                <Button variant="secondary" onClick={() => muts.deactivate.mutate(selected.id)}>إيقاف</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
