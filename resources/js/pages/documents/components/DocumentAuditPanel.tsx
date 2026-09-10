// DocumentAuditPanel — سجل تدقيق المستند (تصميم احترافي.timeline)
import { useDocumentAuditLog } from '@/lib/api/endpoints/documents';
import type { DocumentAuditAction, DocumentAuditLogEntry, DocumentAuditValueRow } from '@/lib/api/core/types';

interface ActionMeta { label: string; icon: string; color: string; bgColor: string; borderColor: string; }

const ACTION_META: Record<DocumentAuditAction, ActionMeta> = {
  created:           { label: 'إنشاء',   icon: 'ti-plus',              color: '#0a8a5c', bgColor: '#e8f5ef', borderColor: '#b7e4cc' },
  updated:           { label: 'تعديل',   icon: 'ti-pencil',            color: '#2563eb', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
  line_added:        { label: 'إضافة بند', icon: 'ti-list-plus',        color: '#0a8a5c', bgColor: '#e8f5ef', borderColor: '#b7e4cc' },
  line_removed:      { label: 'حذف بند',   icon: 'ti-list-x',           color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
  line_modified:     { label: 'تعديل بند', icon: 'ti-edit',             color: '#2563eb', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
  price_changed:     { label: 'تغيير السعر', icon: 'ti-tag',            color: '#d97706', bgColor: '#fffbeb', borderColor: '#fde68a' },
  discount_changed:  { label: 'تغيير الخصم', icon: 'ti-percentage',     color: '#7c3aed', bgColor: '#f5f3ff', borderColor: '#ddd6fe' },
  status_changed:    { label: 'تغيير الحالة', icon: 'ti-switch-horizontal', color: '#0891b2', bgColor: '#ecfeff', borderColor: '#a5f3fc' },
  locked:            { label: 'قفل',       icon: 'ti-lock',             color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
  unlocked:          { label: 'فتح القفل', icon: 'ti-lock-open',        color: '#0a8a5c', bgColor: '#e8f5ef', borderColor: '#b7e4cc' },
  cancelled:         { label: 'إلغاء',     icon: 'ti-circle-x',         color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
  deleted:           { label: 'حذف',       icon: 'ti-trash',            color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
  payment_added:     { label: 'إضافة دفعة', icon: 'ti-wallet',          color: '#0a8a5c', bgColor: '#e8f5ef', borderColor: '#b7e4cc' },
  payment_removed:   { label: 'حذف دفعة',   icon: 'ti-wallet-off',      color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' },
  converted:         { label: 'تحويل',     icon: 'ti-exchange',         color: '#0a8a5c', bgColor: '#e8f5ef', borderColor: '#b7e4cc' },
  returned:          { label: 'مرتجع',     icon: 'ti-arrow-back-up',    color: '#d97706', bgColor: '#fffbeb', borderColor: '#fde68a' },
  cloned:            { label: 'نسخ',       icon: 'ti-copy',             color: '#2563eb', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
  stock_override:    { label: 'تصحيح مخزون', icon: 'ti-archive',        color: '#0891b2', bgColor: '#ecfeff', borderColor: '#a5f3fc' },
};

function isValueRow(v: unknown): v is DocumentAuditValueRow[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object'
    && v[0] !== null && 'label' in v[0] && 'value' in v[0];
}

function ValueTable({ rows }: { rows: DocumentAuditValueRow[] }) {
  return (
    <table className="w-full mt-4">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-b3 last:border-0">
            <td className="text-xs py-3 pe-4 whitespace-nowrap text-t4 font-medium" style={{ width: '35%' }}>{row.label}</td>
            <td className="text-xs py-3 text-t1 font-semibold">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ValueView({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '—') {
    return <span className="text-t4 italic text-xs">—</span>;
  }
  if (isValueRow(v)) {
    return <ValueTable rows={v} />;
  }
  return <span className="text-t1 text-xs font-medium">{String(v)}</span>;
}

function AuditEntry({ entry, isLast }: { entry: DocumentAuditLogEntry; isLast: boolean }) {
  const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: 'ti-info-circle', color: '#6b7280', bgColor: '#f3f4f6', borderColor: '#d1d5db' };
  const hasValue = entry.humanized_old_value != null || entry.humanized_new_value != null
    || entry.old_value != null || entry.new_value != null;
  const time = new Date(entry.created_at);

  return (
    <div className="flex gap-0 relative">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-1"
          style={{ background: meta.bgColor, border: `2px solid ${meta.borderColor}` }}
        >
          <i className={`ti ${meta.icon}`} style={{ fontSize: 12, color: meta.color }} />
        </div>
        {!isLast && (
          <div className="w-05 flex-1 my-4" style={{ background: 'var(--b3)' }} />
        )}
      </div>

      {/* Content card */}
      <div className="flex-1 pb-8 ms-4 min-w-0">
        <div
          className="rounded-xl p-8 border"
          style={{ background: meta.bgColor + '40', borderColor: meta.borderColor + '80' }}
        >
          {/* Top row: action badge + time */}
          <div className="flex items-center justify-between gap-6 mb-4">
            <div className="flex items-center gap-6 flex-wrap">
              <span
                className="inline-flex items-center gap-3 px-6 py-2 rounded-md text-xs font-bold"
                style={{ color: meta.color, background: meta.bgColor, border: `1px solid ${meta.borderColor}` }}
              >
                <i className={`ti ${meta.icon}`} style={{ fontSize: 11 }} />
                {entry.action_label ?? meta.label}
              </span>
              {entry.field_label && (
                <span className="inline-flex items-center gap-3 px-5 py-2 rounded-md text-xs font-medium bg-3 text-t3 border border-b3">
                  {entry.field_label}
                </span>
              )}
            </div>
            <span className="text-xs text-t4 whitespace-nowrap flex items-center gap-3">
              <i className="ti ti-clock" style={{ fontSize: 10 }} />
              {time.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="text-t4">|</span>
              {time.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* User + summary */}
          <div className="flex items-center gap-6 mb-2">
            <span className="inline-flex items-center gap-3 text-xs font-semibold text-t2">
              <div className="w-5 h-5 rounded-full bg-3 flex items-center justify-center">
                <i className="ti ti-user" style={{ fontSize: 10 }} />
              </div>
              {entry.user_label ?? entry.user?.name ?? 'النظام'}
            </span>
            {entry.ip_address && (
              <span className="text-xs text-t4 flex items-center gap-2">
                <i className="ti ti-world" style={{ fontSize: 9 }} />
                {entry.ip_address}
              </span>
            )}
          </div>

          {entry.action_summary && (
            <div className="text-sm text-t1 font-medium mt-4 leading-relaxed">{entry.action_summary}</div>
          )}

          {/* Before / After values */}
          {hasValue && (
            <div className="mt-6 rounded-lg bg-2 border border-b3 overflow-hidden">
              {entry.humanized_old_value != null && (
                <div className="border-b border-b3 last:border-0">
                  <div className="flex items-center gap-3 px-8 py-3 bg-3">
                    <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <i className="ti ti-minus" style={{ fontSize: 8, color: '#dc2626' }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#dc2626' }}>قبل</span>
                  </div>
                  <div className="px-8 py-4">
                    <ValueView v={entry.humanized_old_value} />
                  </div>
                </div>
              )}
              {entry.humanized_new_value != null && (
                <div className="border-b border-b3 last:border-0">
                  <div className="flex items-center gap-3 px-8 py-3 bg-3">
                    <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: '#e8f5ef', border: '1px solid #b7e4cc' }}>
                      <i className="ti ti-plus" style={{ fontSize: 8, color: '#0a8a5c' }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#0a8a5c' }}>بعد</span>
                  </div>
                  <div className="px-8 py-4">
                    <ValueView v={entry.humanized_new_value} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentAuditPanel({ docId }: { docId: number }) {
  const { data, isLoading, isError } = useDocumentAuditLog(docId, { per_page: 50 });
  const entries = data?.data ?? [];
  const count = data?.meta?.total ?? entries.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 shrink-0">
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-xl flex items-center justify-center" style={{ background: 'var(--em3)', color: 'var(--em)' }}>
            <i className="ti ti-history" style={{ fontSize: 18 }} />
          </div>
          <div>
            <h3 className="font-bold text-base text-t1">سجل تدقيق المستند</h3>
            <p className="text-xs text-t4 mt-1">تتبع كل التغييرات والتعديلات على هذا المستند</p>
          </div>
        </div>
        <span className="text-xs text-t4 bg-3 px-8 py-3 rounded-lg font-medium">
          <i className="ti ti-list-details me-2" style={{ fontSize: 10 }} />
          {count} {count === 1 ? 'حدث' : 'أحداث'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-40 h-40 rounded-full bg-3 flex items-center justify-center mb-8 animate-pulse">
              <i className="ti ti-hourglass text-t4" style={{ fontSize: 20 }} />
            </div>
            <span className="text-sm text-t4">جارٍ تحميل سجل التدقيق…</span>
          </div>
        )}
        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-40 h-40 rounded-full flex items-center justify-center mb-8" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} />
            </div>
            <span className="text-sm font-medium" style={{ color: '#dc2626' }}>تعذّر تحميل سجل التدقيق</span>
            <span className="text-xs text-t4 mt-2">تحقق من الاتصال بالخادم</span>
          </div>
        )}
        {!isLoading && !isError && count === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-48 h-48 rounded-full bg-3 flex items-center justify-center mb-8">
              <i className="ti ti-clipboard-check text-t4" style={{ fontSize: 24 }} />
            </div>
            <span className="text-sm font-medium text-t3">لا يوجد نشاط مسجّل</span>
            <span className="text-xs text-t4 mt-2">لم يتم تسجيل أي تعديل على هذا المستند بعد</span>
          </div>
        )}
        {!isLoading && count > 0 && (
          <div className="pe-4">
            {entries.map((e, i) => (
              <AuditEntry key={e.id} entry={e} isLast={i === entries.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
