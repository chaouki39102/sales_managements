import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui';
import { useModal } from '@/hooks/useModal';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import type { Check } from '@/lib/api/core/types';

const fmt = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-DZ') : '—';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'gray'; icon: string }> = {
  pending:  { label: 'معلق',    variant: 'warning', icon: 'ti-clock' },
  cleared:  { label: 'مُصفي',   variant: 'success', icon: 'ti-circle-check' },
  bounced:  { label: 'مرتجع',   variant: 'danger',  icon: 'ti-circle-x' },
  cancelled:{ label: 'ملغى',    variant: 'gray',    icon: 'ti-ban' },
};

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
    border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box',
  };
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '10px 12px', textAlign: 'right', fontWeight: 700,
      fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

type CheckFormData = {
  check_number:   string;
  check_date:     string;
  due_date:       string;
  amount:         string;
  bank_name:      string;
  account_number: string;
  drawer_name:    string;
  notes:          string;
};

const emptyForm: CheckFormData = {
  check_number:   '',
  check_date:     '',
  due_date:       '',
  amount:         '',
  bank_name:      '',
  account_number: '',
  drawer_name:    '',
  notes:          '',
};

export default function ChecksPage() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const notify = useNotification();
  const deleteConfirm = useConfirm();

  const createModal = useModal();
  const bounceModal = useModal();

  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');

  const [form, setForm]     = useState<CheckFormData>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [bounceId, setBounceId] = useState<number | null>(null);
  const [bounceReason, setBounceReason] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: checks = [], isLoading } = useQuery({
    queryKey: [slug, 'checks'],
    queryFn:  () => apiGet<any[]>('/checks', { include: 'party' }),
    select:   (r: any) => (r?.data ?? r ?? []) as Check[],
    enabled:  !!slug,
  });

  const { data: parties = [] } = useQuery({
    queryKey: [slug, 'parties-mini'],
    queryFn:  () => apiGet<any[]>('/parties', { per_page: 500, sort: 'name' }),
    select:   (r: any) => (r?.data ?? r ?? []),
    staleTime: 10 * 60_000,
    enabled:  !!slug,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editId
        ? apiPut(`/checks/${editId}`, data)
        : apiPost('/checks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
      createModal.closeModal();
      setForm(emptyForm);
      setEditId(null);
    },
  });

  const markCleared = useMutation({
    mutationFn: (id: number) => apiPost(`/checks/${id}/mark-cleared`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [slug, 'checks'] }),
  });

  const markBounced = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost(`/checks/${id}/mark-bounced`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
      bounceModal.closeModal();
      setBounceId(null);
      setBounceReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/checks/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
      notify.success('تم حذف الشيك');
    },
  });

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === 'all') return checks;
    if (filter === 'pending') return checks.filter((c: any) => c.status === 'pending');
    if (filter === 'overdue') {
      const today = new Date();
      return checks.filter((c: any) =>
        c.status === 'pending' && c.due_date && new Date(c.due_date) < today
      );
    }
    return checks;
  }, [checks, filter]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    createModal.openModal();
  };

  const openEdit = (c: any) => {
    setForm({
      check_number:   c.check_number ?? '',
      check_date:     c.check_date ?? '',
      due_date:       c.due_date ?? '',
      amount:         String(c.amount ?? ''),
      bank_name:      c.bank_name ?? '',
      account_number: c.account_number ?? '',
      drawer_name:    c.drawer_name ?? '',
      notes:          c.notes ?? '',
    });
    setEditId(c.id);
    createModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      amount: parseFloat(form.amount) || 0,
    });
  };

  const openBounce = (id: number) => {
    setBounceId(id);
    setBounceReason('');
    bounceModal.openModal();
  };

  return (
    <div>
      <PageHeader
        title="إدارة الشيكات"
        subtitle="تتبع دورة حياة الشيكات: مستلمة، مودعة، مصفاة، مرتجعة"
        actions={
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--r2)',
            background: 'var(--em)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <i className="ti ti-plus" />
            إضافة شيك
          </button>
        }
      />

      {/* ── Filter Tabs ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        padding: '0 20px', flexWrap: 'wrap',
      }}>
        {([
          { key: 'all',     label: 'الكل' },
          { key: 'pending', label: 'معلقة' },
          { key: 'overdue', label: 'متأخرة' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all .15s',
            background: filter === tab.key ? 'var(--em)' : 'var(--bg2)',
            color: filter === tab.key ? '#fff' : 'var(--t3)',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--t4)',
            background: 'var(--bg2)', borderRadius: 'var(--r3)',
          }}>
            <i className="ti ti-ban" style={{ fontSize: 32, opacity: 0.4, marginBottom: 8 }} />
            <div>لا توجد شيكات</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 12, background: 'var(--bg1)', borderRadius: 'var(--r3)',
              overflow: 'hidden',
            }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <Th>رقم الشيك</Th>
                  <Th>تاريخ الإصدار</Th>
                  <Th>تاريخ الاستحقاق</Th>
                  <Th>المبلغ</Th>
                  <Th>البنك</Th>
                  <Th>الساحب</Th>
                  <Th>الطرف</Th>
                  <Th>الحالة</Th>
                  <Th style={{ textAlign: 'center' }}>إجراءات</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                  const partyName = c.party?.name ?? c.drawer_name ?? '—';
                  return (
                    <tr key={c.id} style={{
                      borderBottom: '1px solid var(--b1)',
                      transition: 'background .1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 600, direction: 'ltr' }}>
                        {c.check_number}
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--t3)' }}>
                        {fmtDate(c.check_date)}
                      </td>
                      <td style={{ padding: '9px 12px', color: c.due_date && new Date(c.due_date) < new Date() && c.status === 'pending' ? 'var(--red)' : 'var(--t3)' }}>
                        {c.due_date ? (
                          <span style={{ fontWeight: c.due_date && new Date(c.due_date) < new Date() && c.status === 'pending' ? 700 : 400 }}>
                            {fmtDate(c.due_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, direction: 'ltr' }}>
                        {fmt(Number(c.amount))}
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--t3)' }}>
                        {c.bank_name || '—'}
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--t3)' }}>
                        {c.drawer_name || '—'}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {partyName}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <Badge variant={st.variant}>
                          <i className={`ti ${st.icon}`} style={{ marginLeft: 4, fontSize: 11 }} />
                          {st.label}
                        </Badge>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {c.status === 'pending' && (
                            <>
                              <button onClick={() => markCleared.mutate(c.id)} title="تصفية"
                                style={actionBtnStyle('var(--green)')}>
                                <i className="ti ti-circle-check" style={{ fontSize: 14, color: 'var(--green)' }} />
                              </button>
                              <button onClick={() => openBounce(c.id)} title="إرجاع"
                                style={actionBtnStyle('var(--red)')}>
                                <i className="ti ti-circle-x" style={{ fontSize: 14, color: 'var(--red)' }} />
                              </button>
                            </>
                          )}
                          <button onClick={() => openEdit(c)} title="تعديل"
                            style={actionBtnStyle('var(--blue)')}>
                            <i className="ti ti-pencil" style={{ fontSize: 14, color: 'var(--blue)' }} />
                          </button>
                          <button onClick={async () => { if (await deleteConfirm.confirm('حذف الشيك؟')) deleteMutation.mutate(c.id); }} title="حذف"
                            style={actionBtnStyle('var(--t4)')}>
                            <i className="ti ti-trash" style={{ fontSize: 14, color: 'var(--t4)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ────────────────────────────────────────── */}
      <Modal open={createModal.open} onClose={createModal.closeModal} title={editId ? 'تعديل شيك' : 'إضافة شيك'}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>رقم الشيك *</Label>
              <input style={inputStyle()} required value={form.check_number}
                onChange={e => setForm(f => ({ ...f, check_number: e.target.value }))} />
            </div>
            <div>
              <Label>المبلغ *</Label>
              <input style={inputStyle()} type="number" min={0} step={0.01} required value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>تاريخ الإصدار *</Label>
              <input style={inputStyle()} type="date" required value={form.check_date}
                onChange={e => setForm(f => ({ ...f, check_date: e.target.value }))} />
            </div>
            <div>
              <Label>تاريخ الاستحقاق</Label>
              <input style={inputStyle()} type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>البنك</Label>
              <input style={inputStyle()} value={form.bank_name}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="اسم البنك" />
            </div>
            <div>
              <Label>رقم الحساب</Label>
              <input style={inputStyle()} value={form.account_number}
                onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="رقم الحساب" />
            </div>
            <div>
              <Label>الساحب</Label>
              <input style={inputStyle()} value={form.drawer_name}
                onChange={e => setForm(f => ({ ...f, drawer_name: e.target.value }))} placeholder="اسم الساحب" />
            </div>
            <div>
              <Label>الطرف</Label>
              <select style={{
                ...inputStyle(), cursor: 'pointer',
              }} onChange={e => setForm(f => ({ ...f, party_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">— بدون طرف —</option>
                {parties.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <textarea style={{ ...inputStyle(), minHeight: 60, resize: 'vertical' }} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={createModal.closeModal} style={secBtnStyle}>
              إلغاء
            </button>
            <button type="submit" style={priBtnStyle} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ…' : editId ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Bounce Reason Modal ────────────────────────────────────────── */}
      <Modal open={bounceModal.open} onClose={bounceModal.closeModal} title="سبب الإرجاع">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
          <div>
            <Label>سبب الإرجاع *</Label>
            <textarea style={{ ...inputStyle(), minHeight: 80, resize: 'vertical' }} required
              value={bounceReason}
              onChange={e => setBounceReason(e.target.value)}
              placeholder="أدخل سبب إرجاع الشيك…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={bounceModal.closeModal} style={secBtnStyle}>إلغاء</button>
            <button type="button" onClick={() => {
              if (bounceId && bounceReason.trim()) {
                markBounced.mutate({ id: bounceId, reason: bounceReason.trim() });
              }
            }} style={{
              ...priBtnStyle,
              opacity: !bounceReason.trim() ? 0.5 : 1,
            }} disabled={!bounceReason.trim() || markBounced.isPending}>
              {markBounced.isPending ? '…' : 'تأكيد الإرجاع'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

// ── Stubs ──────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 4 }}>
      {children}
    </div>
  );
}

const actionBtnStyle = (_color: string): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 6,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
});

const secBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 'var(--r2)',
  background: 'var(--bg2)', border: '1px solid var(--b2)',
  color: 'var(--t2)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

const priBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 'var(--r2)',
  background: 'var(--em)', color: '#fff', border: 'none',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
