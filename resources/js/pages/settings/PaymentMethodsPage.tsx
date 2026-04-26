// resources/js/pages/settings/PaymentMethodsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

// --------------- Types ---------------
interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description?: string;
  treasury_account_id?: number | null;
  requires_reference: boolean;
  is_cash: boolean;
  active: boolean;
  display_order: number;
  relations?: {
    treasuryAccount?: { id: number; name: string };
  };
}

interface TreasuryAccount {
  id: number;
  name: string;
}

// --------------- API Layer ---------------
const paymentMethodsApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/payment-modes', { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/payment-modes', data).then(r => r.data),
  update: (id: number, data: any) =>
    apiClient.put(`/payment-modes/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/payment-modes/${id}`).then(r => r.data),
};

// --------------- Debounce ---------------
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// =============== Main Component ===============
export default function PaymentMethodsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods
  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: ['payment-modes', debouncedSearch, page, perPage],
    queryFn: () => paymentMethodsApi.list({
      'filter[search]': debouncedSearch || undefined,
      sort: 'name',
      per_page: perPage,
      page,
      include: 'treasuryAccount',
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const methods: PaymentMethod[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  // Treasury accounts (for modal)
  const { data: treasuryAccounts } = useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts-select'],
    queryFn: () => apiClient.get('/treasury-accounts', { params: { per_page: 200 } })
      .then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentMethodsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-modes'] });
      deleteModal.closeModal();
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'فشل الحذف');
      deleteModal.closeModal();
    },
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteModal.openModal();
  };
  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };

  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: PaymentMethod) => { setEditing(item); modal.openModal(); };

  return (
    <div className="page on" id="p-payment-methods">
      <PageHeader
        title="طرق الدفع"
        subtitle={`إدارة وسائل الدفع المتاحة — ${meta?.total ?? 0} طريقة`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            إضافة طريقة دفع
          </Button>
        }
      />

      {error && (
        <AlertBar variant="red" dismissible onDismiss={() => setError(null)}>
          {error}
        </AlertBar>
      )}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-credit-card" label="إجمالي الطرق" value={meta?.total ?? 0} />
        <KpiCard variant="blue" icon="ti-cash" label="طرق نقدية" value={methods.filter(m => m.is_cash).length} />
        <KpiCard variant="purple" icon="ti-receipt" label="تتطلب مرجع" value={methods.filter(m => m.requires_reference).length} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={methods.filter(m => !m.active).length} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="ابحث بالاسم أو الكود..."
            style={{ width: '100%' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : methods.length === 0 ? (
        <EmptyState
          icon="ti-credit-card"
          text="لا توجد طرق دفع"
          sub="أضف أول طريقة دفع (نقداً، CIB، شيك...)"
          action={<Button variant="primary" onClick={openAdd}>إضافة طريقة دفع</Button>}
        />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الكود</th>
                  <th>الحساب المالي</th>
                  <th>نقدي</th>
                  <th>يتطلب مرجع</th>
                  <th>الترتيب</th>
                  <th>نشط</th>
                  <th style={{ textAlign: 'center', width: 130 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {methods.map(item => (
                  <tr key={item.id}>
                    <td className="s">{item.name}</td>
                    <td><code style={{ fontSize: 12, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{item.code}</code></td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {item.relations?.treasuryAccount?.name ?? '—'}
                    </td>
                    <td><Badge variant={item.is_cash ? 'success' : 'gray'}>{item.is_cash ? 'نعم' : 'لا'}</Badge></td>
                    <td>
                      {item.requires_reference ? (
                        <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.display_order}</td>
                    <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} />
                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <PaymentMethodModal
        open={modal.open}
        record={editing}
        treasuryAccounts={treasuryAccounts ?? []}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// =============== Confirm Delete Modal ===============
function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد الحذف">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لن تتمكن من استعادة طريقة الدفع بعد الحذف.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} icon={loading ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}>
          {loading ? 'جاري الحذف...' : 'حذف'}
        </Button>
      </div>
    </Modal>
  );
}

// =============== Add/Edit Modal ===============
function PaymentMethodModal({
  open, record, treasuryAccounts, onClose,
}: {
  open: boolean; record: PaymentMethod | null; treasuryAccounts: TreasuryAccount[]; onClose: () => void;
}) {
  const isEdit = !!record;
  const qc = useQueryClient();

  const emptyForm = {
    name: '',
    code: '',
    description: '',
    treasury_account_id: '' as string | number,
    requires_reference: false,
    is_cash: false,
    active: true,
    display_order: 0,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          name: record.name || '',
          code: record.code || '',
          description: record.description || '',
          treasury_account_id: record.treasury_account_id ?? '',
          requires_reference: record.requires_reference || false,
          is_cash: record.is_cash || false,
          active: record.active ?? true,
          display_order: record.display_order || 0,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError('');
    }
  }, [open, record]);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.code.trim()) errs.code = 'الكود مطلوب';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        ...data,
        treasury_account_id: data.treasury_account_id ? parseInt(String(data.treasury_account_id)) : null,
      };
      return isEdit
        ? paymentMethodsApi.update(record!.id, payload)
        : paymentMethodsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-modes'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data;
      if (msg?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(msg.errors)) {
          fieldErrors[k] = (v as string[])[0];
        }
        setErrors(fieldErrors);
      } else {
        setServerError(msg?.message || 'فشل الحفظ');
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  return (
    <Modal
      open={open} onClose={onClose} size="md"
      title={isEdit ? 'تعديل طريقة الدفع' : 'طريقة دفع جديدة'}
      footer={
        <>
          <Button onClick={onClose} disabled={saveMutation.isPending}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy" />} onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {serverError && <AlertBar variant="red">{serverError}</AlertBar>}

      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg s2">
          <label className="req">الاسم</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: نقداً" />
          {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
        </div>
        <div className="fg">
          <label className="req">الكود</label>
          <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="cash, cib, check" style={{ fontFamily: 'monospace' }} />
          {errors.code && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.code}</span>}
        </div>
        <div className="fg">
          <label>الحساب المالي الافتراضي</label>
          <select value={form.treasury_account_id} onChange={e => set('treasury_account_id', e.target.value)}>
            <option value="">— اختياري —</option>
            {treasuryAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>ترتيب العرض</label>
          <input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
        </div>
        <div className="fg">
          <label>نقدي</label>
          <Switch checked={form.is_cash} onChange={v => set('is_cash', v)} />
          <span style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
            {form.is_cash ? 'سيظهر كدفع نقدي' : ''}
          </span>
        </div>
        <div className="fg">
          <label>يتطلب مرجع (رقم شيك، معرف تحويل...)</label>
          <Switch checked={form.requires_reference} onChange={v => set('requires_reference', v)} />
        </div>
        <div className="fg">
          <label>نشط</label>
          <Switch checked={form.active} onChange={v => set('active', v)} />
        </div>
        <div className="fg s2">
          <label>وصف</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف اختياري..." rows={2} />
        </div>
      </div>
    </Modal>
  );
}
