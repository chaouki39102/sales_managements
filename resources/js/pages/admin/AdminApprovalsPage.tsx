import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import type { Paginated } from '@/types/admin';

interface PendingUser {
  id: number; name: string; email: string; created_at: string;
}

export default function AdminApprovalsPage() {
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [, setBulkRejectOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'pending-approval', search, page],
    queryFn: () => adminApi.getPendingUsers({ search: search || undefined, per_page: 15 }),
    staleTime: 30_000,
  });

  const paginated = data as Paginated<PendingUser> | undefined;
  const users = paginated?.data || [];
  const meta = paginated?.meta;

  const approveMut = useMutation({
    mutationFn: (id: number) => adminApi.approveUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending-approval'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => adminApi.rejectUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending-approval'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const bulkApproveMut = useMutation({
    mutationFn: (ids: number[]) => adminApi.bulkApproveUsers(ids),
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending-approval'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const bulkRejectMut = useMutation({
    mutationFn: (ids: number[]) => adminApi.bulkRejectUsers(ids),
    onSuccess: () => {
      setSelected(new Set());
      setBulkRejectOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending-approval'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const handleReject = async (id: number) => {
    const ok = await confirm('هل أنت متأكد من رفض هذا الحساب؟ سيتم حذفه نهائياً.');
    if (ok) rejectMut.mutate(id);
  };

  const handleBulkReject = async () => {
    const ok = await confirm(`هل أنت متأكد من رفض وحذف ${selected.size} حساب؟`);
    if (ok) bulkRejectMut.mutate([...selected]);
  };

  const handleApproveAll = async () => {
    const ok = await confirm(`هل تريد تفعيل ${selected.size} حساب؟`);
    if (ok) bulkApproveMut.mutate([...selected]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="طلبات التفعيل"
        description={meta?.total != null ? `${meta.total} حساب بانتظار المراجعة` : '—'}
        actions={
          selected.size > 0 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" icon={<i className="ti ti-check" />} onClick={handleApproveAll} loading={bulkApproveMut.isPending}>
                تفعيل ({selected.size})
              </Button>
              <Button variant="danger" icon={<i className="ti ti-x" />} onClick={handleBulkReject} loading={bulkRejectMut.isPending}>
                رفض ({selected.size})
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Search */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          placeholder="بحث بالاسم أو البريد..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 8,
            border: '1.5px solid var(--b2)', background: 'var(--bg1)',
            color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
          }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin .8s linear infinite', color: 'var(--em)' }} />
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
          <i className="ti ti-user-check" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.3 }} />
          لا توجد طلبات معلّقة
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--b1)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 1fr 160px 140px',
            padding: '10px 16px', background: 'var(--bg3)', borderBottom: '1px solid var(--b1)',
            fontSize: 11, fontWeight: 700, color: 'var(--t4)',
          }}>
            <div>
              <input
                type="checkbox"
                checked={selected.size === users.length && users.length > 0}
                onChange={toggleAll}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div>الاسم</div>
            <div>البريد الإلكتروني</div>
            <div>تاريخ التسجيل</div>
            <div style={{ textAlign: 'center' }}>إجراءات</div>
          </div>

          {/* Rows */}
          {users.map(user => (
            <div key={user.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr 160px 140px',
              padding: '12px 16px', borderBottom: '1px solid var(--b1)',
              alignItems: 'center',
              background: selected.has(user.id) ? '#6366f108' : 'transparent',
            }}>
              <div>
                <input
                  type="checkbox"
                  checked={selected.has(user.id)}
                  onChange={() => toggleSelect(user.id)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                }}>
                  {user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{user.name}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>{user.email}</div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                {new Date(user.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button
                  onClick={() => approveMut.mutate(user.id)}
                  disabled={approveMut.isPending}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid #10b98133',
                    background: '#10b9810d', color: '#10b981', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <i className="ti ti-check" /> تفعيل
                </button>
                <button
                  onClick={() => handleReject(user.id)}
                  disabled={rejectMut.isPending}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid #ef444433',
                    background: '#ef44440d', color: '#ef4444', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <i className="ti ti-x" /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => { setPage(p); setSelected(new Set()); }}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: p === page ? 'var(--em)' : 'var(--bg3)',
                color: p === page ? '#fff' : 'var(--t3)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}


      <ConfirmDialog {...(confirm as any).confirmDialogProps} />
    </div>
  );
}
