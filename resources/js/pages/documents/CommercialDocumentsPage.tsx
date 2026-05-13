// ════════════════════════════════════════════════
// resources/js/pages/documents/CommercialDocumentsPage.tsx
// صفحة المستندات التجارية — نظام متكامل
// ════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useFiscalYear } from '@/context/FiscalYearContext';
import CommercialDocumentModal from './CommercialDocumentModal';
import type { DocumentType } from '@/types';

// ── Status config ──────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',           color: 'var(--t4)',     bg: 'var(--bg3)'   },
  pending:        { label: 'قيد الانتظار',     color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',            color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً',    color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',            color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',            color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',             color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',            color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function fmtNum(n?: number | string) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? '—' : v.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';
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

export default function CommercialDocumentsPage() {
  const { typeCode } = useParams<{ typeCode: string }>();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const { selectedYear, isReadOnly } = useFiscalYear() as any;

  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<'add' | 'edit' | 'view' | null>(null);
  const [activeDoc,  setActiveDoc]  = useState<any | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const { data: docType } = useQuery<DocumentType>({
    queryKey: ['document-type', typeCode],
    queryFn: () =>
      apiClient
        .get('/document-types', { params: { per_page: 500 } })
        .then((r) => {
          const list = r.data.data ?? [];
          return list.find((dt: any) => dt.code === typeCode) ?? null;
        }),
  });

  const { data: docs, isLoading, isFetching } = useQuery({
    queryKey: ['commercial-documents', typeCode, selectedYear?.id, search, statusFilter, page],
    queryFn: () =>
      apiClient.get('/commercial-documents', {
        params: {
          'filter[document_type_id]': docType?.id,
          'filter[fiscal_year_id]': selectedYear?.id,
          'filter[search]': search || undefined,
          'filter[document_status_id]': statusFilter || undefined,
          include: 'party,documentStatus,warehouse',
          sort: '-document_date',
          per_page: 15,
          page,
        },
      }).then(r => r.data),
    enabled: !!docType?.id && !!selectedYear?.id,
    placeholderData: keepPreviousData,
  });

  const items = docs?.data ?? [];
  const meta  = docs?.meta ?? {};
  const isPurch = docType?.document_base_operation_id === 2;

  const validateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/validate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم اعتماد المستند بنجاح'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الاعتماد', 'error'),
  });
  const lockMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/lock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم قفل المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل القفل', 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم إلغاء المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الإلغاء', 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/commercial-documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم حذف المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الحذف', 'error'),
  });

  const opColor = isPurch ? 'var(--purple)' : 'var(--em)';
  const opIcon  = isPurch ? 'ti-shopping-cart' : 'ti-file-invoice';

  return (
    <div className="page on" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r2)',
          background: toast.type === 'success' ? 'var(--em)' : 'var(--red)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 24px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} />
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>{meta.total ?? 0} مستند</span>
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
        {!isReadOnly && (
          <button className="btn btn-p" onClick={() => { setActiveDoc(null); setModal('add'); }}>
            <i className="ti ti-plus" /> {docType?.name ?? 'مستند'} جديد
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="srch" style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input type="text" placeholder="بحث برقم المستند، اسم المتعامل..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{
          padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
          outline: 'none', cursor: 'pointer',
        }}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
        <button className="btn" onClick={() => { setSearch(''); setStatus(''); setPage(1); }} title="إعادة الضبط">
          <i className="ti ti-refresh" />
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, color: 'var(--t3)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} /> جارٍ تحميل المستندات...
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, color: 'var(--t4)' }}>
            <i className="ti ti-file-off" style={{ fontSize: 40 }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد مستندات</div>
            <div style={{ fontSize: 12 }}>
              {search || statusFilter ? 'لا توجد نتائج تطابق البحث' : `لم يتم إنشاء أي ${docType?.name ?? 'مستند'} بعد`}
            </div>
            {!isReadOnly && !search && !statusFilter && (
              <button className="btn btn-p btn-sm" style={{ marginTop: 4 }} onClick={() => { setActiveDoc(null); setModal('add'); }}>
                <i className="ti ti-plus" /> إضافة أول مستند
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="tw" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>رقم المستند</th><th>التاريخ</th><th>{isPurch ? 'المورد' : 'الزبون'}</th><th>المستودع</th><th>الإجمالي HT</th><th>TVA</th><th>الإجمالي TTC</th><th>الحالة</th><th style={{ textAlign: 'center', width: 130 }}>إجراءات</th></tr>
                </thead>
                <tbody>
                  {items.map((doc: any) => {
                    const status = doc.document_status?.name ?? 'draft';
                    const canEdit = !doc.is_locked && status === 'draft';
                    const canValid = !doc.validated_at && status === 'draft';
                    const canLock = !!doc.validated_at && !doc.is_locked;
                    const canCancel = !['cancelled', 'returned'].includes(status);
                    return (
                      <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveDoc(doc); setModal('view'); }}>
                        <td><span style={{ fontWeight: 800, color: opColor, fontFamily: 'monospace', fontSize: 13 }}>{doc.document_number ?? `#${doc.id}`}</span>{doc.is_locked && <i className="ti ti-lock" style={{ fontSize: 11, color: 'var(--t4)', marginRight: 6 }} />}</td>
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>{fmtDate(doc.document_date)}</td>
                        <td>{doc.party ? <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{doc.party.name}</span> : <span style={{ color: 'var(--t4)' }}>—</span>}</td>
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>{doc.warehouse?.name ?? '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--t2)', textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_ht)}</td>
                        <td style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_tva)}</td>
                        <td style={{ fontWeight: 800, color: opColor, textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_ttc)}</td>
                        <td><StatusBadge status={status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {!isReadOnly && canEdit && <button className="btn btn-xs" title="تعديل" onClick={() => { setActiveDoc(doc); setModal('edit'); }}><i className="ti ti-pencil" /></button>}
                            {!isReadOnly && canValid && <button className="btn btn-xs" title="اعتماد" style={{ color: 'var(--blue)', borderColor: 'color-mix(in srgb, var(--blue) 30%, transparent)' }} onClick={() => validateMutation.mutate(doc.id)}><i className="ti ti-check" /></button>}
                            {!isReadOnly && canLock && <button className="btn btn-xs" title="قفل" style={{ color: 'var(--orange)', borderColor: 'color-mix(in srgb, var(--orange) 30%, transparent)' }} onClick={() => lockMutation.mutate(doc.id)}><i className="ti ti-lock" /></button>}
                            <button className="btn btn-xs" title="طباعة" style={{ color: 'var(--t4)' }}><i className="ti ti-printer" /></button>
                            {!isReadOnly && (canEdit ? <button className="btn btn-xs btn-r" title="حذف" onClick={() => { if(confirm('هل تريد حذف هذا المستند؟')) deleteMutation.mutate(doc.id); }}><i className="ti ti-trash" /></button> : canCancel ? <button className="btn btn-xs btn-r" title="إلغاء" onClick={() => { if(confirm('إلغاء هذا المستند؟')) cancelMutation.mutate(doc.id); }}><i className="ti ti-x" /></button> : null)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta.last_page > 1 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><i className="ti ti-chevron-right" /></button>
                  {Array.from({ length: Math.min(meta.last_page, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} className="btn btn-xs" style={page === p ? { background: 'var(--em)', color: '#fff', borderColor: 'var(--em)' } : {}} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}><i className="ti ti-chevron-left" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <CommercialDocumentModal
          open={true}
          documentType={docType ?? null}
          existingDocument={modal === 'edit' ? activeDoc : undefined}
          onClose={() => { setModal(null); setActiveDoc(null); }}
          onSaved={() => {
            showToast(modal === 'add' ? 'تم إنشاء المستند بنجاح' : 'تم تحديث المستند بنجاح');
            setModal(null); setActiveDoc(null);
            qc.invalidateQueries({ queryKey: ['commercial-documents'] });
          }}
        />
      )}

      {modal === 'view' && activeDoc && (
        <DocumentViewModal
          doc={activeDoc}
          docType={docType ?? null}
          onClose={() => { setModal(null); setActiveDoc(null); }}
          onEdit={() => setModal('edit')}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

function DocumentViewModal({ doc, docType, onClose, onEdit, isReadOnly }: {
  doc: any; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean;
}) {
  const status = doc.document_status?.name ?? 'draft';
  const isPurch = docType?.document_base_operation_id === 2;
  const { data: fullDoc, isLoading } = useQuery({
    queryKey: ['commercial-document-detail', doc.id],
    queryFn: () => apiClient.get(`/commercial-documents/${doc.id}`, {
      params: { include: 'party,documentStatus,warehouse,fiscalYear,currency,lines,lines.productVariant,lines.productVariant.product,documentType,validatedBy' },
    }).then(r => r.data.data),
  });
  const d = fullDoc ?? doc;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'auto', background: 'var(--bg1)', borderRadius: 'var(--r3)', boxShadow: '0 24px 64px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{docType?.name} — {d.document_number ?? `#${d.id}`}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <StatusBadge status={status} />
                {d.is_locked && <span style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-lock" style={{ fontSize: 11 }} /> مقفل</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isReadOnly && !d.is_locked && status === 'draft' && <button className="btn btn-sm" onClick={onEdit}><i className="ti ti-pencil" /> تعديل</button>}
            <button className="btn btn-sm" onClick={() => window.print()}><i className="ti ti-printer" /> طباعة</button>
            <button className="btn btn-sm btn-xs" onClick={onClose}><i className="ti ti-x" /></button>
          </div>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--t3)' }}><i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} /></div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[{ label: isPurch ? 'المورد' : 'الزبون', value: d.party?.name }, { label: 'التاريخ', value: fmtDate(d.document_date) }, { label: 'تاريخ الاستحقاق', value: fmtDate(d.due_date) }, { label: 'المستودع', value: d.warehouse?.name }, { label: 'السنة المالية', value: d.fiscal_year?.name }, { label: 'العملة', value: d.currency?.code }].map(({ label, value }) => value ? (
                <div key={label} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', background: 'var(--bg2)', border: '1px solid var(--b1)' }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{value}</div>
                </div>
              ) : null)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>أسطر المستند</div>
              <div className="tw">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th>#</th><th>المنتج</th><th style={{ textAlign: 'left' }}>الكمية</th><th style={{ textAlign: 'left' }}>سعر HT</th><th style={{ textAlign: 'left' }}>خصم</th><th style={{ textAlign: 'left' }}>TVA</th><th style={{ textAlign: 'left' }}>الإجمالي TTC</th></tr></thead>
                  <tbody>{(d.lines ?? []).map((line: any, idx: number) => {
                    const product = line.product_variant?.product;
                    const variantName = line.product_variant?.variant_name;
                    return (<tr key={line.id ?? idx}>
                      <td style={{ color: 'var(--t4)', fontSize: 11 }}>{idx + 1}</td>
                      <td><div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>{product?.name ?? '—'}</div>{variantName && <div style={{ fontSize: 11, color: 'var(--t4)' }}>{variantName}</div>}</td>
                      <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 600 }}>{parseFloat(line.quantity).toLocaleString('fr-DZ')}</td>
                      <td style={{ direction: 'ltr', textAlign: 'left' }}>{fmtNum(line.unit_price_ht)}</td>
                      <td style={{ color: 'var(--red)', direction: 'ltr', textAlign: 'left' }}>{parseFloat(line.discount_percentage ?? 0) > 0 ? `-${line.discount_percentage}%` : '—'}</td>
                      <td style={{ color: 'var(--t4)', direction: 'ltr', textAlign: 'left' }}>{line.tva_rate}%</td>
                      <td style={{ fontWeight: 800, color: 'var(--em)', direction: 'ltr', textAlign: 'left' }}>{fmtNum(line.total_ttc)}</td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[{ label: 'إجمالي HT', value: d.total_ht, color: 'var(--t2)' }, { label: 'TVA', value: d.total_tva, color: 'var(--t3)' }, d.total_discount && parseFloat(d.total_discount) > 0 && { label: 'الخصم', value: `-${fmtNum(d.total_discount)}`, color: 'var(--red)' }, d.total_stamp && parseFloat(d.total_stamp) > 0 && { label: 'الطابع الجبائي', value: d.total_stamp, color: 'var(--t3)' }].filter(Boolean).map((row: any) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: row.color }}>
                    <span>{row.label}</span><span style={{ fontWeight: 600, direction: 'ltr' }}>{typeof row.value === 'string' && row.value.startsWith('-') ? row.value : fmtNum(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--b2)', fontSize: 15, fontWeight: 800 }}>
                  <span style={{ color: 'var(--t1)' }}>الإجمالي TTC</span><span style={{ color: 'var(--em)', direction: 'ltr' }}>{fmtNum(d.total_ttc)}</span>
                </div>
                {d.remaining_amount && parseFloat(d.remaining_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--t4)' }}>المبلغ المتبقي</span><span style={{ color: 'var(--red)', fontWeight: 700, direction: 'ltr' }}>{fmtNum(d.remaining_amount)}</span></div>
                )}
              </div>
            </div>
            {d.notes && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--r2)', background: 'var(--bg2)', border: '1px solid var(--b1)', fontSize: 12.5, color: 'var(--t3)' }}>
                <i className="ti ti-notes" style={{ marginLeft: 6 }} /> {d.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
