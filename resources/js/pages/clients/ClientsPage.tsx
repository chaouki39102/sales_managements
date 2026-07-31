// resources/js/pages/clients/ClientsPage.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePartyMutations, fetchAllCustomers } from '@/lib/api/endpoints/parties';
import { useModal } from '@/hooks/useModal';
import { useERPExport } from '@/components/ui/DataTable';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import SimpleTable from '@/components/ui/SimpleTable';
import SearchInput from '@/components/ui/SearchInput';
import Skeleton from '@/components/ui/Skeleton';
import ClientModal from '@/components/modals/ClientModal';
import ImportWizardModal from '@/pages/import/ImportWizardModal';
import { PARTY_IMPORT_CONFIG } from '@/pages/import/entityConfig';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiGet } from '@/lib/api/core/client';
import type { Party } from '@/types';
import type { Column } from '@/components/ui/DataTable';
import type { PaginatedResponse, PaginationMeta } from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientsApiResponse = PaginatedResponse<Party>;

// ─── Pagination Component ──────────────────────────────────────────────────────

function ClientsPagination({
  meta,
  onPageChange,
  onPerPageChange,
}: {
  meta:            PaginationMeta;
  onPageChange:    (p: number) => void;
  onPerPageChange: (pp: number) => void;
}) {
  const { current_page, last_page, per_page, total, from, to } = meta;

  const pages: (number | '…')[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current_page > 3) pages.push('…');
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i);
    }
    if (current_page < last_page - 2) pages.push('…');
    pages.push(last_page);
  }

  const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, padding: '0 8px',
    border: `1px solid ${active ? 'var(--em)' : 'var(--bd)'}`,
    borderRadius: 6, fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? 'var(--em)' : 'var(--bg1)',
    color: active ? '#fff' : disabled ? 'var(--t4)' : 'var(--t2)',
    opacity: disabled ? 0.45 : 1,
    transition: 'background .12s, border-color .12s',
    userSelect: 'none',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, padding: '10px 16px',
      borderTop: '1px solid var(--bd)', fontSize: 13,
    }}>
      <span style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {from ?? 1}–{to ?? total} من أصل{' '}
        <strong style={{ color: 'var(--t1)' }}>{total.toLocaleString('ar-DZ')}</strong>{' '}
        زبون
      </span>

      {/* direction:ltr دائماً لأرقام الصفحات */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button style={btnStyle(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(1)} title="الصفحة الأولى">
          <i className="ti ti-chevrons-right" style={{ fontSize: 13 }} />
        </button>
        <button style={btnStyle(false, current_page === 1)} disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)} title="السابق">
          <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--t4)' }}>…</span>
          ) : (
            <button key={p} style={btnStyle(p === current_page)}
              onClick={() => p !== current_page && onPageChange(p as number)}>
              {p}
            </button>
          )
        )}

        <button style={btnStyle(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)} title="التالي">
          <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
        </button>
        <button style={btnStyle(false, current_page === last_page)} disabled={current_page === last_page}
          onClick={() => onPageChange(last_page)} title="الصفحة الأخيرة">
          <i className="ti ti-chevrons-left" style={{ fontSize: 13 }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t3)' }}>
        <span>عدد السطور:</span>
        <select value={per_page} onChange={(e) => onPerPageChange(Number(e.target.value))}
          style={{
            padding: '3px 6px', border: '1px solid var(--bd)', borderRadius: 6,
            fontSize: 13, background: 'var(--bg1)', color: 'var(--t2)',
            outline: 'none', cursor: 'pointer',
          }}>
          {[10, 25, 50, 100, 500, 1000].map((n) => <option key={n} value={n}>{n === 1000 ? 'الكل' : n}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Export Column Definitions ─────────────────────────────────────────────────

const CLIENTS_EXPORT_COLS: Column<Party>[] = [
  // ── معلومات أساسية ──
  { key: 'name',             header: 'الزبون',          exportHeader: 'الزبون',              accessor: (r) => r.name },
  { key: 'commercial_name',  header: 'الاسم التجاري',   exportHeader: 'الاسم التجاري',       accessor: (r) => r.commercial_name },
  { key: 'code',             header: 'الرمز',            exportHeader: 'رمز الزبون',          accessor: (r) => r.code },
  { key: 'phone',            header: 'الهاتف',           exportHeader: 'الهاتف',              accessor: (r) => r.phone },
  { key: 'mobile',           header: 'الجوال',           exportHeader: 'الجوال',              accessor: (r) => r.mobile },
  { key: 'fax',              header: 'الفاكس',           exportHeader: 'الفاكس',              accessor: (r) => r.fax },
  { key: 'email',            header: 'البريد',           exportHeader: 'البريد الإلكتروني',    accessor: (r) => r.email },
  // ── الموقع ──
  { key: 'wilaya',           header: 'الولاية',          exportHeader: 'الولاية',             accessor: (r) => r.wilaya?.name },
  { key: 'commune',          header: 'البلدية',          exportHeader: 'البلدية',             accessor: (r) => r.commune?.name },
  { key: 'address',          header: 'العنوان',          exportHeader: 'العنوان',             accessor: (r) => r.address },
  // ── وثائق قانونية ──
  { key: 'legal_form',       header: 'الشكل القانوني',   exportHeader: 'الشكل القانوني',      accessor: (r) => r.legal_form?.name },
  { key: 'activity',         header: 'النشاط',           exportHeader: 'النشاط',              accessor: (r) => r.activity },
  { key: 'nif',              header: 'NIF',               exportHeader: 'NIF',                 accessor: (r) => r.nif },
  { key: 'nis',              header: 'NIS',               exportHeader: 'NIS',                 accessor: (r) => r.nis },
  { key: 'rc',               header: 'RC',                exportHeader: 'السجل التجاري',       accessor: (r) => r.rc },
  { key: 'ai',               header: 'AI',                exportHeader: 'المادة الجبائية',     accessor: (r) => r.ai },
  { key: 'capital_amount',   header: 'رأس المال',         exportHeader: 'رأس المال (دج)',      accessor: (r) => r.capital_amount },
  { key: 'rc_date',          header: 'تاريخ السجل',       exportHeader: 'تاريخ السجل التجاري', accessor: (r) => r.rc_date },
  // ── مالية ──
  { key: 'balance',          header: 'الرصيد',            exportHeader: 'الرصيد الحالي',       accessor: (r) => r.balance,          aggregate: 'sum' as const },
  { key: 'credit_limit',     header: 'الحد الائتماني',    exportHeader: 'الحد الائتماني',      accessor: (r) => r.credit_limit,     aggregate: 'sum' as const },
  { key: 'credit_days',      header: 'أجل الدفع',         exportHeader: 'أجل الدفع (يوم)',     accessor: (r) => r.credit_days },
  { key: 'bank_name',        header: 'البنك',             exportHeader: 'اسم البنك',           accessor: (r) => r.bank_name },
  { key: 'rib',              header: 'RIB',               exportHeader: 'RIB',                 accessor: (r) => r.rib },
  // ── حالة ──
  { key: 'active',           header: 'الحالة',            exportHeader: 'الحالة',              accessor: (r) => r.active ? 'نشط' : 'موقوف' },
  { key: 'created_at',       header: 'تاريخ الإنشاء',     exportHeader: 'تاريخ الإنشاء',       accessor: (r) => r.created_at },
];

// ─── Table Column Definitions ──────────────────────────────────────────────────

interface TableCol {
  key: string;
  label: string;
  thStyle?: React.CSSProperties;
  tdStyle?: React.CSSProperties;
  render: (row: Party, idx: number, rowNum: number) => React.ReactNode;
  always?: boolean;
  sortable?: boolean;
  sortField?: string;
}

// ─── Types & Helpers ──────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive';
const AVATAR_COLORS = [1, 2, 3, 4, 5, 6, 7] as const;

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ─── دالة الجلب — مبنية خارج المكوّن لتجنب إعادة الإنشاء ──────────────────

function fetchClients(params: {
  search:      string;
  activeParam: number | undefined;
  page:        number;
  perPage:     number;
  sortField?:  string;
  sortDir?:    string;
}) {
  return apiGet<ClientsApiResponse>('/customers', {
    per_page: params.perPage,
    page:     params.page,
    include:  'wilaya,commune,legalForm,defaultPriceLevel',
    sort_by:  params.sortField ?? 'name',
    sort_dir: params.sortDir ?? 'asc',
    ...(params.search ? { search: params.search } : {}),
    ...(params.activeParam !== undefined ? { active: params.activeParam } : {}),
  });
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { exportData } = useERPExport({ defaultFileName: 'الزبائن', defaultCurrency: 'DZD' });
  const [hiddenCols, setHiddenCols]       = useState<Set<string>>(new Set(['mobile', 'email', 'address', 'nis', 'rc', 'ai', 'legal_form', 'activity', 'capital_amount', 'rc_date', 'bank_name', 'rib', 'commercial_name', 'fax', 'code']));
  const [colMenuOpen, setColMenuOpen]     = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    }
    if (colMenuOpen) { document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick); }
  }, [colMenuOpen]);

  const toggleCol = (key: string) => setHiddenCols(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const [_sortField, _setSortField] = useState('name');
  const [_sortDir, _setSortDir]     = useState<'asc' | 'desc'>('asc');
  const buildTableCols = (hidden: Set<string>): TableCol[] => [
    // ── المجموعة 1: معلومات أساسية ──
    { key: '#', label: '#', thStyle: { width: 48, color: 'var(--t4)' }, tdStyle: { color: 'var(--t4)', fontSize: 12 },
      render: (_: any, __: any, rowNum: any) => rowNum },
    { key: 'name', label: 'الزبون', thStyle: { cursor: 'pointer' }, sortable: true,
      render: (c: any, idx: any) => {
        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length] as 1|2|3|4|5|6|7;
        return (
          <div className="flex items-center gap-8">
            <Avatar initials={c.name?.[0]?.toUpperCase() || '؟'} color={avatarColor} size={32} />
            <div>
              <div className="s font-semibold">{c.name || 'بدون اسم'}</div>
              {c.commercial_name && (
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{c.commercial_name}</div>
              )}
            </div>
          </div>
        );
      }},
    { key: 'commercial_name', label: 'الاسم التجاري',
      render: (c: any) => c.commercial_name || '—' },
    { key: 'code', label: 'الرمز', tdStyle: { fontSize: 12, fontFamily: 'monospace' },
      render: (c: any) => c.code || '—' },
    { key: 'phone', label: 'الهاتف', tdStyle: { fontSize: 14 },
      render: (c: any) => c.phone || '—' },
    { key: 'mobile', label: 'الجوال', tdStyle: { fontSize: 14 },
      render: (c: any) => c.mobile || '—' },
    { key: 'fax', label: 'الفاكس',
      render: (c: any) => c.fax || '—' },
    { key: 'email', label: 'البريد',
      render: (c: any) => c.email || '—' },

    // ── المجموعة 2: الموقع ──
    { key: 'location', label: 'الولاية / البلدية', tdStyle: { fontSize: 13, color: 'var(--t4)' },
      render: (c: any) => [c.wilaya?.name, c.commune?.name].filter(Boolean).join(' / ') || '—' },
    { key: 'address', label: 'العنوان', tdStyle: { fontSize: 13, color: 'var(--t4)' },
      render: (c: any) => c.address || '—' },

    // ── المجموعة 3: وثائق قانونية ──
    { key: 'legal_form', label: 'الشكل القانوني',
      render: (c: any) => c.legal_form?.name || '—' },
    { key: 'activity', label: 'النشاط', tdStyle: { fontSize: 13, color: 'var(--t4)' },
      render: (c: any) => c.activity || '—' },
    { key: 'nif', label: 'NIF', tdStyle: { fontSize: 12, fontFamily: 'monospace' },
      render: (c: any) => c.nif || '—' },
    { key: 'nis', label: 'NIS', tdStyle: { fontSize: 12, fontFamily: 'monospace' },
      render: (c: any) => c.nis || '—' },
    { key: 'rc', label: 'RC', tdStyle: { fontSize: 12, fontFamily: 'monospace' },
      render: (c: any) => c.rc || '—' },
    { key: 'ai', label: 'AI', tdStyle: { fontSize: 12, fontFamily: 'monospace' },
      render: (c: any) => c.ai || '—' },
    { key: 'capital_amount', label: 'رأس المال', thStyle: { textAlign: 'end' as const }, tdStyle: { textAlign: 'end' as const },
      render: (c: any) => c.capital_amount ? (
        <><span>{(+c.capital_amount).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span><span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 3 }}>دج</span></>
      ) : <span style={{ color: 'var(--t4)' }}>—</span> },
    { key: 'rc_date', label: 'تاريخ السجل', tdStyle: { fontSize: 12 },
      render: (c: any) => c.rc_date || '—' },

    // ── المجموعة 4: مالية ──
    { key: 'balance', label: 'الرصيد', thStyle: { textAlign: 'end' as const }, tdStyle: { textAlign: 'end' as const },
      render: (c: any) => {
        const hasDebt = (c.balance ?? 0) > 0;
        return (
          <>
            <span style={{ color: hasDebt ? 'var(--red)' : 'var(--t3)', fontWeight: hasDebt ? 600 : 400 }}>
              {(c.balance ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 3 }}>دج</span>
          </>
        );
      }},
    { key: 'credit_limit', label: 'الحد الائتماني', thStyle: { textAlign: 'end' as const }, tdStyle: { textAlign: 'end' as const },
      render: (c: any) => c.credit_limit ? (
        <><span>{(+c.credit_limit).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span><span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 3 }}>دج</span></>
      ) : <span style={{ color: 'var(--t4)' }}>—</span> },
    { key: 'credit_days', label: 'أجل الدفع', thStyle: { textAlign: 'end' as const }, tdStyle: { textAlign: 'end' as const },
      render: (c: any) => c.credit_days ? <>{c.credit_days} يوم</> : <span style={{ color: 'var(--t4)' }}>—</span> },
    { key: 'bank_name', label: 'البنك',
      render: (c: any) => c.bank_name || '—' },
    { key: 'rib', label: 'RIB', tdStyle: { fontSize: 11, fontFamily: 'monospace', direction: 'ltr' as const, textAlign: 'left' as const },
      render: (c: any) => c.rib || '—' },

    // ── المجموعة 5: حالة ──
    { key: 'active', label: 'الحالة',
      render: (c: any) => <Badge variant={c.active ? 'success' : 'danger'}>{c.active ? 'نشط' : 'موقوف'}</Badge> },
    { key: 'created_at', label: 'تاريخ الإضافة', tdStyle: { fontSize: 12, color: 'var(--t4)' },
      render: (c: any) => c.created_at ? new Date(c.created_at).toLocaleDateString('ar-DZ') : '—' },

    // ── الإجراءات ──
    { key: 'actions', label: '', thStyle: { width: 48 }, always: true,
      render: (c: any) => <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(c)} /> },
  ].filter(col => col.always || !hidden.has(col.key));

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing]           = useState<Party | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [perPage, setPerPage]           = useState(25);

  const modal       = useModal();
  const importModal = useModal();
  const slug        = useActiveSlug();

  const activeParam: number | undefined =
    statusFilter === 'active' ? 1 : statusFilter === 'inactive' ? 0 : undefined;

  // ✅ الإصلاح الثاني: queryKey يحوي جميع القيم الفردية — React Query يُعيد
  //    الجلب تلقائياً عند تغيير أي منها، بدون الحاجة لـ object كـ dependency
  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<ClientsApiResponse>({
    queryKey: ['clients', slug, search, activeParam, currentPage, perPage, _sortField, _sortDir],
    // ✅ الإصلاح الثالث: params تُبنى داخل queryFn — تضمن دائماً استخدام
    //    القيم الحالية وقت التنفيذ لا وقت بناء الـ object خارجها
    queryFn: () => fetchClients({ search, activeParam, page: currentPage, perPage, sortField: _sortField, sortDir: _sortDir }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000,
    enabled: !!slug,
  });

  const clients: Party[]            = response?.data ?? [];
  const meta: PaginationMeta | null = response?.meta ?? null;

  // KPI من الصفحة الحالية فقط (إجماليات حقيقية تحتاج /customers/stats)
  const withDebt      = clients.filter((c) => (c.balance ?? 0) > 0).length;
  const totalDebt     = clients.reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalBusiness = clients.reduce((s, c) => s + (c.total_purchases ?? 0), 0);
  const activeCount   = clients.filter((c) => c.active).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp);
    setCurrentPage(1);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); modal.openModal(); };
  const openEdit   = (c: Party) => { setEditing(c); modal.openModal(); };

  const { create: createMut, update: updateMut } = usePartyMutations();
  const isSubmitting = createMut.isPending || updateMut.isPending;

  const handleSubmit = async (formData: any) => {
    if (!editing && !formData.slug) formData.slug = generateSlug(formData.name);
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data: formData });
      else         await createMut.mutateAsync(formData);
      await refetch();
    } catch (err: any) {
      console.error('Submit error:', err);
      throw err;
    }
  };

  const filterBtnStyle = (val: StatusFilter): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 13,
    fontWeight: statusFilter === val ? 600 : 400,
    border: `1px solid ${statusFilter === val ? 'var(--em)' : 'var(--bd)'}`,
    borderRadius: 6,
    background: statusFilter === val ? 'var(--emb)' : 'var(--bg1)',
    color: statusFilter === val ? 'var(--em)' : 'var(--t2)',
    cursor: 'pointer', transition: 'all .12s', userSelect: 'none',
  });

  return (
    <div className="page on" id="p-clients">

      <PageHeader
        title="الزبائن"
        subtitle={
          isLoading
            ? 'جاري التحميل...'
            : `إدارة قاعدة الزبائن — ${(meta?.total ?? clients.length).toLocaleString('ar-DZ')} زبون`
        }
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-table-import" />} onClick={importModal.openModal}>
              استيراد
            </Button>
            <Button size="sm" icon={<i className="ti ti-table-export" />}
              onClick={async () => {
                const exportDataArr = await fetchAllCustomers(search, activeParam as any);
                if (exportDataArr.length) await exportData(exportDataArr as any, CLIENTS_EXPORT_COLS as any);
              }}>
              تصدير
            </Button>
            <div ref={colMenuRef} style={{ position: 'relative' }}>
              <Button size="sm" icon={<i className="ti ti-columns" />}
                onClick={() => setColMenuOpen(v => !v)}>
                الأعمدة
              </Button>
              {colMenuOpen && (
                <div style={{
                  position: 'absolute', left: 0, top: '100%', zIndex: 500, minWidth: 240,
                  background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
                  padding: 6, marginTop: 4, maxHeight: 400, overflowY: 'auto',
                }}>
                  {(() => {
                    const allCols = buildTableCols(new Set()).filter(c => !c.always);
                    const groups: { label: string; keys: string[] }[] = [
                      { label: 'معلومات أساسية',   keys: ['commercial_name','code','phone','mobile','fax','email'] },
                      { label: 'الموقع',            keys: ['location','address'] },
                      { label: 'وثائق قانونية',     keys: ['legal_form','activity','nif','nis','rc','ai','capital_amount','rc_date'] },
                      { label: 'مالية',             keys: ['balance','credit_limit','credit_days','bank_name','rib'] },
                      { label: 'حالة',              keys: ['active','created_at'] },
                    ];
                    const colMap = new Map(allCols.map(c => [c.key, c]));
                    return groups.map((g, gi) => (
                      <div key={g.label}>
                        <div style={{
                          padding: '6px 10px 3px', fontSize: 11, fontWeight: 700,
                          color: 'var(--t4)', letterSpacing: '.5px', marginTop: gi ? 4 : 0,
                        }}>
                          {g.label}
                        </div>
                        {g.keys.map(key => {
                          const col = colMap.get(key);
                          if (!col) return null;
                          return (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13, borderRadius: 6, transition: 'background .1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                              <input type="checkbox" checked={!hiddenCols.has(key)}
                                onChange={() => toggleCol(key)}
                                style={{ accentColor: 'var(--em)' }} />
                              {col.label}
                            </label>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
            <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus" />} onClick={openCreate}>
              زبون جديد
            </Button>
          </>
        }
      />

      {/* ── KPI ─────────────────────────────────────────────────────────────── */}
      <div className="kpis mb-20">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi ke"><Skeleton variant="kpi" /></div>
          ))
        ) : (
          <>
            <KpiCard variant="green" icon="ti-users" label="إجمالي الزبائن"
              value={(meta?.total ?? clients.length).toLocaleString('ar-DZ')} />
            <KpiCard variant="blue" icon="ti-trending-up" label="مشتريات الصفحة"
              value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
            <KpiCard variant="red" icon="ti-receipt" label="ديون الصفحة"
              value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
              sub={`${withDebt} زبون متأخر`} />
            <KpiCard variant="gold" icon="ti-star" label="نشطون في الصفحة"
              value={activeCount.toLocaleString('ar-DZ')} />
          </>
        )}
      </div>

      {/* ── الفلاتر ──────────────────────────────────────────────────────────── */}
      <div className="filters mb-16" style={{ gap: 10 }}>
        <SearchInput
          value={search}
          onSearch={handleSearch}
          onChange={handleSearch}
          placeholder="ابحث بالاسم، الهاتف، NIF..."
          loading={isFetching && !!search}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((val) => (
            <button key={val} style={filterBtnStyle(val)} onClick={() => handleStatusFilter(val)}>
              {val === 'all' ? 'الكل' : val === 'active' ? 'نشط' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* ── المحتوى ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <Card noHeader className="p-0">
          <div style={{ padding: 16 }}><Skeleton variant="table" rows={8} /></div>
        </Card>
      ) : clients.length === 0 ? (
        <EmptyState
          icon="ti-users"
          text={search ? 'لا توجد نتائج مطابقة' : 'لا يوجد زبائن'}
          sub={
            search ? `لا يوجد زبائن يطابقون "${search}"`
            : statusFilter !== 'all' ? 'جرّب تغيير فلتر الحالة'
            : 'أضف زبونك الأول'
          }
          action={
            search
              ? <Button onClick={() => handleSearch('')}>مسح البحث</Button>
              : <Button variant="primary" onClick={openCreate}>زبون جديد</Button>
          }
        />
      ) : (
        <Card noHeader className="p-0">
          <SimpleTable
            columns={buildTableCols(hiddenCols).map(col => ({
              key: col.key,
              label: col.label + (col.sortable && _sortField === (col.sortField ?? col.key) ? (_sortDir === 'asc' ? ' ↑' : ' ↓') : ''),
              render: (_v: unknown, row: Record<string, unknown>) => {
                const c = row as unknown as Party;
                const idx = clients.indexOf(c);
                const rowNum = (currentPage - 1) * perPage + idx + 1;
                return col.render(c, idx, rowNum);
              },
            }))}
            data={clients as unknown as Record<string, unknown>[]}
            rowKey="id"
          />

          {meta && (
            <ClientsPagination
              meta={meta}
              onPageChange={setCurrentPage}
              onPerPageChange={handlePerPageChange}
            />
          )}
        </Card>
      )}

      <ClientModal
        open={modal.open}
        party={editing}
        onClose={modal.closeModal}
        onSaved={() => refetch()}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ImportWizardModal
        open={importModal.open}
        onClose={importModal.closeModal}
        config={PARTY_IMPORT_CONFIG}
      />
    </div>
  );
}
