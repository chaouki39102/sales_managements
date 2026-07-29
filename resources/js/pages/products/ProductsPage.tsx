// resources/js/pages/products/ProductsPage.tsx
import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useERPExport } from '@/components/ui/DataTable';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import Switch from '@/components/ui/Switch';
import ProgressBar from '@/components/ui/ProgressBar';
const ProductModal = React.lazy(() => import('@/components/products/ProductModal'));
const ImportWizardModal = React.lazy(() => import('@/pages/import/ImportWizardModal'));
const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));
import { PRODUCT_IMPORT_CONFIG } from '@/pages/import/entityConfig';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { productsApi } from '@/lib/api/endpoints/products';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useProductAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';
import type { Column } from '@/components/ui/DataTable';
import type { Product, PaginatedResponse } from '@/lib/api/core/types';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import CopyConfigModal from '@/components/products/CopyConfigModal';
import { usePrintTemplatesList } from '@/pages/settings/print-settings/runtime';
import { mapCompany } from '@/pages/settings/print-settings/runtime';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TableCol {
  key: string;
  label: string;
  thStyle?: React.CSSProperties;
  tdStyle?: React.CSSProperties;
  render: (row: Product, idx: number) => React.ReactNode;
  always?: boolean;
  sortable?: boolean;
  sortField?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' دج';

function getMinPrice(product: Product): number {
  const fixedPrices = (product.prices ?? [])
    .filter(p => p.active && p.pricing_method === 'fixed' && p.price !== null && p.price! > 0)
    .map(p => p.price!);
  return fixedPrices.length ? Math.min(...fixedPrices) : 0;
}

const StockBadge = ({ qty, min = 0 }: { qty: number; min?: number }) => {
  if (qty <= 0)         return <span className="bx br no-dot" style={{ fontSize: 10 }}>نفذ</span>;
  if (min > 0 && qty <= min) return <span className="bx bg no-dot" style={{ fontSize: 10 }}>منخفض</span>;
  return <span className="bx be no-dot" style={{ fontSize: 10 }}>متوفر</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const qc = useQueryClient();
  const slug = useActiveSlug() ?? '';

  const { exportData } = useERPExport({ defaultFileName: 'المنتجات', defaultCurrency: 'DZD' });
  const [hiddenCols, setHiddenCols]       = useState<Set<string>>(new Set(['barcode', 'description', 'has_lots', 'has_expiration', 'min_stock_alert', 'created_at']));
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

  // Search & Filters
  const [search, setSearch]           = useState('');
  const debouncedSearch               = useDebounce(search, 350);
  const [page, setPage]               = useState(1);
  const [perPage]                     = useState(15);
  const [familyFilter, setFamilyFilter] = useState('');
  const [brandFilter, setBrandFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sortField, setSortField]     = useState('created_at');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const modal       = useModal();
  const deleteModal = useModal();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId]         = useState<number | null>(null);

  const deleteConfirm = useConfirm();
  const notify = useNotification();
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  // ── Label / Sticker Print ──
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const activeCompany = useActiveCompany();
  const companyInfo = useMemo(() => mapCompany(activeCompany as any), [activeCompany]);
  const { data: stickerTemplates = [] } = usePrintTemplatesList('STK');

  // Fallback template when no STK template exists in the database
  const stickerTemplate = useMemo((): PrintTemplate | null => {
    if (stickerTemplates.length > 0) return null; // use templates list selection
    return {
      id: null,
      doc_type_code: 'STK',
      paper_size: '400x200mm',
      paper_width_mm: 400,
      page_orientation: 'portrait',
      name: 'ملصق المنتج',
      is_default: false, is_active: true,
      margin_top: 6, margin_bottom: 6, margin_sides: 8,
      base_font_size: 12, font_family: 'tajawal', line_spacing: 1.2,
      show_header_section: true, show_doc_info_section: false, show_items_section: false,
      show_totals_section: false, show_payments_section: false, show_footer_section: false,
      show_logo: true, logo_source: 'company', logo_size: 50, logo_align: 'center', logo_border_radius: 0,
      show_company_name: true, company_name_text: '', company_name_size: 13, company_name_bold: true, company_name_color: '#1a1a2e', company_name_align: 'center',
      header_separator: 'dashed',
      show_label_barcode: true, label_barcode_height: 45,
      show_label_product_name: true, label_product_name_size: 16, label_product_name_bold: true, label_product_name_color: '#111',
      show_label_ref: true, label_ref_size: 9, label_ref_color: '#666',
      show_label_price: true, label_price_size: 28, label_price_bold: true, label_price_color: '#c0392b', label_price_text: 'د.ج', label_price_prefix: '',
      label_border_style: 'solid', label_border_width: 1, label_border_color: '#333', label_border_radius: 6,
      show_payment_details: false, payment_font_size: 9, payments_align: 'right',
      rules: [],
      sections_order: [],
      page_frame: { enabled: false },
      watermark: { enabled: false },
    } as unknown as PrintTemplate;
  }, [stickerTemplates]);

  // ── Lookups — single aggregated request (7 HTTP → 1) ──
  const { data: productLookups } = useProductAggregatedLookups();
  const families = productLookups?.families ?? [];
  const brands   = productLookups?.brands ?? [];

  // ── Products Query ──
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: tenantKeys.products.list(slug, { search: debouncedSearch, family_id: familyFilter, brand_id: brandFilter, active: activeFilter, page, per_page: perPage, sort: sortField, sortDir }),
    queryFn: () => {
      const params: Record<string, any> = {
        sort: sortDir === 'desc' ? `-${sortField}` : sortField,
        per_page: perPage,
        page,
        include: 'family,brand,productType,prices,packagings',
      };
      if (debouncedSearch) params['filter[search]'] = debouncedSearch;
      if (familyFilter)    params['filter[family_id]'] = familyFilter;
      if (brandFilter)     params['filter[brand_id]']  = brandFilter;
      if (activeFilter)    params['filter[active]']     = activeFilter;
      return apiGet<PaginatedResponse<Product>>('/products', params);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: !!slug,
  });

  const products: Product[] = response?.data ?? [];
  const meta = response?.meta ?? { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };

  // ── Stats (computed from server total + current page data) ──
  const stats = {
    totalProducts:  meta.total,
    activeProducts: products.filter(p => p.active).length,
    lowStock:       products.filter(p => p.manages_stock && p.is_low_stock).length,
    totalStock:     products.reduce((s, p) => s + (p.current_stock ?? 0), 0),
    highestPrice:   Math.max(...products.map(p => getMinPrice(p)), 0),
    withPrices:     products.filter(p => (p.prices ?? []).some(x => x.active)).length,
  };

  // ── Mutations (using shared API layer for correct invalidation) ──
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      notify.success('تم حذف المنتج بنجاح');
      deleteModal.closeModal();
      setDeletingId(null);
    },
    onError: (err: any) => {
      notify.error(err?.response?.data?.message ?? 'فشل الحذف — قد يكون للمنتج حركات مخزون أو مستندات مرتبطة');
      deleteModal.closeModal();
      setDeletingId(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      productsApi.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) }),
    onError: () => notify.error('فشل تغيير الحالة'),
  });

  // ── Handlers ──
  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const clearFilters = () => { setSearch(''); setFamilyFilter(''); setBrandFilter(''); setActiveFilter(''); setPage(1); };
  const hasFilters = debouncedSearch || familyFilter || brandFilter || activeFilter;

  const openAdd  = () => { setEditingProduct(null); modal.openModal(); };
  const openEdit = (p: Product) => { setEditingProduct(p); modal.openModal(); };

  const importModal = useModal();

  const getFamilyName = (id: number | null) => families.find(f => f.id === id)?.name ?? '—';
  const getBrandName  = (id: number | null) => brands.find(b => b.id === id)?.name  ?? '—';

  const getExportCols = (): Column<Product>[] => [
    { key: 'name',              header: 'المنتج',            exportHeader: 'المنتج',             accessor: (r) => r.name },
    { key: 'ref',               header: 'المرجع',            exportHeader: 'المرجع',             accessor: (r) => r.ref },
    { key: 'barcode',           header: 'الباركود',          exportHeader: 'الباركود',           accessor: (r) => r.barcode },
    { key: 'family',            header: 'الفئة',             exportHeader: 'الفئة',              accessor: (r) => getFamilyName(r.family_id) },
    { key: 'brand',             header: 'العلامة',            exportHeader: 'العلامة التجارية',    accessor: (r) => getBrandName(r.brand_id) },
    { key: 'purchase_price',    header: 'سعر الشراء',         exportHeader: 'سعر الشراء (دج)',     accessor: (r) => r.purchase_price_ht,  aggregate: 'sum' as const },
    { key: 'sell_price',        header: 'سعر البيع',          exportHeader: 'سعر البيع (دج)',      accessor: (r) => getMinPrice(r),       aggregate: 'avg' as const },
    { key: 'current_stock',     header: 'المخزون',            exportHeader: 'المخزون الحالي',      accessor: (r) => r.current_stock ?? 0, aggregate: 'sum' as const },
    { key: 'manages_stock',     header: 'يدير المخزون',       exportHeader: 'يدير المخزون',        accessor: (r) => r.manages_stock ? 'نعم' : 'لا' },
    { key: 'min_stock_alert',   header: 'الحد الأدنى',        exportHeader: 'الحد الأدنى للمخزون', accessor: (r) => r.min_stock_alert },
    { key: 'has_lots',          header: 'دفعات',              exportHeader: 'دفعات',              accessor: (r) => r.has_lots ? 'نعم' : 'لا' },
    { key: 'has_expiration',    header: 'صلاحية',             exportHeader: 'تاريخ صلاحية',        accessor: (r) => r.has_expiration_date ? 'نعم' : 'لا' },
    { key: 'active',            header: 'الحالة',             exportHeader: 'الحالة',             accessor: (r) => r.active ? 'نشط' : 'غير نشط' },
    { key: 'description',       header: 'الوصف',              exportHeader: 'الوصف',              accessor: (r) => r.description },
    { key: 'created_at',        header: 'تاريخ الإنشاء',      exportHeader: 'تاريخ الإنشاء',       accessor: (r) => r.created_at },
  ];

  const buildTableCols = (hidden: Set<string>): TableCol[] => [
    { key: 'checkbox', label: '', thStyle: { width: 40, textAlign: 'center' as const }, always: true,
      render: (prod) => (
        <input type="checkbox" checked={selectedIds.includes(prod.id)}
          onChange={() => setSelectedIds(prev =>
            selectedIds.includes(prod.id) ? prev.filter(id => id !== prod.id) : [...prev, prod.id]
          )}
          onClick={e => e.stopPropagation()} />
      )},
    { key: 'name', label: 'المنتج', thStyle: { cursor: 'pointer', minWidth: 180 }, tdStyle: { minWidth: 180 }, sortable: true,
      render: (prod) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: prod.active ? 'var(--emb)' : 'var(--bg3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-package" style={{ fontSize: 16, color: prod.active ? 'var(--em)' : 'var(--t4)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{prod.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              {prod.ref && (
                <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace', background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>
                  {prod.ref}
                </span>
              )}
              {prod.manages_stock && (
                <span style={{ fontSize: 10, color: 'var(--t4)' }}><i className="ti ti-building-warehouse" style={{ fontSize: 10 }} /> مخزون</span>
              )}
              {prod.is_subsidized && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--emb)', color: 'var(--em)', fontWeight: 600 }}>مدعم</span>
              )}
              {prod.has_lots && (
                <span style={{ fontSize: 10, color: 'var(--t4)' }}><i className="ti ti-layers" style={{ fontSize: 10 }} /> دفعات</span>
              )}
            </div>
          </div>
        </div>
      )},
    { key: 'family_brand', label: 'الفئة / العلامة',
      render: (prod) => (
        <div style={{ fontSize: 12 }}>{getFamilyName(prod.family_id)}</div>
      )},
    { key: 'purchase_price', label: 'سعر الشراء', thStyle: { textAlign: 'right' as const, cursor: 'pointer' }, tdStyle: { textAlign: 'right' as const }, sortable: true, sortField: 'purchase_price_ht',
      render: (prod) => (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
          {prod.purchase_price_ht > 0 ? formatDZD(prod.purchase_price_ht) : '—'}
        </div>
      )},
    { key: 'sell_price', label: 'سعر البيع', thStyle: { textAlign: 'right' as const }, tdStyle: { textAlign: 'right' as const },
      render: (prod) => <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)' }}>{(getMinPrice(prod) > 0 ? formatDZD(getMinPrice(prod)) : '—')}</div> },
    { key: 'stock', label: 'المخزون', thStyle: { textAlign: 'center' as const }, tdStyle: { textAlign: 'center' as const },
      render: (prod) => {
        const stockQty = prod.current_stock ?? 0;
        const minAlert = prod.min_stock_alert ?? 0;
        const stockPct = minAlert > 0 ? Math.min(100, (stockQty / (minAlert * 2)) * 100) : stockQty > 0 ? 100 : 0;
        return prod.manages_stock ? (
          <div style={{ minWidth: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <ProgressBar value={stockPct} height={4} />
              <span style={{ fontSize: 11, minWidth: 28, fontWeight: 600 }}>{stockQty}</span>
            </div>
            <StockBadge qty={stockQty} min={minAlert} />
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>غير محدد</span>
        );
      }},
    { key: 'active', label: 'الحالة', thStyle: { textAlign: 'center' as const }, tdStyle: { textAlign: 'center' as const },
      render: (prod) => (
        <span onClick={e => e.stopPropagation()}>
          <Switch checked={prod.active} onChange={val => toggleActiveMutation.mutate({ id: prod.id, active: val })} />
        </span>
      )},
    { key: 'actions', label: 'إجراءات', thStyle: { textAlign: 'center' as const, width: 100 }, tdStyle: { textAlign: 'center' as const }, always: true,
      render: (prod) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(prod)} title="تعديل" />
          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(prod.id)} title="حذف" />
        </div>
      )},
  ].filter(col => col.always || !hidden.has(col.key));

  // ── Bulk ──
  const bulkToggle = async (active: boolean) => {
    await Promise.all(selectedIds.map(id => toggleActiveMutation.mutateAsync({ id, active })));
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    notify.success(`تم ${active ? 'تفعيل' : 'تعطيل'} ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  const bulkDelete = async () => {
    if (!await deleteConfirm.confirm(`حذف ${selectedIds.length} منتج؟`)) return;
    await Promise.all(selectedIds.map(id => productsApi.delete(id)));
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    notify.success(`تم حذف ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  const bulkCopyConfig = async (source: any, opts: { copy_packaging: boolean; copy_discounts: boolean; replace_packaging: boolean; replace_discounts: boolean }) => {
    await apiPost('/products/copy-config', {
      source_product_id:   source.id,
      target_product_ids:  selectedIds,
      copy_packaging:      opts.copy_packaging,
      copy_discounts:      opts.copy_discounts,
      replace_packaging:   opts.replace_packaging,
      replace_discounts:   opts.replace_discounts,
    });
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    notify.success(`تم نسخ التكوين إلى ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  // ── Label Print Data Builder ──
  const labelPrintData = useMemo((): UniversalDocumentData | null => {
    if (!companyInfo) return null;
    const targets = selectedIds.length > 0 ? products.filter(p => selectedIds.includes(p.id)) : products;
    if (targets.length === 0) return null;
    return {
      doc: { number: '—', date: new Date().toISOString().slice(0, 10), typeCode: 'STK', status: 'validated' },
      company: companyInfo as any,
      lines: targets.map((p, i) => ({
        rowNumber: i + 1,
        name: p.name,
        ref: p.ref ?? null,
        barcode: p.barcode ?? null,
        quantity: 1,
        unitPriceHt: p.prices?.find(pr => pr.active && pr.pricing_method === 'fixed')?.price ?? 0,
        unitPriceTtc: p.prices?.find(pr => pr.active && pr.pricing_method === 'fixed')?.price ?? 0,
        tvaRate: 0, tvaPct: 0, discountPct: 0, discountAmt: 0,
        totalHt: 0, totalTva: 0, totalTtc: 0,
        unit: null,
        lot: null, notes: null,
      })),
      totals: { totalHt: 0, totalTva: 0, totalTtc: 0, fiscalStamp: 0, totalDiscount: 0, paid: 0, change: 0, remaining: 0, netToPay: 0 },
      taxBreakdown: [], payments: [], computed: {},
    };
  }, [companyInfo, products, selectedIds]);

  // ── Render ──
  return (
    <div className="page on" id="p-products">
      <PageHeader
        title="المنتجات"
        subtitle={`إدارة المنتجات — ${meta.total} منتج`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" icon={<i className="ti ti-table-import" />} onClick={importModal.openModal}>
              استيراد
            </Button>
            <Button size="sm" icon={<i className="ti ti-printer" />}
              onClick={() => setLabelPrintOpen(true)}
              disabled={products.length === 0}>
              طباعة الليبل
            </Button>
            <Button size="sm" icon={<i className="ti ti-table-export" />}
              onClick={async () => { if (products.length) await exportData(products as any, getExportCols() as any); }}>
              تصدير
            </Button>
            <div ref={colMenuRef} style={{ position: 'relative' }}>
              <Button size="sm" icon={<i className="ti ti-columns" />}
                onClick={() => setColMenuOpen(v => !v)}>
                الأعمدة
              </Button>
              {colMenuOpen && (
                <div style={{
                  position: 'absolute', left: 0, top: '100%', zIndex: 500, minWidth: 200,
                  background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
                  padding: 8, marginTop: 4,
                }}>
                  {buildTableCols(new Set()).filter(c => !c.always).map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderRadius: 6, transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      <input type="checkbox" checked={!hiddenCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        style={{ accentColor: 'var(--em)' }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
              منتج جديد
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-package"        label="إجمالي المنتجات"  value={stats.totalProducts} />
        <KpiCard variant="blue"   icon="ti-check"          label="نشطة (بالصفحة)"   value={stats.activeProducts} />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخزون منخفض"      value={stats.lowStock} />
        <KpiCard variant="teal"   icon="ti-box"            label="مخزون (بالصفحة)"  value={stats.totalStock} suffix=" وحدة" />
        <KpiCard variant="purple" icon="ti-tag"            label="لها أسعار"         value={stats.withPrices} />
        <KpiCard variant="indigo" icon="ti-trending-up"    label="أعلى سعر"         value={formatDZD(stats.highestPrice)} />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--emb)', borderRadius: 'var(--r2)',
          border: '1px solid var(--em)', marginBottom: 16,
        }}>
          <span style={{ fontWeight: 700 }}>
            <i className="ti ti-checkbox" style={{ color: 'var(--em)', marginLeft: 8 }} />
            تم تحديد {selectedIds.length} منتج
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="xs" icon={<i className="ti ti-copy" />} onClick={() => setCopyModalOpen(true)}>نسخ التكوين</Button>
            <Button size="xs" icon={<i className="ti ti-check" />} onClick={() => bulkToggle(true)}>تفعيل</Button>
            <Button size="xs" icon={<i className="ti ti-x" />} onClick={() => bulkToggle(false)}>تعطيل</Button>
            <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={bulkDelete}>حذف</Button>
            <Button size="xs" onClick={() => setSelectedIds([])}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="srch" style={{ flex: 2, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text" placeholder="بحث بالاسم، المرجع، الباركود..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t1)' }}
          value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setPage(1); }}>
          <option value="">كل الفئات</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t1)' }}
          value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }}>
          <option value="">كل العلامات</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select style={{ width: 110, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t1)' }}
          value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">غير نشط</option>
        </select>
        {hasFilters && (
          <Button size="xs" variant="danger" icon={<i className="ti ti-x" />} onClick={clearFilters}>مسح الكل</Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {debouncedSearch && <Badge variant="info" onClick={() => setSearch('')}>بحث: {debouncedSearch} ✕</Badge>}
          {familyFilter    && <Badge variant="info" onClick={() => setFamilyFilter('')}>الفئة: {getFamilyName(+familyFilter)} ✕</Badge>}
          {brandFilter     && <Badge variant="info" onClick={() => setBrandFilter('')}>العلامة: {getBrandName(+brandFilter)} ✕</Badge>}
          {activeFilter    && <Badge variant="info" onClick={() => setActiveFilter('')}>الحالة: {activeFilter === '1' ? 'نشط' : 'غير نشط'} ✕</Badge>}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} /></div>
          <div className="empty-tx">جاري التحميل...</div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon="ti-package-off" text="لا توجد منتجات" action={<Button variant="primary" onClick={openAdd}>إضافة منتج</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          <div className="tw" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  {buildTableCols(hiddenCols).map(col => (
                    <th key={col.key} style={col.thStyle}
                      onClick={col.sortable ? () => handleSort(col.sortField ?? col.key) : undefined}>
                      {col.key === 'checkbox' ? (() => {
                        const pageIds = products.map(p => p.id);
                        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
                        const someSelected = pageIds.some(id => selectedIds.includes(id));
                        return (
                          <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => setSelectedIds(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])])} />
                        );
                      })() : (
                        <>{col.label}{col.sortable && sortField === (col.sortField ?? col.key) ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id} style={{ background: selectedIds.includes(prod.id) ? 'var(--emb)' : undefined }}>
                    {buildTableCols(hiddenCols).map(col => (
                      <td key={col.key} style={col.tdStyle} onClick={col.key === 'sell_price' ? (e) => e.stopPropagation() : undefined}>
                        {col.render(prod, products.indexOf(prod))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {(() => {
                  const pages: number[] = [];
                  const max = 5;
                  if (meta.last_page <= max) for (let i = 1; i <= meta.last_page; i++) pages.push(i);
                  else if (page <= 3)              for (let i = 1; i <= max; i++) pages.push(i);
                  else if (page >= meta.last_page - 2) for (let i = meta.last_page - max + 1; i <= meta.last_page; i++) pages.push(i);
                  else                            for (let i = page - 2; i <= page + 2; i++) pages.push(i);
                  return pages.map(p => (
                    <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ));
                })()}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Product Modal */}
      <Suspense fallback={null}>
        <ProductModal
          open={modal.open}
          product={editingProduct}
          onClose={() => { modal.closeModal(); setEditingProduct(null); }}
          onSaved={() => {
            notify.success(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
          }}
        />
      </Suspense>

      {/* Confirm Delete */}
      <Modal open={deleteModal.open} onClose={deleteModal.closeModal} size="sm" title="تأكيد حذف المنتج">
        <div style={{ textAlign: 'center', padding: 16 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
          <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
          <div style={{ fontSize: 13, color: 'var(--t4)' }}>
            لا يمكن حذف منتج له حركات مخزون أو مستندات مرتبطة.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
          <Button onClick={deleteModal.closeModal} disabled={deleteMutation.isPending}>إلغاء</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}
            icon={deleteMutation.isPending ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </div>
      </Modal>

      {/* Import Wizard */}
      <Suspense fallback={null}>
        <ImportWizardModal
          open={importModal.open}
          onClose={() => { importModal.closeModal(); qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) }); }}
          config={PRODUCT_IMPORT_CONFIG}
        />
      </Suspense>
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
      <CopyConfigModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onApply={() => {}}
        mode="bulk"
        bulkCount={selectedIds.length}
        onBulkApply={bulkCopyConfig}
      />

      {/* Label Print Modal */}
      {labelPrintData && companyInfo && (
        <Suspense fallback={null}>
          <TemplatePrintModal
            open={labelPrintOpen}
            onClose={() => setLabelPrintOpen(false)}
            data={labelPrintData}
            company={companyInfo as any}
            templates={stickerTemplates}
            template={stickerTemplate ?? undefined}
            docTypeCode="STK"
          />
        </Suspense>
      )}
    </div>
  );
}
