// resources/js/pages/documents/CommercialDocumentsPage.tsx
// ════════════════════════════════════════════════════════════════════════════
// ✅ التحسينات:
//   1. زرّ "بيع سريع" → يفتح QuickSaleModal (في صفحة أي مستند مبيعات)
//   2. زرّ "مستند جديد" → يفتح CommercialDocumentModal (الصفحة الكاملة)
//   3. invalidateDocs يستخدم tenantKeys.documents.all(slug) الصحيح
//   4. import من CommercialDocumentModal الجديد (لا .old)
//   5. isPurch يعتمد على code وليس document_base_operation_id
//   6. إصلاح queryKey لـ document-type ليشمل slug
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { useParams }                     from 'react-router-dom';
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api/core/client';
import { tenantKeys }                   from '@/lib/api/core/queryKeys';
import { useActiveSlug }                from '@/lib/store/appStore';
import { useFiscalYear }                from '@/context/FiscalYearContext';
import CommercialDocumentModal          from './CommercialDocumentModal';
import QuickSaleModal                   from './QuickSaleModal';
import type { DocumentType }            from '@/lib/api/core/types';

// ── codes التي تخص المبيعات (يظهر زر "بيع سريع") ──────────────────────────
const SALE_CODES = new Set(['FV', 'BL', 'DEV', 'BCC', 'AV']);

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',        color: 'var(--t4)',     bg: 'var(--bg3)' },
  pending:        { label: 'قيد الانتظار', color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',         color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً', color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',         color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',         color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',          color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',         color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}
function fmtNum(n?: number | string) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? '—'
    : v.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: 'var(--t4)', bg: 'var(--bg3)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function CommercialDocumentsPage() {
  const { typeCode }  = useParams<{ typeCode: string }>();
  const qc            = useQueryClient();
  const slug          = useActiveSlug();
  const { selectedYear, isReadOnly } = useFiscalYear() as {
    selectedYear?: { id: number; name: string };
    isReadOnly?: boolean;
  };

  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatus]      = useState('');
  const [page,         setPage]        = useState(1);
  // modal: null | 'add' | 'edit' | 'view' | 'quick'
  const [modal,        setModal]       = useState<'add' | 'edit' | 'view' | 'quick' | null>(null);
  const [activeDoc,    setActiveDoc]   = useState<Record<string, unknown> | null>(null);
  const [editDocFull,  setEditDocFull] = useState<Record<string, unknown> | null>(null);
  const [loadingEdit,  setLoadingEdit] = useState(false);
  const [toast,        setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ✅ isPurch يعتمد على code وليس document_base_operation_id
  const PURCHASE_CODES = new Set(['FA', 'BR', 'DDP', 'BCF', 'AA']);
  const isPurch   = PURCHASE_CODES.has(typeCode ?? '');
  const isSalable = SALE_CODES.has(typeCode ?? '');

  const opColor = isPurch ? 'var(--purple)' : 'var(--em)';
  const opIcon  = isPurch ? 'ti-shopping-cart' : 'ti-file-invoice';

  // ── ✅ invalidateDocs موحّدة — تُبطل كل مستندات هذه الشركة ────────────────
  const invalidateDocs = useCallback(() => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  }, [qc, slug]);

  // ── جلب المستندات ────────────────────────────────────────────────────────
  const { data: docType, isLoading: loadingDocType } = useQuery<DocumentType>({
  queryKey: [slug, 'document-type-by-code', typeCode],
  queryFn: () => apiGet<{ data: DocumentType[] }>('/document-types', { per_page: 500 })
    .then(res => {
      const list = Array.isArray(res) ? res : (res as { data?: DocumentType[] }).data ?? [];
      return list.find(dt => dt.code === typeCode) ?? null;
    }),
  enabled: !!slug && !!typeCode,
  staleTime: 10 * 60_000,
});

  const { data: docs, isLoading, isFetching } = useQuery({
    // ✅ يشمل slug في الـ key لعزل الشركات
    queryKey: tenantKeys.documents.byType(slug ?? '', typeCode ?? '', {
      fiscal_year_id: selectedYear?.id,
      document_type_id: docType?.id,
      search,
      status: statusFilter,
      page,
    }),
    queryFn: () =>
  apiGet<{ data: unknown[]; meta: unknown }>('/documents', {
    'filter[document_type_id]':       docType?.id,      // ✅ صحيح
    'filter[fiscal_year_id]':         selectedYear?.id,
    'filter[search]':                 search || undefined,
    'filter[document_status_id]':     statusFilter || undefined,
    include:  'party,documentStatus,warehouse',
    sort:     '-document_date',
    per_page: 15,
    page,
  }),
    enabled: !!slug && !!typeCode && !!selectedYear?.id && !!docType?.id,
    placeholderData: keepPreviousData,
    staleTime:       2 * 60_000,
  });

  // ✅ دعم قراءة البيانات سواء كانت مصفوفة مباشرة أو داخل كائن data
const items = Array.isArray(docs) ? docs : ((docs as { data?: unknown[] })?.data ?? []);
const meta  = (docs as { meta?: Record<string, number> })?.meta ?? {
  total: 0, last_page: 1, current_page: 1, from: 0, to: 0
};

  // ── فتح مودل التعديل (جلب البيانات الكاملة) ─────────────────────────────
  const openEditModal = async (doc: Record<string, unknown>) => {
    setLoadingEdit(true);
    setActiveDoc(doc);
    try {
      const res = await apiGet<{ data?: unknown; id?: unknown }>(
        `/documents/${doc.id}`,
        { include: 'party,warehouse,fiscalYear,currency,documentStatus,lines,lines.product,lines.packaging' }
      );
      const full = (res as Record<string, unknown>).data ?? res;
      // تحويل التواريخ إلى YYYY-MM-DD
      const formatDate = (d: unknown) =>
        d ? String(d).split('T')[0] : '';
      setEditDocFull({
        ...(full as Record<string, unknown>),
        document_date: formatDate((full as Record<string, unknown>).document_date),
        due_date:      formatDate((full as Record<string, unknown>).due_date),
      });
      setModal('edit');
    } catch {
      showToast('فشل تحميل بيانات المستند', 'error');
    } finally {
      setLoadingEdit(false);
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/documents/${id}/validate`),
    onSuccess:  () => { invalidateDocs(); showToast('تم اعتماد المستند بنجاح'); },
    onError:    (e: unknown) => showToast(
      (e as Record<string, unknown>)?.message as string ?? 'فشل الاعتماد', 'error'
    ),
  });
  const lockMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
    onSuccess:  () => { invalidateDocs(); showToast('تم قفل المستند'); },
    onError:    (e: unknown) => showToast(
      (e as Record<string, unknown>)?.message as string ?? 'فشل القفل', 'error'
    ),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/documents/${id}/cancel`),
    onSuccess:  () => { invalidateDocs(); showToast('تم إلغاء المستند'); },
    onError:    (e: unknown) => showToast(
      (e as Record<string, unknown>)?.message as string ?? 'فشل الإلغاء', 'error'
    ),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/documents/${id}`),
    onSuccess:  () => { invalidateDocs(); showToast('تم حذف المستند'); },
    onError:    (e: unknown) => showToast(
      (e as Record<string, unknown>)?.message as string ?? 'فشل الحذف', 'error'
    ),
  });

  const closeAllModals = useCallback(() => {
    setModal(null);
    setActiveDoc(null);
    setEditDocFull(null);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="page on" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r2)',
          background: toast.type === 'success' ? 'var(--em)' : 'var(--red)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 24px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} />
          {toast.msg}
        </div>
      )}

      {/* ── Header الصفحة ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        {/* العنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `color-mix(in srgb, ${opColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${opColor} 25%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: opColor, fontSize: 20,
          }}>
            <i className={`ti ${opIcon}`} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>
              {docType?.name ?? '...'}
              {docType?.name_latin && (
                <span style={{ fontSize: 12, color: 'var(--t4)', marginRight: 8, fontWeight: 400 }}>
                  {docType.name_latin}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                {(meta as Record<string, number>).total ?? 0} مستند
              </span>
              {selectedYear && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--blue) 12%, transparent)',
                  color: 'var(--blue)',
                }}>{selectedYear.name}</span>
              )}
              {isReadOnly && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--red) 12%, transparent)',
                  color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-lock" style={{ fontSize: 9 }} /> للقراءة فقط
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ الأزرار الجديدة */}
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

            {/* زر البيع السريع — يظهر فقط لأنواع المبيعات */}
            {isSalable && (
              <button
                className="btn"
                onClick={() => setModal('quick')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
                  color: 'white', border: 'none',
                  padding: '8px 16px', borderRadius: 'var(--r2)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--em) 40%, transparent)',
                }}
              >
                <i className="ti ti-bolt" style={{ fontSize: 15 }} />
                بيع سريع
              </button>
            )}

            {/* زر مستند جديد — يفتح الـ Modal الكامل */}
            <button
              className="btn btn-p"
              onClick={() => { setActiveDoc(null); setEditDocFull(null); setModal('add'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-plus" />
              {docType?.name ?? 'مستند'} جديد
            </button>
          </div>
        )}
      </div>

      {/* ── شريط البحث والفلاتر ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="srch" style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="بحث برقم المستند، اسم المتعامل..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{
            padding: '7px 12px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)', background: 'var(--bg1)',
            color: 'var(--t1)', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
          title="إعادة الضبط"
        >
          <i className="ti ti-refresh" />
        </button>
      </div>

      {/* ── جدول المستندات ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        {isLoading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 220, gap: 10, color: 'var(--t3)',
          }}>
            <i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} />
            جارٍ تحميل المستندات...
          </div>
        ) : items.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 220, gap: 10, color: 'var(--t4)',
          }}>
            <i className="ti ti-file-off" style={{ fontSize: 40 }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد مستندات</div>
            <div style={{ fontSize: 12 }}>
              {search || statusFilter
                ? 'لا توجد نتائج تطابق البحث'
                : `لم يتم إنشاء أي ${docType?.name ?? 'مستند'} بعد`}
            </div>
            {!isReadOnly && !search && !statusFilter && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {isSalable && (
                  <button
                    className="btn btn-sm"
                    style={{
                      background: 'var(--em)', color: 'white', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    onClick={() => setModal('quick')}
                  >
                    <i className="ti ti-bolt" /> بيع سريع
                  </button>
                )}
                <button
                  className="btn btn-p btn-sm"
                  onClick={() => { setActiveDoc(null); setModal('add'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <i className="ti ti-plus" /> إضافة أول مستند
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="tw" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>رقم المستند</th>
                    <th>التاريخ</th>
                    <th>{isPurch ? 'المورد' : 'الزبون'}</th>
                    <th>المستودع</th>
                    <th>إجمالي HT</th>
                    <th>TVA</th>
                    <th>إجمالي TTC</th>
                    <th>الحالة</th>
                    <th style={{ textAlign: 'center', width: 160 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as Record<string, unknown>[]).map((doc) => {
                    const status   = (doc.document_status as Record<string, unknown>)?.name as string ?? 'draft';
                    const canEdit  = !doc.is_locked && status === 'draft';
                    const canValid = !doc.validated_at && status === 'draft';
                    const canLock  = !!doc.validated_at && !doc.is_locked;
                    const canCancel = !['cancelled', 'returned'].includes(status);
                    const docId    = Number(doc.id);

                    return (
                      <tr
                        key={String(doc.id)}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setActiveDoc(doc); setModal('view'); }}
                      >
                        {/* رقم المستند */}
                        <td>
                          <span style={{
                            fontWeight: 800, color: opColor,
                            fontFamily: 'monospace', fontSize: 13,
                          }}>
                            {String(doc.document_number ?? `#${doc.id}`)}
                          </span>
                          {doc.is_locked && (
                            <i className="ti ti-lock" style={{
                              fontSize: 11, color: 'var(--t4)', marginRight: 6,
                            }} />
                          )}
                        </td>

                        {/* التاريخ */}
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>
                          {fmtDate(doc.document_date as string)}
                        </td>

                        {/* المتعامل */}
                        <td>
                          {doc.party
                            ? <span style={{ fontWeight: 600, color: 'var(--t1)' }}>
                                {String((doc.party as Record<string, unknown>).name)}
                              </span>
                            : <span style={{ color: 'var(--t4)' }}>نقدي</span>
                          }
                        </td>

                        {/* المستودع */}
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>
                          {String((doc.warehouse as Record<string, unknown>)?.name ?? '—')}
                        </td>

                        {/* الإجماليات */}
                        <td style={{ fontWeight: 600, color: 'var(--t2)', textAlign: 'left', direction: 'ltr' }}>
                          {fmtNum(doc.total_ht as number)}
                        </td>
                        <td style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'left', direction: 'ltr' }}>
                          {fmtNum(doc.total_tva as number)}
                        </td>
                        <td style={{ fontWeight: 800, color: opColor, textAlign: 'left', direction: 'ltr' }}>
                          {fmtNum(doc.total_ttc as number)}
                        </td>

                        {/* الحالة */}
                        <td><StatusBadge status={status} /></td>

                        {/* الإجراءات */}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>

                            {/* تعديل */}
                            {!isReadOnly && canEdit && (
                              <button
                                className="btn btn-xs"
                                title="تعديل"
                                disabled={loadingEdit}
                                onClick={() => openEditModal(doc)}
                              >
                                {loadingEdit && activeDoc?.id === doc.id
                                  ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                                  : <i className="ti ti-pencil" />}
                              </button>
                            )}

                            {/* اعتماد */}
                            {!isReadOnly && canValid && (
                              <button
                                className="btn btn-xs" title="اعتماد"
                                style={{ color: 'var(--blue)', borderColor: 'color-mix(in srgb, var(--blue) 30%, transparent)' }}
                                onClick={() => validateMutation.mutate(docId)}
                                disabled={validateMutation.isPending}
                              >
                                <i className="ti ti-check" />
                              </button>
                            )}

                            {/* قفل */}
                            {!isReadOnly && canLock && (
                              <button
                                className="btn btn-xs" title="قفل"
                                style={{ color: 'var(--orange)', borderColor: 'color-mix(in srgb, var(--orange) 30%, transparent)' }}
                                onClick={() => lockMutation.mutate(docId)}
                                disabled={lockMutation.isPending}
                              >
                                <i className="ti ti-lock" />
                              </button>
                            )}

                            {/* طباعة */}
                            <button
                              className="btn btn-xs" title="طباعة"
                              style={{ color: 'var(--t4)' }}
                              onClick={() => window.print()}
                            >
                              <i className="ti ti-printer" />
                            </button>

                            {/* حذف / إلغاء */}
                            {!isReadOnly && (
                              canEdit
                                ? <button
                                    className="btn btn-xs btn-r" title="حذف"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                      if (confirm('هل تريد حذف هذا المستند؟')) {
                                        deleteMutation.mutate(docId);
                                      }
                                    }}
                                  >
                                    <i className="ti ti-trash" />
                                  </button>
                                : canCancel
                                  ? <button
                                      className="btn btn-xs btn-r" title="إلغاء"
                                      disabled={cancelMutation.isPending}
                                      onClick={() => {
                                        if (confirm('إلغاء هذا المستند؟')) {
                                          cancelMutation.mutate(docId);
                                        }
                                      }}
                                    >
                                      <i className="ti ti-x" />
                                    </button>
                                  : null
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(meta as Record<string, number>).last_page > 1 && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--b1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>
                  {(meta as Record<string, number>).from}–{(meta as Record<string, number>).to}
                  {' من '}
                  {(meta as Record<string, number>).total}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-xs"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <i className="ti ti-chevron-right" />
                  </button>
                  {Array.from(
                    { length: Math.min((meta as Record<string, number>).last_page, 7) },
                    (_, i) => i + 1
                  ).map(p => (
                    <button key={p} className="btn btn-xs"
                      style={page === p ? { background: 'var(--em)', color: '#fff', borderColor: 'var(--em)' } : {}}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="btn btn-xs"
                    disabled={page >= (meta as Record<string, number>).last_page}
                    onClick={() => setPage(p => Math.min((meta as Record<string, number>).last_page, p + 1))}>
                    <i className="ti ti-chevron-left" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Modals
      ════════════════════════════════════════════════════════════════ */}

      {/* ✅ مودل البيع السريع */}
      <QuickSaleModal
        open={modal === 'quick'}
        onClose={closeAllModals}
        onSaved={(state) => {
          showToast(`تم إنشاء الفاتورة ${state.document_number} بنجاح`);
          closeAllModals();
          invalidateDocs();
        }}
      />

      {/* ✅ مودل الإنشاء / التعديل الكامل */}
      {(modal === 'add' || modal === 'edit') && (
        <CommercialDocumentModal
          open={true}
          documentType={docType ?? null}
          existingDocument={modal === 'edit' ? editDocFull ?? undefined : undefined}
          onClose={closeAllModals}
          onSaved={() => {
            showToast(modal === 'add' ? 'تم إنشاء المستند بنجاح' : 'تم تحديث المستند بنجاح');
            closeAllModals();
            invalidateDocs();
          }}
        />
      )}

      {/* ✅ مودل العرض */}
      {modal === 'view' && activeDoc && (
        <DocumentViewModal
          doc={activeDoc}
          docType={docType ?? null}
          onClose={closeAllModals}
          onEdit={() => {
            openEditModal(activeDoc);
          }}
          isReadOnly={isReadOnly ?? false}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DocumentViewModal — عرض تفاصيل المستند
// ════════════════════════════════════════════════════════════════════════════
function DocumentViewModal({
  doc, docType, onClose, onEdit, isReadOnly,
}: {
  doc: Record<string, unknown>;
  docType: DocumentType | null;
  onClose: () => void;
  onEdit: () => void;
  isReadOnly: boolean;
}) {
  const slug   = useActiveSlug();
  const status = (doc.document_status as Record<string, unknown>)?.name as string ?? 'draft';
  const PURCHASE_CODES = new Set(['FA', 'BR', 'DDP', 'BCF', 'AA']);
  const isPurch = PURCHASE_CODES.has(docType?.code ?? '');

  const { data: fullDoc, isLoading } = useQuery({
    queryKey: [slug, 'doc-detail', doc.id],
    queryFn:  () => apiGet<{ data?: unknown }>(`/documents/${doc.id}`, {
      include: 'party,documentStatus,warehouse,fiscalYear,currency,lines,lines.product,documentType,validatedBy',
    }).then(r => (r as Record<string, unknown>).data ?? r),
    staleTime: 2 * 60_000,
  });

  const d = (fullDoc as Record<string, unknown>) ?? doc;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'auto',
          background: 'var(--bg1)', borderRadius: 'var(--r3)',
          boxShadow: '0 24px 64px rgba(0,0,0,.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>
              {docType?.name} — {String(d.document_number ?? `#${d.id}`)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <StatusBadge status={status} />
              {d.is_locked && (
                <span style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="ti ti-lock" style={{ fontSize: 11 }} /> مقفل
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isReadOnly && !d.is_locked && status === 'draft' && (
              <button className="btn btn-sm" onClick={onEdit}>
                <i className="ti ti-pencil" /> تعديل
              </button>
            )}
            <button className="btn btn-sm" onClick={() => window.print()}>
              <i className="ti ti-printer" /> طباعة
            </button>
            <button className="btn btn-sm btn-xs" onClick={onClose}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, gap: 10, color: 'var(--t3)',
          }}>
            <i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {/* معلومات */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: isPurch ? 'المورد' : 'الزبون', value: (d.party as Record<string, unknown>)?.name },
                { label: 'التاريخ',          value: fmtDate(d.document_date as string) },
                { label: 'تاريخ الاستحقاق', value: fmtDate(d.due_date as string) },
                { label: 'المستودع',          value: (d.warehouse as Record<string, unknown>)?.name },
                { label: 'السنة المالية',     value: (d.fiscal_year as Record<string, unknown>)?.name },
                { label: 'العملة',            value: (d.currency as Record<string, unknown>)?.code },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{
                  padding: '10px 14px', borderRadius: 'var(--r2)',
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                }}>
                  <div style={{
                    fontSize: 10, color: 'var(--t4)', fontWeight: 700,
                    marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                    {String(value)}
                  </div>
                </div>
              ))}
            </div>

            {/* أسطر */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--t4)',
                marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>أسطر المستند</div>
              <div className="tw">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>#</th><th>المنتج</th>
                      <th style={{ textAlign: 'left' }}>الكمية</th>
                      <th style={{ textAlign: 'left' }}>سعر HT</th>
                      <th style={{ textAlign: 'left' }}>خصم</th>
                      <th style={{ textAlign: 'left' }}>TVA</th>
                      <th style={{ textAlign: 'left' }}>الإجمالي TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((d.lines as Record<string, unknown>[]) ?? []).map((line, idx) => {
                      const productName =
                        (line.product as Record<string, unknown>)?.name as string
                        ?? line.description as string
                        ?? '—';
                      return (
                        <tr key={String(line.id ?? idx)}>
                          <td style={{ color: 'var(--t4)', fontSize: 11 }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>
                              {productName}
                            </div>
                            {line.description && line.description !== productName && (
                              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                                {String(line.description)}
                              </div>
                            )}
                          </td>
                          <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 600 }}>
                            {parseFloat(String(line.quantity)).toLocaleString('fr-DZ')}
                          </td>
                          <td style={{ direction: 'ltr', textAlign: 'left' }}>
                            {fmtNum(line.unit_price_ht as number)}
                          </td>
                          <td style={{ color: 'var(--red)', direction: 'ltr', textAlign: 'left' }}>
                            {parseFloat(String(line.discount_percentage ?? 0)) > 0
                              ? `-${line.discount_percentage}%` : '—'}
                          </td>
                          <td style={{ color: 'var(--t4)', direction: 'ltr', textAlign: 'left' }}>
                            {line.tva_rate}%
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--em)', direction: 'ltr', textAlign: 'left' }}>
                            {fmtNum(line.total_ttc as number)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* الإجماليات */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'إجمالي HT', value: d.total_ht, color: 'var(--t2)' },
                  { label: 'TVA',       value: d.total_tva, color: 'var(--t3)' },
                  parseFloat(String(d.total_discount ?? 0)) > 0
                    ? { label: 'الخصم',          value: `-${fmtNum(d.total_discount as number)}`, color: 'var(--red)' }
                    : null,
                  parseFloat(String(d.total_stamp ?? 0)) > 0
                    ? { label: 'الطابع الجبائي', value: d.total_stamp, color: 'var(--t3)' }
                    : null,
                  parseFloat(String((d as Record<string, unknown>).total_tap ?? 0)) > 0
                    ? { label: `TAP`, value: (d as Record<string, unknown>).total_tap, color: 'var(--purple)' }
                    : null,
                ].filter(Boolean).map((row: unknown) => {
                  const r = row as { label: string; value: unknown; color: string };
                  return (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: r.color }}>
                      <span>{r.label}</span>
                      <span style={{ fontWeight: 600, direction: 'ltr' }}>
                        {typeof r.value === 'string' && r.value.startsWith('-')
                          ? r.value : fmtNum(r.value as number)}
                      </span>
                    </div>
                  );
                })}

                {/* TTC */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--b2)',
                  fontSize: 15, fontWeight: 800,
                }}>
                  <span style={{ color: 'var(--t1)' }}>المستحق الكلي</span>
                  <span style={{ color: 'var(--em)', direction: 'ltr' }}>
                    {fmtNum((d.net_to_pay as number) ?? (d.total_ttc as number))}
                  </span>
                </div>

                {/* المدفوع */}
                {parseFloat(String(d.paid_amount ?? 0)) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--t4)' }}>المدفوع</span>
                    <span style={{ color: 'var(--green)', fontWeight: 700, direction: 'ltr' }}>
                      {fmtNum(d.paid_amount as number)}
                    </span>
                  </div>
                )}

                {/* المتبقي */}
                {parseFloat(String(d.remaining_amount ?? 0)) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--t4)' }}>المتبقي</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700, direction: 'ltr' }}>
                      {fmtNum(d.remaining_amount as number)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ملاحظات */}
            {d.notes && (
              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b1)',
                fontSize: 12.5, color: 'var(--t3)',
              }}>
                <i className="ti ti-notes" style={{ marginLeft: 6 }} />
                {String(d.notes)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
