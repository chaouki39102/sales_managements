// resources/js/pages/notifications/NotificationsPage.tsx
// ─────────────────────────────────────────────────────────────
//  مركز التنبيهات — صفحة كاملة بالفلاتر، التحديد الجماعي، الحذف
//  تعتمد كلياً على مكوّنات @/components/ui الموجودة
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import Card               from '@/components/ui/Card';
import Button             from '@/components/ui/Button';
import Badge              from '@/components/ui/Badge';
import EmptyState         from '@/components/ui/EmptyState';
import Skeleton           from '@/components/ui/Skeleton';
import Pagination         from '@/components/ui/Pagination';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { useModal } from '@/hooks/useModal';
import {
  useNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteMultipleNotificationsMutation,
} from '@/hooks/useNotificationsQuery';
import { useNotification } from '@/hooks/useNotification';
import type { RemoteNotificationType, RemoteNotification } from '@/lib/api/endpoints/notifications';
import {
  NOTIFICATION_TYPE_ICON,
  NOTIFICATION_TYPE_COLOR,
  NOTIFICATION_TYPE_BADGE_VARIANT,
  NOTIFICATION_TYPE_LABEL,
} from '@/lib/constants/notification.constants';

// ── أنواع الفلتر المحلية ──────────────────────────────────
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

// ════════════════════════════════════════════════════════════
//  المكون الرئيسي
// ════════════════════════════════════════════════════════════
export default function NotificationsPage() {
  const notify = useNotification();

  // ── حالة الفلاتر والصفحة ──
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<RemoteNotificationType | 'all'>('all');
  const [page, setPage]             = useState(1);

  // ── حالة التحديد الجماعي ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── مودال الحذف ──
  const deleteModal = useModal();
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single');
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // ── بناء الفلاتر للاستعلام ──
  const filters = {
    type:     typeFilter === 'all' ? undefined : typeFilter,
    is_read:  readFilter === 'all' ? undefined : readFilter === 'read',
    page,
    per_page: PER_PAGE,
  };

  // ── الاستعلامات والـ mutations ──
  const { data, isLoading, isFetching } = useNotificationsQuery(filters);
  const markOneMutation   = useMarkAsReadMutation();
  const markAllMutation   = useMarkAllAsReadMutation();
  const deleteOneMutation = useDeleteNotificationMutation();
  const deleteManyMutation = useDeleteMultipleNotificationsMutation();

  const notifications = data?.data ?? [];
  const meta          = data?.meta;

  // غير مقروء الإجمالي — مأخوذ من نفس القائمة الحالية كمؤشر تقريبي
  // (المصدر الدقيق لعداد الجرس هو useUnreadNotificationsQuery في NotificationBell)
  const unreadInPage = notifications.filter((n) => !n.is_read).length;

  // ── معالجات التحديد ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── معالجات الفلاتر (تُصفّر التحديد والصفحة) ──
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

  // ── معالجات الإجراءات ──
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

  // ── فتح مودال الحذف (فردي) ──
  const openDeleteSingle = (id: string) => {
    setDeleteTarget('single');
    setDeletingId(id);
    deleteModal.openModal();
  };

  // ── فتح مودال الحذف (جماعي) ──
  const openDeleteBulk = () => {
    setDeleteTarget('bulk');
    deleteModal.openModal();
  };

  // ── تنفيذ الحذف الفعلي ──
  const handleConfirmDelete = async () => {
    try {
      if (deleteTarget === 'single' && deletingId) {
        await deleteOneMutation.mutateAsync(deletingId);
        notify.success('تم الحذف', 'تم حذف الإشعار بنجاح');
      } else if (deleteTarget === 'bulk') {
        const ids = Array.from(selectedIds);
        await deleteManyMutation.mutateAsync(ids);
        notify.success('تم الحذف', `تم حذف ${ids.length} إشعار بنجاح`);
        clearSelection();
      }
      deleteModal.closeModal();
    } catch {
      notify.error('خطأ', 'فشل حذف الإشعار(ات)');
    }
  };

  const isDeleting = deleteOneMutation.isPending || deleteManyMutation.isPending;

  return (
    <div className="ntf-page" dir="rtl">

      {/* ── رأس الصفحة ── */}
      <Card noHeader>
        <div className="ntf-page__header">
          <div className="ntf-page__header-title-group">
            <h1 className="ntf-page__title">مركز التنبيهات</h1>
            {meta && (
              <Badge variant="info" noDot>
                {meta.total} إشعار
              </Badge>
            )}
            {unreadInPage > 0 && (
              <Badge variant="danger">
                {unreadInPage} غير مقروء (هذه الصفحة)
              </Badge>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<i className="ti ti-checks" />}
            onClick={handleMarkAllAsRead}
            loading={markAllMutation.isPending}
          >
            تحديد الكل كمقروء
          </Button>
        </div>

        {/* ── شريط الفلاتر ── */}
        <div className="ntf-page__filters">

          {/* فلتر الحالة */}
          <div className="ntf-page__filter-group">
            <span className="ntf-page__filter-label">الحالة:</span>
            {READ_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={readFilter === opt.value ? 'primary' : 'default'}
                onClick={() => handleReadFilterChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* فلتر النوع */}
          <div className="ntf-page__filter-group">
            <span className="ntf-page__filter-label">النوع:</span>
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={typeFilter === opt.value ? 'primary' : 'default'}
                onClick={() => handleTypeFilterChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── منطقة القائمة ── */}
      <Card noHeader style={{ marginTop: 16 }}>

        {isLoading ? (
          <div className="ntf-page__skeleton-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ntf-page__skeleton-row">
                <Skeleton variant="circle" width={36} height={36} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" rows={2} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="ti-bell-off"
            text="لا توجد إشعارات"
            sub={
              readFilter !== 'all' || typeFilter !== 'all'
                ? 'لا توجد إشعارات مطابقة لهذا الفلتر'
                : 'ستظهر هنا أي إشعارات جديدة'
            }
          />
        ) : (
          <div className={`ntf-page__list ${isFetching ? 'ntf-page__list--fetching' : ''}`}>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                selected={selectedIds.has(n.id)}
                onToggleSelect={() => toggleSelect(n.id)}
                onMarkAsRead={() => handleMarkOneAsRead(n.id)}
                onDelete={() => openDeleteSingle(n.id)}
              />
            ))}
          </div>
        )}

        {/* ── الترقيم ── */}
        {meta && meta.last_page > 1 && (
          <Pagination meta={meta} onPageChange={handlePageChange} showPageSize={false} />
        )}
      </Card>

      {/* ── شريط الإجراءات العائم — يظهر عند التحديد ── */}
      {selectedIds.size > 0 && (
        <div className="ntf-page__floating-bar">
          <span className="ntf-page__floating-count">
            {selectedIds.size} عنصر محدَّد
          </span>
          <div className="ntf-page__floating-actions">
            <Button
              size="sm"
              icon={<i className="ti ti-check" />}
              onClick={handleMarkSelectedAsRead}
            >
              تحديد كمقروء
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<i className="ti ti-trash" />}
              onClick={openDeleteBulk}
            >
              حذف ({selectedIds.size})
            </Button>
            <Button size="sm" onClick={clearSelection}>
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* ── مودال تأكيد الحذف ── */}
      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        itemName={
          deleteTarget === 'bulk'
            ? `${selectedIds.size} إشعار`
            : undefined
        }
        warning={
          deleteTarget === 'bulk'
            ? 'سيتم حذف جميع الإشعارات المحددة نهائياً.'
            : undefined
        }
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  بطاقة إشعار فردية
// ════════════════════════════════════════════════════════════
interface NotificationRowProps {
  notification: RemoteNotification;
  selected: boolean;
  onToggleSelect: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationRow({
  notification: n,
  selected,
  onToggleSelect,
  onMarkAsRead,
  onDelete,
}: NotificationRowProps) {
  return (
    <div className={`ntf-page__row ${!n.is_read ? 'ntf-page__row--unread' : ''}`}>

      {/* تحديد */}
      <label className="ntf-page__row-checkbox">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </label>

      {/* أيقونة النوع */}
      <span
        className="ntf-page__row-icon ic ic-sm"
        style={{ color: NOTIFICATION_TYPE_COLOR[n.type] }}
      >
        <i className={`ti ${NOTIFICATION_TYPE_ICON[n.type]}`} />
      </span>

      {/* المحتوى */}
      <div className="ntf-page__row-body">
        <div className="ntf-page__row-title-line">
          <p className="ntf-page__row-title">{n.title}</p>
          <Badge variant={NOTIFICATION_TYPE_BADGE_VARIANT[n.type]} noDot>
            {n.type === 'success' ? 'نجاح' : n.type === 'error' ? 'خطأ' : n.type === 'warning' ? 'تحذير' : 'معلومة'}
          </Badge>
        </div>

        {n.message && <p className="ntf-page__row-msg">{n.message}</p>}

        <div className="ntf-page__row-meta">
          <time className="ntf-page__row-time">{n.created_at_human}</time>
          {n.action_url && (
            <a href={n.action_url} className="ntf-page__row-link">
              عرض التفاصيل
              <i className="ti ti-arrow-left" />
            </a>
          )}
        </div>
      </div>

      {/* الإجراءات */}
      <div className="ntf-page__row-actions">
        {!n.is_read && (
          <button
            className="ntf-page__row-action-btn"
            onClick={onMarkAsRead}
            title="تحديد كمقروء"
          >
            <i className="ti ti-check" />
          </button>
        )}
        <button
          className="ntf-page__row-action-btn ntf-page__row-action-btn--danger"
          onClick={onDelete}
          title="حذف"
        >
          <i className="ti ti-trash" />
        </button>
      </div>

      {/* نقطة "غير مقروء" */}
      {!n.is_read && <span className="ntf-page__row-dot" />}
    </div>
  );
}
