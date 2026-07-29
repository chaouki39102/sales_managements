import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import type { CommercialDocument } from '@/lib/api/core/types';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '@/pos/utils/calculations';

interface Props {
  session:    PosSession;
  onClose:    () => void;
  onOpen:     (docId: number) => void;
  onPrint?:   (docId: number) => void;
}

type DocStatus = 'paid' | 'partial' | 'unpaid' | 'cancelled';

function getDocStatus(doc: CommercialDocument): DocStatus {
  if (doc.status === 'cancelled') return 'cancelled';
  const rem = Number(doc.remaining_amount ?? 0);
  const paid = Number(doc.paid_amount ?? 0);
  if (rem <= 0) return 'paid';
  if (paid > 0 && rem > 0) return 'partial';
  return 'unpaid';
}

const STATUS_META: Record<DocStatus, { label: string; icon: string; cls: string }> = {
  paid:     { label: 'مدفوعة',    icon: 'ti ti-circle-check-filled', cls: 'si-badge-paid' },
  partial:  { label: 'جزئية',     icon: 'ti ti-circle-check',       cls: 'si-badge-partial' },
  unpaid:   { label: 'غير مدفوعة', icon: 'ti ti-circle-x',          cls: 'si-badge-unpaid' },
  cancelled:{ label: 'ملغية',     icon: 'ti ti-circle-off',         cls: 'si-badge-cancelled' },
};

function formatDuration(iso?: string): string {
  if (!iso) return '\u2014';
  const parts = iso.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', '').split(':');
  const h = parts[0] ? parts[0].padStart(2, '0') : '00';
  const m = parts.length > 1 ? parts[1].padStart(2, '0') : '00';
  const s = parts.length > 2 ? parts[2].padStart(2, '0') : '00';
  return `${h}:${m}:${s}`;
}

function exportCsv(docs: CommercialDocument[]): void {
  const headers = ['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'];
  const rows = docs.map(d => [
    d.document_number,
    d.party?.name ?? '',
    (d.document_date ?? '').slice(0, 10),
    String(Number(d.total_ttc ?? 0).toFixed(2)),
    String(Number(d.paid_amount ?? 0).toFixed(2)),
    String(Number(d.remaining_amount ?? 0).toFixed(2)),
    STATUS_META[getDocStatus(d)].label,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `فواتير-الجلسة-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const COL_IDS   = ['num', 'doc_num', 'client', 'date', 'status', 'ttc', 'paid', 'remaining', 'print'];
const COL_STORAGE_KEY = 'si-col-widths';
const COL_MIN         = 40;
const COL_DEFAULTS: Record<string, number> = {
  num: 50, doc_num: 130, client: 160, date: 100,
  status: 100, ttc: 100, paid: 100, remaining: 100, print: 50,
};

function loadColWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COL_STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p; }
  } catch { /* ignore */ }
  return { ...COL_DEFAULTS };
}

export default function SessionInvoicesModal({ session, onClose, onOpen, onPrint }: Props) {
  const [docs, setDocs] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortField, setSortField] = useState<string>('document_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const listRef = useRef<HTMLTableSectionElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const colRefs = useRef<Map<string, HTMLTableColElement>>(new Map());
  const resizeRef = useRef<{
    colId: string; startX: number; startW: number;
  } | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(loadColWidths);
  const colWidthsRef = useRef(colWidths);
  useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);

  const saveColWidths = useCallback((widths: Record<string, number>) => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(widths));
  }, []);

  const activeColIds = useMemo(() => {
    if (onPrint) return COL_IDS;
    return COL_IDS.filter(id => id !== 'print');
  }, [onPrint]);

  const openedDate = session.opened_at?.slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentsApi.list({
      include: 'party',
      per_page: 200,
      sort: '-created_at',
      'filter[created_at]': `${openedDate},${today}`,
      'filter[warehouse_id]': session.warehouse?.id,
      'filter[user_id]': session.user?.id,
    }).then((res: any) => {
      if (cancelled) return;
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setDocs(list as CommercialDocument[]);
    }).catch(() => {
      if (!cancelled) setDocs([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [session.opened_at, session.warehouse?.id, session.user?.id, openedDate, today]);

  const filtered = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.trim().toLowerCase();
    return docs.filter(d =>
      d.document_number.toLowerCase().includes(q) ||
      d.party?.name?.toLowerCase().includes(q)
    );
  }, [docs, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'document_number': va = a.document_number; vb = b.document_number; break;
        case 'client':          va = a.party?.name ?? ''; vb = b.party?.name ?? ''; break;
        case 'document_date':   va = a.document_date ?? ''; vb = b.document_date ?? ''; break;
        case 'total_ttc':       va = Number(a.total_ttc ?? 0); vb = Number(b.total_ttc ?? 0); break;
        case 'paid_amount':     va = Number(a.paid_amount ?? 0); vb = Number(b.paid_amount ?? 0); break;
        case 'remaining_amount':va = Number(a.remaining_amount ?? 0); vb = Number(b.remaining_amount ?? 0); break;
        default:                va = a.document_date ?? ''; vb = b.document_date ?? '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortDir]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [sorted.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const toggleSort = useCallback((field: string) => {
    setSortDir(d => sortField === field && d === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  }, [sortField]);

  function sortIcon(field: string): string {
    if (sortField !== field) return 'ti ti-arrows-sort';
    return sortDir === 'asc' ? 'ti ti-sort-ascending' : 'ti ti-sort-descending';
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, sorted.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (sorted.length === 0) return;
      const sel = sorted[selectedIndex];
      if (!sel) return;
      e.preventDefault();
      onOpen(sel.id);
      return;
    }
    if (e.key === 'Escape') {
      onClose();
      return;
    }
  }, [sorted, selectedIndex, onOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleRowClick = useCallback((doc: CommercialDocument) => {
    onOpen(doc.id);
  }, [onOpen]);

  const handlePrintClick = useCallback((e: React.MouseEvent, doc: CommercialDocument) => {
    e.stopPropagation();
    onPrint?.(doc.id);
  }, [onPrint]);

  const totals = useMemo(() => {
    let ttc = 0, paid = 0, remaining = 0;
    for (const doc of sorted) {
      ttc       += Number(doc.total_ttc ?? 0);
      paid      += Number(doc.paid_amount ?? 0);
      remaining += Number(doc.remaining_amount ?? 0);
    }
    return { ttc, paid, remaining };
  }, [sorted]);

  /* ─── column resize ─── */
  const setColRef = useCallback((id: string) => (el: HTMLTableColElement | null) => {
    if (el) colRefs.current.set(id, el);
    else colRefs.current.delete(id);
  }, []);

  const handleResizeStart = useCallback((colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentW = colWidthsRef.current[colId] ?? COL_DEFAULTS[colId] ?? 100;
    resizeRef.current = { colId, startX: e.clientX, startW: currentW };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const { colId: id, startX, startW } = resizeRef.current;
      setColWidths(prev => ({ ...prev, [id]: Math.max(COL_MIN, startW + (ev.clientX - startX)) }));
    };

    const onUp = () => {
      saveColWidths(colWidthsRef.current);
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [saveColWidths]);

  return (
    <Modal
      open
      onClose={onClose}
      closeOnBackdrop={false}
      title={<><i className="ti ti-receipt ml-2" /> فواتير الجلسة</>}
      size="lg"
      footer={
        <>
          <span className="si-foot-hint">
            ↑↓ للتنقل · Enter للفتح · Esc للإغلاق
          </span>
          <button className="btn" onClick={() => exportCsv(sorted)}>
            <i className="ti ti-file-spreadsheet ml-1" /> تصدير CSV
          </button>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </>
      }
    >
      <div className="si-modal-body">
        <div className="si-info-bar">
          <span><i className="ti ti-user" /> {session.user?.name}</span>
          <span><i className="ti ti-building-warehouse" /> {session.warehouse?.name}</span>
          <span><i className="ti ti-calendar" /> {openedDate}</span>
          <span><i className="ti ti-clock" /> {formatDuration(session.duration)}</span>
          <span><i className="ti ti-file-invoice" /> {session.invoices_count ?? docs.length} فاتورة</span>
          <span className="si-info-total">{formatDZD(session.net_sales ?? 0)}</span>
        </div>

        <div className="si-search">
          <i className="ti ti-search" />
          <input
            ref={inputRef}
            className="si-search-input"
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <i className="ti ti-x si-search-clear" onClick={() => setSearch('')} />
          )}
        </div>

        {loading ? (
          <div className="si-empty si-empty-lg">
            <i className="ti ti-loader" />
            <div>جاري تحميل الفواتير...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="si-empty">
            <i className="ti ti-receipt-off" />
            <div>{search ? 'لا توجد نتائج للبحث' : 'لا توجد فواتير في هذه الجلسة'}</div>
          </div>
        ) : (
          <div className="si-tbl-wrap">
            <table className="tbl tbl-sm">
              <colgroup>
                {activeColIds.map(id => (
                  <col key={id} ref={setColRef(id)} style={{ width: colWidths[id] ?? COL_DEFAULTS[id] }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span>#</span>
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('num', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_number')}>
                    <i className={`${sortIcon('document_number')} si-sort-ic`} /> رقم الفاتورة
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('doc_num', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('client')}>
                    <i className={`${sortIcon('client')} si-sort-ic`} /> العميل
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('client', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_date')}>
                    <i className={`${sortIcon('document_date')} si-sort-ic`} /> التاريخ
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('date', e)} />
                  </th>
                  <th>
                    الحالة
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('status', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('total_ttc')}>
                    <i className={`${sortIcon('total_ttc')} si-sort-ic`} /> الإجمالي
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('ttc', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('paid_amount')}>
                    <i className={`${sortIcon('paid_amount')} si-sort-ic`} /> المدفوع
                    <div className="si-col-resize" onMouseDown={e => handleResizeStart('paid', e)} />
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('remaining_amount')}>
                    <i className={`${sortIcon('remaining_amount')} si-sort-ic`} /> المتبقي
                    {onPrint && <div className="si-col-resize" onMouseDown={e => handleResizeStart('remaining', e)} />}
                  </th>
                  {onPrint && (
                    <th>
                      <div className="si-col-resize" onMouseDown={e => handleResizeStart('print', e)} />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody ref={listRef}>
                {sorted.map((doc, i) => {
                  const status = getDocStatus(doc);
                  const meta = STATUS_META[status];
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleRowClick(doc)}
                      className={i === selectedIndex ? 'si-row-sel' : undefined}
                    >
                      <td>{i + 1}</td>
                      <td><strong>{doc.document_number}</strong></td>
                      <td>{doc.party?.name ?? <span className="si-null">\u2014</span>}</td>
                      <td>{doc.document_date?.slice(0, 10) ?? '\u2014'}</td>
                      <td><span className={`si-badge ${meta.cls}`}><i className={meta.icon} /> {meta.label}</span></td>
                      <td className="si-ttc-cell">{formatDZD(doc.total_ttc)}</td>
                      <td className="si-paid-cell">{formatDZD(doc.paid_amount ?? 0)}</td>
                      <td className={`si-remain-cell ${Number(doc.remaining_amount ?? 0) > 0 ? 'si-remain-pos' : 'si-remain-neg'}`}>
                        {formatDZD(doc.remaining_amount ?? 0)}
                      </td>
                      {onPrint && (
                        <td>
                          <button className="si-print-btn" onClick={e => handlePrintClick(e, doc)} title="طباعة الفاتورة">
                            <i className="ti ti-printer" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="si-foot-row">
                  <td colSpan={onPrint ? 5 : 5}>المجموع ({sorted.length})</td>
                  <td className="si-ttc-cell">{formatDZD(totals.ttc)}</td>
                  <td className="si-paid-cell">{formatDZD(totals.paid)}</td>
                  <td className={totals.remaining > 0 ? 'si-remain-pos' : 'si-remain-neg'}>{formatDZD(totals.remaining)}</td>
                  {onPrint && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
