// resources/js/pages/expenses/ExpensesPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useFiscalYear } from '@/context/FiscalYearContext';
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
interface Expense {
  id: number;
  date: string;
  amount: number;
  expense_category_id: number;
  fiscal_year_id?: number;
  payment_mode_id?: number | null;
  treasury_account_id?: number | null;
  party_id?: number | null;
  description: string;
  reference?: string;
  is_paid: boolean;
  is_recurring?: boolean;
}

// --------------- API Layer ---------------
const expensesApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/expenses', { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/expenses', data).then(r => r.data),
  update: (id: number, data: any) =>
    apiClient.put(`/expenses/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/expenses/${id}`).then(r => r.data),
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const formatDZD = (amount: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' دج';

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { selectedYear } = useFiscalYear() as any;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [paidFilter, setPaidFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: ['expenses', debouncedSearch, paidFilter, categoryFilter, page, perPage],
    queryFn: () => expensesApi.list({
      'filter[search]': debouncedSearch || undefined,
      'filter[is_paid]': paidFilter || undefined,
      'filter[expense_category_id]': categoryFilter || undefined,
      sort: '-date',
      per_page: perPage,
      page,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const expenses: Expense[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  // قوائم الاختيار – سنستخدمها لعرض الأسماء
  const { data: categories } = useQuery({
    queryKey: ['expense-categories-select'],
    queryFn: () => apiClient.get('/expense-categories', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: parties } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => apiClient.get('/suppliers', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: paymentModes } = useQuery({
    queryKey: ['payment-modes-select'],
    queryFn: () => apiClient.get('/payment-modes', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: treasuryAccounts } = useQuery({
    queryKey: ['treasury-accounts-select'],
    queryFn: () => apiClient.get('/treasury-accounts', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // دوال مساعدة للبحث عن الاسم باستخدام id
  const getCategoryName = (id: number) => categories?.find((c: any) => c.id === id)?.name ?? '—';
  const getPartyName    = (id?: number | null) => !id ? '—' : parties?.find((p: any) => p.id === id)?.name ?? '—';
  const getPaymentName  = (id?: number | null) => !id ? '—' : paymentModes?.find((pm: any) => pm.id === id)?.name ?? '—';

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      deleteModal.closeModal();
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'فشل الحذف');
      deleteModal.closeModal();
    },
  });

  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };
  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: Expense) => { setEditing(item); modal.openModal(); };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidCount = expenses.filter(e => e.is_paid).length;
  const unpaidCount = expenses.filter(e => !e.is_paid).length;

  return (
    <div className="page on" id="p-expenses">
      <PageHeader
        title="المصروفات"
        subtitle={`إدارة المصروفات — ${meta?.total ?? 0} عملية`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            تسجيل مصروف جديد
          </Button>
        }
      />

      {error && <AlertBar variant="red" dismissible>{error}</AlertBar>}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-receipt" label="إجمالي المصروفات" value={formatDZD(totalAmount)} />
        <KpiCard variant="blue" icon="ti-check" label="مدفوعة" value={paidCount} />
        <KpiCard variant="red" icon="ti-clock" label="غير مدفوعة" value={unpaidCount} />
        <KpiCard variant="purple" icon="ti-folders" label="عدد العمليات" value={meta?.total ?? 0} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input type="text" placeholder="ابحث بالوصف أو المرجع..." style={{ width: '100%' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select style={{ width: 140 }} value={paidFilter} onChange={e => { setPaidFilter(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="1">مدفوعة</option>
          <option value="0">غير مدفوعة</option>
        </select>
        <select style={{ width: 150 }} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">كل الفئات</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : expenses.length === 0 ? (
        <EmptyState icon="ti-credit-card" text="لا توجد مصروفات" sub="سجل أول مصروف" action={<Button variant="primary" onClick={openAdd}>مصروف جديد</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>المستفيد</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>مدفوعة؟</th>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'center', width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} onClick={() => openEdit(exp)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{exp.description}</div>
                      {exp.reference && <div style={{ fontSize: 11, color: 'var(--t4)' }}>Ref: {exp.reference}</div>}
                    </td>
                    <td><Badge variant="warning" noDot>{getCategoryName(exp.expense_category_id)}</Badge></td>
                    <td>{getPartyName(exp.party_id)}</td>
                    <td className="e" style={{ direction: 'ltr', textAlign: 'right' }}>{formatDZD(exp.amount)}</td>
                    <td>{getPaymentName(exp.payment_mode_id)}</td>
                    <td><Badge variant={exp.is_paid ? 'success' : 'danger'}>{exp.is_paid ? 'مدفوعة' : 'غير مدفوعة'}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                      {new Date(exp.date).toLocaleDateString('fr-DZ')}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(exp)} />
                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(exp.id)} />
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

      <ExpenseModal
        open={modal.open} record={editing}
        categories={categories ?? []} parties={parties ?? []}
        paymentModes={paymentModes ?? []} treasuryAccounts={treasuryAccounts ?? []}
        fiscalYearId={selectedYear?.id}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal open={deleteModal.open} onClose={deleteModal.closeModal} onConfirm={confirmDelete} loading={deleteMutation.isPending} />
    </div>
  );
}

// =============== Modal (سليم) ===============
function ExpenseModal({
  open, record, categories, parties, paymentModes, treasuryAccounts, fiscalYearId, onClose,
}: {
  open: boolean; record: Expense | null; categories: any[]; parties: any[]; paymentModes: any[]; treasuryAccounts: any[]; fiscalYearId?: number; onClose: () => void;
}) {
  const isEdit = !!record;
  const qc = useQueryClient();

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    amount: '',
    expense_category_id: '',
    payment_mode_id: '' as string | number,
    treasury_account_id: '' as string | number,
    party_id: '' as string | number,
    description: '',
    reference: '',
    is_paid: false,
    is_recurring: false,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          date: record.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
          amount: String(record.amount ?? ''),
          expense_category_id: String(record.expense_category_id ?? ''),
          payment_mode_id: record.payment_mode_id ?? '',
          treasury_account_id: record.treasury_account_id ?? '',
          party_id: record.party_id ?? '',
          description: record.description ?? '',
          reference: record.reference ?? '',
          is_paid: record.is_paid ?? false,
          is_recurring: record.is_recurring ?? false,
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

const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'المبلغ غير صالح';
    if (!form.description.trim()) errs.description = 'الوصف مطلوب';
    if (!form.date) errs.date = 'التاريخ مطلوب';
    if (!form.expense_category_id) errs.expense_category_id = 'اختر فئة المصروف';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        date: data.date,
        amount: parseFloat(data.amount),
        expense_category_id: parseInt(data.expense_category_id) || null,
        payment_mode_id: data.payment_mode_id ? parseInt(String(data.payment_mode_id)) : null,
        treasury_account_id: data.treasury_account_id ? parseInt(String(data.treasury_account_id)) : null,
        party_id: data.party_id ? parseInt(String(data.party_id)) : null,
        description: data.description.trim(),
        reference: data.reference || null,
        is_paid: data.is_paid,
        is_recurring: data.is_recurring,
        fiscal_year_id: fiscalYearId ?? null,
      };
      return isEdit ? expensesApi.update(record!.id, payload) : expensesApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); onClose(); },
    onError: (err: any) => {
      const msg = err?.response?.data;
      if (msg?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(msg.errors)) fieldErrors[k] = (v as string[])[0];
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
    <Modal open={open} onClose={onClose} size="md"
      title={isEdit ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
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
          <label className="req">الوصف</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف المصروف" />
          {errors.description && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.description}</span>}
        </div>
        <div className="fg">
          <label className="req">المبلغ</label>
          <div className="inp-row"><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" /><div className="inp-suf">دج</div></div>
          {errors.amount && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.amount}</span>}
        </div>
        <div className="fg">
          <label className="req">التاريخ</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          {errors.date && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.date}</span>}
        </div>
        <div className="fg">
          <label className="req">الفئة</label>
          <select
            value={form.expense_category_id as string}
            onChange={e => set('expense_category_id', e.target.value)}
            style={{ borderColor: errors.expense_category_id ? 'var(--red)' : undefined }}
          >
            <option value="">— اختر —</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.expense_category_id && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.expense_category_id}</span>}
        </div>
        <div className="fg">
          <label>المستفيد</label>
          <select value={form.party_id} onChange={e => set('party_id', e.target.value)}>
            <option value="">— بدون —</option>
            {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>طريقة الدفع</label>
          <select value={form.payment_mode_id} onChange={e => set('payment_mode_id', e.target.value)}>
            <option value="">— غير محدد —</option>
            {paymentModes.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>الحساب المالي</label>
          <select value={form.treasury_account_id} onChange={e => set('treasury_account_id', e.target.value)}>
            <option value="">— غير محدد —</option>
            {treasuryAccounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>مرجع</label>
          <input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="اختياري" />
        </div>
        <div className="fg">
          <label>مدفوعة</label>
          <Switch checked={form.is_paid} onChange={v => set('is_paid', v)} />
        </div>
        <div className="fg">
          <label>متكررة</label>
          <Switch checked={form.is_recurring} onChange={v => set('is_recurring', v)} />
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد الحذف">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن حذف المصروف.</div>
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
