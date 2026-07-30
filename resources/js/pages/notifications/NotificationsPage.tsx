import { useState } from 'react';
import PageHeader         from '@/components/ui/PageHeader';
import Card               from '@/components/ui/Card';
import Button             from '@/components/ui/Button';
import Badge              from '@/components/ui/Badge';
import EmptyState         from '@/components/ui/EmptyState';
import SimpleTable        from '@/components/ui/SimpleTable';
import Skeleton           from '@/components/ui/Skeleton';
import Pagination         from '@/components/ui/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useModal } from '@/hooks/useModal';
import {
  useNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteMultipleNotificationsMutation,
} from '@/hooks/useNotificationsQuery';
import { useNotification } from '@/hooks/useNotification';
import type { RemoteNotificationType } from '@/lib/api/endpoints/notifications';
import {
  NOTIFICATION_TYPE_ICON,
  NOTIFICATION_TYPE_COLOR,
  NOTIFICATION_TYPE_BADGE_VARIANT,
  NOTIFICATION_TYPE_LABEL,
} from '@/lib/constants/notification.constants';

type ReadFilter = 'all' | 'unread' | 'read';

const READ_FILTER_OPTIONS: { value: ReadFilter; label: string }[] = [
  { value: 'all',    label: 'الكل' },
  { value: 'unread', label: 'غير مقروء' },
  { value: 'read',   label: 'مقروء' },
];

const TYPE_FILTER_OPTIONS: { value: RemoteNotificationType | 'all'; label: string }[] = [
  { value: 'all',     label: 'الكل' },
  { value: 'success', label: NOTIFICATION_TYPE_LABEL.success },
  { value: 'error',   label: NOTIFICATION_TYPE_LABEL.error },
  { value: 'warning', label: NOTIFICATION_TYPE_LABEL.warning },
  { value: 'info',    label: NOTIFICATION_TYPE_LABEL.info },
];

const PER_PAGE = 20;



export default function NotificationsPage() {
  const notify = useNotification();

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<RemoteNotificationType | 'all'>('all');
  const [page, setPage]             = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteConfirm = useConfirm();

  const filters = {
    type:     typeFilter === 'all' ? undefined : typeFilter,
    is_read:  readFilter === 'all' ? undefined : readFilter === 'read',
    page,
    per_page: PER_PAGE,
  };

  const { data, isLoading, isFetching } = useNotificationsQuery(filters);
  const markOneMutation   = useMarkAsReadMutation();
  const markAllMutation   = useMarkAllAsReadMutation();
  const deleteOneMutation = useDeleteNotificationMutation();
  const deleteManyMutation = useDeleteMultipleNotificationsMutation();

  const notifications = data?.data ?? [];
  const meta          = data?.meta;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleReadFilterChange = (value: ReadFilter) => {
    setReadFilter(value);
    setPage(1);
    clearSelection();
  };

  const handleTypeFilterChange = (value: RemoteNotificationType | 'all') => {
    setTypeFilter(value);
    setPage(1);
    clearSelection();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    clearSelection();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllMutation.mutateAsync();
      notify.success('تم', 'تم تحديد جميع الإشعارات كمقروءة');
    } catch {
      notify.error('خطأ', 'فشل تحديث الإشعارات');
    }
  };

  const handleMarkOneAsRead = async (id: string) => {
    try {
      await markOneMutation.mutateAsync(id);
    } catch {
      notify.error('خطأ', 'فشل تحديث الإشعار');
    }
  };

  const handleMarkSelectedAsRead = async () => {
    const unreadSelected = notifications.filter((n) => selectedIds.has(n.id) && !n.is_read);
    try {
      await Promise.all(unreadSelected.map((n) => markOneMutation.mutateAsync(n.id)));
      notify.success('تم', `تم تحديد ${unreadSelected.length} إشعار كمقروء`);
      clearSelection();
    } catch {
      notify.error('خطأ', 'فشل تحديث بعض الإشعارات');
    }
  };

  const openDeleteSingle = async (id: string) => {
    if (!await deleteConfirm.confirm('حذف هذا الإشعار؟')) return;
    try {
      await deleteOneMutation.mutateAsync(id);
      notify.success('تم الحذف', 'تم حذف الإشعار بنجاح');
    } catch {
      notify.error('خطأ', 'فشل حذف الإشعار');
    }
  };

  const openDeleteBulk = async () => {
    if (!await deleteConfirm.confirm(`حذف ${selectedIds.size} إشعار؟`)) return;
    try {
      const ids = Array.from(selectedIds);
      await deleteManyMutation.mutateAsync(ids);
      notify.success('تم الحذف', `تم حذف ${ids.length} إشعار بنجاح`);
      clearSelection();
    } catch {
      notify.error('خطأ', 'فشل حذف الإشعار(ات)');
    }
  };

  const isDeleting = deleteOneMutation.isPending || deleteManyMutation.isPending;

  return (
    <div>
      <PageHeader
        title="مركز التنبيهات"
        subtitle={
          meta
            ? `إجمالي ${meta.total} إشعار${meta.total !== 1 ? '' : ''}`
            : undefined
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<i className="ti ti-checks" />}
            onClick={handleMarkAllAsRead}
            loading={markAllMutation.isPending}
          >
            تحديد الكل كمقروء
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginInlineEnd: 4 }}>
            الحالة:
          </span>
          {READ_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleReadFilterChange(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: readFilter === opt.value ? 'var(--em)' : 'var(--bg2)',
                color: readFilter === opt.value ? '#fff' : 'var(--t3)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginInlineEnd: 4 }}>
            النوع:
          </span>
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeFilterChange(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: typeFilter === opt.value ? 'var(--em)' : 'var(--bg2)',
                color: typeFilter === opt.value ? '#fff' : 'var(--t3)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card noHeader style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Skeleton variant="circle" width={36} height={36} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" rows={2} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              icon="ti-bell-off"
              text="لا توجد إشعارات"
              sub={
                readFilter !== 'all' || typeFilter !== 'all'
                  ? 'لا توجد إشعارات مطابقة لهذا الفلتر'
                  : 'ستظهر هنا أي إشعارات جديدة'
              }
            />
          </div>
        ) : (
          <>
          <style>{`.ntf-unread{background:var(--emb)}.ntf-read:hover{background:var(--bg2)}`}</style>
          <SimpleTable
            columns={[
              {
                key: 'checkbox', label: '',
                render: (_v, row) => {
                  const n = row as any;
                  return (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n.id)}
                      onChange={() => toggleSelect(n.id)}
                      style={{ accentColor: 'var(--em)', cursor: 'pointer', width: 15, height: 15 }}
                    />
                  );
                },
              },
              {
                key: 'type', label: 'النوع', align: 'center',
                render: (v) => (
                  <span className="ic ic-sm" style={{ color: NOTIFICATION_TYPE_COLOR[v as RemoteNotificationType] }}>
                    <i className={`ti ${NOTIFICATION_TYPE_ICON[v as RemoteNotificationType]}`} />
                  </span>
                ),
              },
              {
                key: 'content', label: 'المحتوى',
                render: (_v: any, row: any) => {
                  const n = row as any;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 12.5 }}>
                          {n.title}
                        </span>
                        <Badge variant={NOTIFICATION_TYPE_BADGE_VARIANT[n.type]} noDot>
                          {NOTIFICATION_TYPE_LABEL[n.type]}
                        </Badge>
                        {!n.is_read && (
                          <span style={{
                            display: 'inline-block', width: 6, height: 6,
                            borderRadius: '50%', background: 'var(--em)', flexShrink: 0,
                          }} />
                        )}
                      </div>
                      {n.message && (
                        <div style={{ color: 'var(--t3)', fontSize: 11.5, marginTop: 3 }}>
                          {n.message}
                        </div>
                      )}
                    </>
                  );
                },
              },
              {
                key: 'created_at_human', label: 'التاريخ',
                render: (v) => <span style={{ color: 'var(--t4)', fontSize: 11 }}><time>{v as string}</time></span>,
              },
              {
                key: 'actions', label: 'الإجراءات', align: 'center',
                render: (_v, row) => {
                  const n = row as any;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkOneAsRead(n.id)}
                          title="تحديد كمقروء"
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            border: '1px solid var(--b2)', background: 'var(--bg3)',
                            cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--t4)', transition: 'all .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--emb)'; e.currentTarget.style.color = 'var(--em)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--t4)'; }}
                        >
                          <i className="ti ti-check" style={{ fontSize: 14 }} />
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteSingle(n.id)}
                        title="حذف"
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          border: '1px solid var(--b2)', background: 'var(--bg3)',
                          cursor: 'pointer', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: 'var(--t4)', transition: 'all .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--redb)'; e.currentTarget.style.color = 'var(--red)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--t4)'; }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  );
                },
              },
            ]}
            data={notifications as any}
            rowKey="id"
            rowClassName={(row) => (row as any).is_read ? 'ntf-read' : 'ntf-unread'}
          />
          </>
        )}

        {meta && meta.last_page > 1 && (
          <Pagination meta={meta} onPageChange={handlePageChange} showPageSize={false} />
        )}
      </Card>

      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 4000, display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 16px', background: 'var(--bg2)',
          border: '1px solid var(--b3)', borderRadius: 'var(--r3)',
          boxShadow: 'var(--shadow3)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
            {selectedIds.size} عنصر محدَّد
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button size="sm" icon={<i className="ti ti-check" />} onClick={handleMarkSelectedAsRead}>
              تحديد كمقروء
            </Button>
            <Button size="sm" variant="danger" icon={<i className="ti ti-trash" />} onClick={openDeleteBulk}>
              حذف ({selectedIds.size})
            </Button>
            <Button size="sm" onClick={clearSelection}>إلغاء التحديد</Button>
          </div>
        </div>
      )}

      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}
