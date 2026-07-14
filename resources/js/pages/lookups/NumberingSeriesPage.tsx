// resources/js/pages/lookups/NumberingSeriesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
import { useTenantQueryPaginated, useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import { numberingSeriesApi } from '@/lib/api/endpoints/numberingSeries';
import { documentTypesApi } from '@/lib/api/endpoints/documentTypes';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useActiveSlug } from '@/lib/store/appStore';

// =============== Types ===============
interface NumberingSeriesRecord {
  id: number;
  document_type_id: number;
  warehouse_id: number | null;
  prefix: string;
  suffix: string | null;
  format: string;
  last_number: number;
  padding: number;
  start_number: number;
  max_number: number | null;
  reset_yearly: boolean;
  reset_monthly: boolean;
  current_year: number;
  current_month: number;
  active: boolean;
  is_locked: boolean;
  // حقول العلاقات (تأتي في الجذر وليس تحت relations)
  document_type?: { id: number; name: string; code: string };
  warehouse?: { id: number; name: string } | null;
  commercial_documents_count?: number;
  // حقل إضافي من الـ API بعد المزامنة
  actual_last_number?: number;
}

interface DocumentTypeOption { id: number; name: string; code: string }
interface WarehouseOption { id: number; name: string }

// =============== Helpers ===============
function simulateNumber(series: NumberingSeriesRecord, next = true): string {
  try {
    const num = next ? series.last_number + 1 : series.last_number;
    const padded = String(num).padStart(series.padding, '0');
    const fmt = series.format
      .replace('{PREFIX}', series.prefix || '')
      .replace('{SUFFIX}', series.suffix || '')
      .replace('{YY}', String(series.current_year || new Date().getFullYear()).slice(-2))
      .replace('{YYYY}', String(series.current_year || new Date().getFullYear()))
      .replace('{MM}', String(series.current_month || new Date().getMonth() + 1).padStart(2, '0'))
      .replace('{MONTH}', String(series.current_month || new Date().getMonth() + 1).padStart(2, '0'))
      .replace('{NUMBER}', padded);
    return fmt.replace(/\{NUMBER:(\d+)\}/g, (_, w) => String(num).padStart(Number(w), '0'));
  } catch { return '—'; }
}

function haveDocumentsBeenCreated(series: NumberingSeriesRecord): boolean {
  return series.last_number >= series.start_number || (series.commercial_documents_count ?? 0) > 0;
}

// =============== Main Component ===============
export default function NumberingSeriesPage() {
  const [editing, setEditing] = useState<NumberingSeriesRecord | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const slug = useActiveSlug();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data: paginated, isLoading, isFetching } = useTenantQueryPaginated(
    (slug) => [slug, 'numbering-series', debouncedSearch, page, perPage] as const,
    () => numberingSeriesApi.list({
      'filter[search]': debouncedSearch || undefined,
      include: 'documentType,warehouse',
      sort: '-id',
      per_page: perPage,
      page,
    }),
  );

  const items: NumberingSeriesRecord[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  const { data: documentTypes } = useTenantQuery<DocumentTypeOption[]>(
    (slug) => tenantKeys.lookups.documentTypes(slug),
    () => documentTypesApi.list({ per_page: 500 }),
    { staleTime: 5 * 60_000 },
  );

  const { data: warehouses } = useWarehouses();

  // Mutations with error handling
  const deleteMutation = useTenantMutation(
    (id: number) => numberingSeriesApi.delete(id),
    (slug) => tenantKeys.lookups.numberingSeries(slug),
    {
      onSuccess: () => { deleteModal.closeModal(); setSyncError(null); },
      onError: (err: any) => { setSyncError(err?.response?.data?.message || 'فشل حذف السلسلة'); deleteModal.closeModal(); },
    },
  );

  const lockMutation = useTenantMutation(
    (id: number) => numberingSeriesApi.lock(id),
    (slug) => tenantKeys.lookups.numberingSeries(slug),
    {
      onSuccess: () => setSyncError(null),
      onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل القفل'),
    },
  );
  const unlockMutation = useTenantMutation(
    (id: number) => numberingSeriesApi.unlock(id),
    (slug) => tenantKeys.lookups.numberingSeries(slug),
    {
      onSuccess: () => setSyncError(null),
      onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل فتح القفل'),
    },
  );
  const syncMutation = useTenantMutation(
    (id: number) => numberingSeriesApi.sync(id),
    (slug) => tenantKeys.lookups.numberingSeries(slug),
    {
      onSuccess: () => setSyncError(null),
      onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل المزامنة'),
    },
  );

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteModal.openModal();
  };
  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };
  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: NumberingSeriesRecord) => { setEditing(item); modal.openModal(); };

  return (
    <div className="page on" id="p-numbering-series">
      <PageHeader
        title="سلاسل الترقيم"
        subtitle={`إدارة تسلسلات المستندات — ${meta?.total ?? 0} سلسلة`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            سلسلة جديدة
          </Button>
        }
      />

      {syncError && (
        <AlertBar variant="red" dismissible onDismiss={() => setSyncError(null)}>
          {syncError}
        </AlertBar>
      )}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-list-numbers" label="إجمالي السلاسل" value={meta?.total ?? 0} />
        <KpiCard variant="blue" icon="ti-calendar-repeat" label="إعادة سنوية" value={items.filter(i => i.reset_yearly).length} />
        <KpiCard variant="red" icon="ti-lock" label="مقفلة" value={items.filter(i => i.is_locked).length} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="ابحث بالبادئة أو الصيغة..."
            style={{ width: '100%' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : items.length === 0 ? (
        <EmptyState icon="ti-list-numbers" text="لا توجد سلاسل ترقيم" sub="أضف أول سلسلة ترقيم" action={<Button variant="primary" onClick={openAdd}>إضافة</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>نوع المستند</th>
                  <th>البادئة</th>
                  <th>الصيغة</th>
                  <th style={{ textAlign: 'center' }}>الرقم الحالي</th>
                  <th style={{ textAlign: 'center' }}>الرقم التالي ⏭</th>
                  <th>إعادة سنوية</th>
                  <th>نشط</th>
                  <th>مقفل</th>
                  <th style={{ textAlign: 'center', width: 190 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const docType = item.document_type;
                  const warehouse = item.warehouse;
                  const hasDocuments = haveDocumentsBeenCreated(item);
                  // الرقم الفعلي: أعلى قيمة بين last_number (من DB) و count-based number
                  const effectiveLastNumber = Math.max(
                    item.last_number,
                    item.start_number + ((item.commercial_documents_count ?? 0) - 1)
                  );
                  return (
                    <tr key={item.id} onDoubleClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{docType?.name ?? '—'}</div>
                        {docType?.code && <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>{docType.code}</div>}
                        {warehouse && <div style={{ fontSize: 10, color: 'var(--t3)' }}><i className="ti ti-building-warehouse" style={{ fontSize: 12, verticalAlign: 'middle', marginLeft: 2 }} /> {warehouse.name}</div>}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--em)' }}>
                          {item.prefix || '—'}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>
                          {item.format}
                        </code>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>
                        {hasDocuments ? (
                          effectiveLastNumber
                        ) : (
                          <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 12 }}>لم يصدر بعد</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', direction: 'ltr' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          background: 'var(--emb)',
                          padding: '2px 8px',
                          borderRadius: 10,
                          color: 'var(--em)',
                          whiteSpace: 'nowrap',
                        }}>
                          {hasDocuments ? simulateNumber({ ...item, last_number: effectiveLastNumber }, true) : '—'}
                        </span>
                      </td>
                      <td><Badge variant={item.reset_yearly ? 'success' : 'gray'}>{item.reset_yearly ? 'نعم' : 'لا'}</Badge></td>
                      <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                      <td><Badge variant={item.is_locked ? 'danger' : 'success'}>{item.is_locked ? 'مقفل' : 'مفتوح'}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} disabled={item.is_locked} />
                          {item.is_locked ? (
                            <Button size="xs" variant="warning" icon={<i className="ti ti-lock-open" />} onClick={() => unlockMutation.mutate(item.id)} />
                          ) : (
                            <Button size="xs" variant="info" icon={<i className="ti ti-lock" />} onClick={() => lockMutation.mutate(item.id)} />
                          )}
                          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} disabled={item.is_locked} />
                          <Button size="xs" icon={<i className="ti ti-refresh" />} onClick={() => syncMutation.mutate(item.id)} title="مزامنة الرقم بعد حذف مستند" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      <NumberingSeriesModal
        open={modal.open}
        record={editing}
        documentTypes={documentTypes ?? []}
        warehouses={warehouses ?? []}
        slug={slug}
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
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن حذف سلسلة الترقيم.</div>
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

// =============== NumberingSeries Modal (محسّن) ===============
function NumberingSeriesModal({
  open, record, documentTypes, warehouses, slug: _slug, onClose,
}: {
  open: boolean; record: NumberingSeriesRecord | null; documentTypes: DocumentTypeOption[]; warehouses: WarehouseOption[]; slug: string | null; onClose: () => void;
}) {
  const isEdit = !!record;

  // إذا وصلنا إلى مرحلة التحرير، نتحقق من وجود مستندات سابقة
  const hasExistingDocuments = record ? haveDocumentsBeenCreated(record) : false;

  const emptyForm = {
    document_type_id: '',
    warehouse_id: '' as string | number,
    prefix: '',
    suffix: '',
    format: '{PREFIX}-{YYYY}-{NUMBER:6}',
    last_number: 0,
    padding: 6,
    start_number: 1,
    max_number: '' as string | number,
    reset_yearly: true,
    reset_monthly: false,
    active: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          document_type_id: String(record.document_type_id ?? ''),
          warehouse_id: record.warehouse_id ?? '',
          prefix: record.prefix ?? '',
          suffix: record.suffix ?? '',
          format: record.format ?? '{PREFIX}-{YYYY}-{NUMBER:6}',
          last_number: record.last_number ?? 0,
          padding: record.padding ?? 6,
          start_number: record.start_number ?? 1,
          max_number: record.max_number ?? '',
          reset_yearly: record.reset_yearly ?? true,
          reset_monthly: record.reset_monthly ?? false,
          active: record.active ?? true,
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
    if (!form.document_type_id) errs.document_type_id = 'نوع المستند مطلوب';
    if (!form.format) errs.format = 'الصيغة مطلوبة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const simulatedNext = useMemo(() => {
    try {
      const num = form.start_number;
      const padded = String(num).padStart(form.padding, '0');
      const fmt = form.format
        .replace('{PREFIX}', form.prefix || 'XXX')
        .replace('{SUFFIX}', form.suffix || '')
        .replace('{YY}', new Date().getFullYear().toString().slice(-2))
        .replace('{YYYY}', new Date().getFullYear().toString())
        .replace('{MM}', String(new Date().getMonth() + 1).padStart(2, '0'))
        .replace('{NUMBER}', padded);
      return fmt.replace(/\{NUMBER:(\d+)\}/g, (_, w) => String(num).padStart(Number(w), '0'));
    } catch { return '...'; }
  }, [form]);

  const saveMutation = useTenantMutation(
    (data: typeof form) => {
      const payload = {
        document_type_id: parseInt(data.document_type_id || '0') || null,
        warehouse_id: data.warehouse_id ? parseInt(String(data.warehouse_id)) : null,
        prefix: data.prefix || null,
        suffix: data.suffix || null,
        format: data.format,
        padding: data.padding,
        start_number: data.start_number,
        max_number: data.max_number ? Number(data.max_number) : null,
        reset_yearly: data.reset_yearly,
        reset_monthly: data.reset_monthly,
        active: data.active,
        ...(isEdit ? {} : { last_number: data.start_number - 1 }),
      };
      return isEdit
        ? numberingSeriesApi.update(record!.id, payload)
        : numberingSeriesApi.create(payload);
    },
    (slug) => tenantKeys.lookups.numberingSeries(slug),
    {
      onSuccess: () => onClose(),
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
    },
  );

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? 'تعديل سلسلة الترقيم' : 'سلسلة ترقيم جديدة'}
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

      {/* تحذير عند وجود مستندات سابقة */}
      {hasExistingDocuments && (
        <AlertBar variant="gold">
          <strong>تنبيه:</strong> توجد مستندات مرتبطة بهذه السلسلة. تعديل الصيغة أو الرقم الحالي قد يسبب تعارضاً.
        </AlertBar>
      )}

      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg">
          <label className="req">نوع المستند</label>
          <select value={form.document_type_id as string} onChange={e => set('document_type_id', e.target.value)}
            style={{ borderColor: errors.document_type_id ? 'var(--red)' : undefined }}>
            <option value="">— اختر —</option>
            {documentTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name} ({dt.code})</option>)}
          </select>
          {errors.document_type_id && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.document_type_id}</span>}
        </div>

        <div className="fg">
          <label>المستودع (اختياري)</label>
          <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}>
            <option value="">— كل المستودعات —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="fg">
          <label>البادئة</label>
          <input value={form.prefix} onChange={e => set('prefix', e.target.value.toUpperCase())} placeholder="INV" style={{ fontFamily: 'monospace' }} />
        </div>
        <div className="fg">
          <label>اللاحقة</label>
          <input value={form.suffix ?? ''} onChange={e => set('suffix', e.target.value.toUpperCase() || null)} placeholder="-DZ" style={{ fontFamily: 'monospace' }} />
        </div>

        <div className="fg s2">
          <label className="req">الصيغة</label>
          <input
            value={form.format}
            onChange={e => set('format', e.target.value)}
            style={{
              fontFamily: 'monospace',
              borderColor: errors.format ? 'var(--red)' : undefined,
              background: hasExistingDocuments ? 'var(--bg3)' : undefined,
              opacity: hasExistingDocuments ? 0.7 : 1,
              marginBottom: 6,
            }}
            readOnly={hasExistingDocuments}
            placeholder="اكتب الصيغة يدوياً أو اختر نموذجاً من القائمة"
          />
          {!hasExistingDocuments && (
            <select
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
              onChange={e => { if (e.target.value) set('format', e.target.value); }}
              value=""
            >
              <option value="">— اختر نموذج صيغة —</option>
              <optgroup label="بفاصل شرطة">
                <option value="{PREFIX}-{YYYY}-{NUMBER:6}">{'{PREFIX}-{YYYY}-{NUMBER:6}'}  ←  FV-2026-000001</option>
                <option value="{PREFIX}-{YY}{MM}-{NUMBER:4}">{'{PREFIX}-{YY}{MM}-{NUMBER:4}'}  ←  FV-2606-0001</option>
                <option value="{PREFIX}-{YYYY}-{MM}-{NUMBER:4}">{'{PREFIX}-{YYYY}-{MM}-{NUMBER:4}'}  ←  FV-2026-06-0001</option>
                <option value="{PREFIX}-{NUMBER:6}">{'{PREFIX}-{NUMBER:6}'}  ←  FV-000001</option>
                <option value="{PREFIX}-{YYYY}-{NUMBER:6}-{SUFFIX}">{'{PREFIX}-{YYYY}-{NUMBER:6}-{SUFFIX}'}  ←  FV-2026-000001-DZ</option>
              </optgroup>
              <optgroup label="بفاصل شرطة مائلة">
                <option value="{PREFIX}/{YY}/{NUMBER:6}">{'{PREFIX}/{YY}/{NUMBER:6}'}  ←  FV/26/000001</option>
                <option value="{PREFIX}/{YYYY}/{NUMBER:5}">{'{PREFIX}/{YYYY}/{NUMBER:5}'}  ←  FV/2026/00001</option>
                <option value="{PREFIX}/{YY}/{MM}/{NUMBER:4}">{'{PREFIX}/{YY}/{MM}/{NUMBER:4}'}  ←  FV/26/06/0001</option>
                <option value="{PREFIX}/{NUMBER:6}">{'{PREFIX}/{NUMBER:6}'}  ←  FV/000001</option>
              </optgroup>
              <optgroup label="بدون فاصل">
                <option value="{PREFIX}{NUMBER:6}">{'{PREFIX}{NUMBER:6}'}  ←  FV000001</option>
                <option value="{PREFIX}{YY}{MM}{NUMBER:4}">{'{PREFIX}{YY}{MM}{NUMBER:4}'}  ←  FV26060001</option>
                <option value="{NUMBER:8}">{'{NUMBER:8}'}  ←  00000001</option>
              </optgroup>
            </select>
          )}
          {errors.format && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.format}</span>}
          {hasExistingDocuments && <span style={{ fontSize: 10, color: 'var(--gold)' }}>تم تعطيل تعديل الصيغة لوجود مستندات مرتبطة</span>}
        </div>

        <div className="fg">
          <label>الخانات (Padding)</label>
          <select value={form.padding} onChange={e => set('padding', +e.target.value)}>
            {[2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>رقم البداية</label>
          <input type="number" value={form.start_number} onChange={e => set('start_number', +e.target.value || 0)} min={0} />
        </div>
        {isEdit && (
          <div className="fg">
            <label>الرقم الحالي</label>
            <input
              type="number"
              value={form.last_number}
              onChange={e => {
                if (!hasExistingDocuments) set('last_number', +e.target.value || 0);
              }}
              readOnly={hasExistingDocuments}
              style={{
                background: hasExistingDocuments ? 'var(--bg3)' : undefined,
                opacity: hasExistingDocuments ? 0.7 : 1,
              }}
            />
            {hasExistingDocuments && <span style={{ fontSize: 10, color: 'var(--gold)' }}>لا يمكن تقليل الرقم لأقل من أعلى رقم صادر</span>}
          </div>
        )}
        <div className="fg">
          <label>الحد الأقصى</label>
          <input type="number" value={form.max_number} onChange={e => set('max_number', e.target.value)} placeholder="غير محدود" />
        </div>

        <div className="fg">
          <label>إعادة سنوية</label>
          <Switch checked={form.reset_yearly} onChange={v => { set('reset_yearly', v); if (v) set('reset_monthly', false); }} />
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{form.reset_yearly ? 'سيعاد التعيين مع بداية السنة' : ''}</span>
        </div>
        <div className="fg">
          <label>إعادة شهرية</label>
          <Switch checked={form.reset_monthly} onChange={v => { set('reset_monthly', v); if (v) set('reset_yearly', false); }} />
        </div>
        <div className="fg">
          <label>نشط</label>
          <Switch checked={form.active} onChange={v => set('active', v)} />
        </div>
        <div className="fg s2" style={{ marginTop: 8 }}>
          <label>معاينة الرقم الأول</label>
          <div style={{
            padding: '12px', background: 'var(--emb)', border: '1px solid var(--embo)',
            borderRadius: 'var(--r2)', fontFamily: 'monospace', fontSize: 18, fontWeight: 800,
            color: 'var(--em)', textAlign: 'center', direction: 'ltr', letterSpacing: 1,
          }}>{simulatedNext}</div>
        </div>
      </div>
    </Modal>
  );
}
