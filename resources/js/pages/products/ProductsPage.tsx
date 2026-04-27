// resources/js/pages/products/ProductsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import ProgressBar from '@/components/ui/ProgressBar';
import ProductModal from '@/components/products/ProductModal';
import apiClient from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Family      { id: number; name: string; }
interface Brand       { id: number; name: string; }
interface PriceLevel  { id: number; name: string; }

interface Variant {
  id: number;
  ref: string;
  variant_name: string | null;
  barcode: string | null;
  purchase_price: number;
  price_ht: number;
  tva_rate: number;
  tva_id: number | null;
  unit_id: number | null;
  min_stock: number;
  min_stock_alert: number;
  active: boolean;
  stock_quantity: number;
  manages_quantity_discounts: boolean;
  prices: any[];
  quantity_discounts: any[];
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number | null;
  images: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  family: Family | null;
  brand: Brand | null;
  productType: { id: number; name: string } | null;
  variants: Variant[];
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' دج';

const StockBadge = ({ qty, min = 5 }: { qty?: number; min?: number }) => {
  const q = qty ?? 0;
  if (q <= 0)  return <span className="bx br no-dot" style={{ fontSize: 10 }}>نفذ</span>;
  if (q <= min) return <span className="bx bg no-dot" style={{ fontSize: 10 }}>منخفض</span>;
  return <span className="bx be no-dot" style={{ fontSize: 10 }}>متوفر</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const qc = useQueryClient();

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

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Variant Tooltip
  const [variantTooltip, setVariantTooltip] = useState<{ productId: number; variants: Variant[] } | null>(null);

  // ── Lookups (مشتركة بين الصفحة والمودال) ──
  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: priceLevels = [] } = useQuery<PriceLevel[]>({
    queryKey: ['price-levels'],
    queryFn: () => apiClient.get('/price-levels', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    staleTime: 10 * 60_000,
  });

  // ── Products Query ──
  // نضيف include=variants حتى يأتي الرد مع المتغيرات
  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', debouncedSearch, familyFilter, brandFilter, activeFilter, page, perPage, sortField, sortDir],
    queryFn: () => {
      const params: Record<string, any> = {
        sort: sortDir === 'desc' ? `-${sortField}` : sortField,
        per_page: perPage,
        page,
        include: 'variants',   // ← مطلوب لجلب المتغيرات
      };
      if (debouncedSearch) params['filter[search]'] = debouncedSearch;
      if (familyFilter)    params['filter[family_id]'] = familyFilter;
      if (brandFilter)     params['filter[brand_id]'] = brandFilter;
      if (activeFilter)    params['filter[active]'] = activeFilter;
      return apiClient.get<ApiResponse<Product>>('/products', { params }).then(r => r.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const products: Product[] = response?.data ?? [];
  const meta = response?.meta ?? { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };

  // ── Stats ──
  const stats = {
    totalProducts: meta.total,
    totalVariants: products.reduce((s, p) => s + (p.variants?.length ?? 0), 0),
    activeProducts: products.filter(p => p.active).length,
    lowStockVariants: products.flatMap(p => p.variants ?? []).filter(v => v.stock_quantity <= (v.min_stock_alert ?? v.min_stock ?? 5)).length,
    totalStock: products.reduce((s, p) => s + (p.variants ?? []).reduce((vs, v) => vs + (v.stock_quantity ?? 0), 0), 0),
    highestPrice: Math.max(...products.flatMap(p => (p.variants ?? []).map(v => v.price_ht ?? 0)), 0),
  };

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      showToast('تم حذف المنتج بنجاح');
      deleteModal.closeModal();
      setDeletingId(null);
    },
    onError: (err: any) => showToast(err?.response?.data?.message ?? 'فشل الحذف', 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiClient.put(`/products/${id}`, { active }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: () => showToast('فشل تغيير الحالة', 'error'),
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

  const getFamilyName = (id: number | null) => families.find(f => f.id === id)?.name ?? '—';
  const getBrandName  = (id: number | null) => brands.find(b => b.id === id)?.name ?? '—';

  // ── Bulk ──
  const bulkToggle = async (active: boolean) => {
    await Promise.all(selectedIds.map(id => toggleActiveMutation.mutateAsync({ id, active })));
    qc.invalidateQueries({ queryKey: ['products'] });
    showToast(`تم ${active ? 'تفعيل' : 'تعطيل'} ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  const bulkDelete = async () => {
    if (!confirm(`حذف ${selectedIds.length} منتج؟`)) return;
    await Promise.all(selectedIds.map(id => apiClient.delete(`/products/${id}`)));
    qc.invalidateQueries({ queryKey: ['products'] });
    showToast(`تم حذف ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  // ── Render ──
  return (
    <div className="page on" id="p-products">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r3)', background: toast.type === 'success' ? 'var(--em)' : 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} /> {toast.msg}
        </div>
      )}

      <PageHeader
        title="المنتجات"
        subtitle={`إدارة المنتجات — ${meta.total} منتج`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            منتج جديد
          </Button>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-package"        label="المنتجات"         value={stats.totalProducts} />
        <KpiCard variant="blue"   icon="ti-versions"       label="المتغيرات"         value={stats.totalVariants} />
        <KpiCard variant="indigo" icon="ti-check"          label="نشطة"              value={stats.activeProducts} />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخزون منخفض"      value={stats.lowStockVariants} />
        <KpiCard variant="teal"   icon="ti-box"            label="إجمالي المخزون"    value={stats.totalStock} suffix=" وحدة" />
        <KpiCard variant="purple" icon="ti-tag"            label="أعلى سعر"          value={formatDZD(stats.highestPrice)} />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--emb)', borderRadius: 'var(--r2)', border: '1px solid var(--em)', marginBottom: 16 }}>
          <span style={{ fontWeight: 700 }}><i className="ti ti-checkbox" style={{ color: 'var(--em)', marginLeft: 8 }} />تم تحديد {selectedIds.length} منتج</span>
          <div style={{ display: 'flex', gap: 8 }}>
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
            type="text" placeholder="بحث بالاسم أو السلوج..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setPage(1); }}>
          <option value="">كل الفئات</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }}>
          <option value="">كل العلامات</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select style={{ width: 110, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}>
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
          {debouncedSearch && <Badge variant="info" className="cursor-pointer" onClick={() => setSearch('')}>بحث: {debouncedSearch} ✕</Badge>}
          {familyFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setFamilyFilter('')}>الفئة: {getFamilyName(+familyFilter)} ✕</Badge>}
          {brandFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setBrandFilter('')}>العلامة: {getBrandName(+brandFilter)} ✕</Badge>}
          {activeFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setActiveFilter('')}>الحالة: {activeFilter === '1' ? 'نشط' : 'غير نشط'} ✕</Badge>}
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
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id))}
                    />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: 180 }}>
                    المنتج {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الفئة</th>
                  <th>العلامة</th>
                  <th style={{ textAlign: 'center' }}>المتغيرات</th>
                  <th style={{ textAlign: 'right' }}>السعر</th>
                  <th style={{ textAlign: 'center' }}>المخزون</th>
                  <th style={{ textAlign: 'center' }}>الحالة</th>
                  <th style={{ textAlign: 'center', width: 100 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  const variants    = prod.variants ?? [];
                  const totalStock  = variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
                  const minPrice    = variants.length ? Math.min(...variants.map(v => v.price_ht ?? 0)) : 0;
                  const minAlert    = variants[0]?.min_stock_alert ?? variants[0]?.min_stock ?? 5;
                  const stockPct    = minAlert > 0 ? Math.min(100, (totalStock / minAlert) * 100) : 100;
                  const isSelected  = selectedIds.includes(prod.id);

                  return (
                    <tr key={prod.id} style={{ background: isSelected ? 'var(--emb)' : undefined }}>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== prod.id) : [...prev, prod.id])}
                        />
                      </td>

                      <td>
                        <div style={{ fontWeight: 700 }}>{prod.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{prod.slug}</div>
                        {prod.description && (
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prod.description}
                          </div>
                        )}
                      </td>

                      <td>{getFamilyName(prod.family_id)}</td>
                      <td>{getBrandName(prod.brand_id)}</td>

                      {/* Variants */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg3)', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            onMouseEnter={() => setVariantTooltip({ productId: prod.id, variants })}
                            onMouseLeave={() => setVariantTooltip(null)}
                          >
                            {variants.length} <i className="ti ti-versions" style={{ fontSize: 12 }} />
                          </span>
                          {variantTooltip?.productId === prod.id && variants.length > 0 && (
                            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', boxShadow: 'var(--shadow2)', padding: 8, minWidth: 180, zIndex: 100, whiteSpace: 'nowrap' }}>
                              {variants.slice(0, 5).map(v => (
                                <div key={v.id} style={{ padding: '3px 8px', fontSize: 11 }}>
                                  {v.variant_name || v.ref} — {formatDZD(v.price_ht ?? 0)}
                                </div>
                              ))}
                              {variants.length > 5 && <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--t4)' }}>+{variants.length - 5} أكثر</div>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 700, color: 'var(--em)' }}>
                        {variants.length ? formatDZD(minPrice) : '—'}
                      </td>

                      {/* Stock */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ minWidth: 80 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ProgressBar value={stockPct} height={4} />
                            <span style={{ fontSize: 11, minWidth: 30 }}>{totalStock}</span>
                          </div>
                          <StockBadge qty={totalStock} min={minAlert} />
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={prod.active}
                          onChange={val => toggleActiveMutation.mutate({ id: prod.id, active: val })}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(prod)} title="تعديل" />
                          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(prod.id)} title="حذف" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="ti ti-chevron-right" /></Button>
                {(() => {
                  const pages: number[] = [];
                  const max = 5;
                  if (meta.last_page <= max) for (let i = 1; i <= meta.last_page; i++) pages.push(i);
                  else if (page <= 3) for (let i = 1; i <= max; i++) pages.push(i);
                  else if (page >= meta.last_page - 2) for (let i = meta.last_page - max + 1; i <= meta.last_page; i++) pages.push(i);
                  else for (let i = page - 2; i <= page + 2; i++) pages.push(i);
                  return pages.map(p => (
                    <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ));
                })()}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}><i className="ti ti-chevron-left" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Product Modal */}
      <ProductModal
        open={modal.open}
        product={editingProduct}
        lookups={{ families, brands, priceLevels }}
        onClose={() => { modal.closeModal(); setEditingProduct(null); }}
        onSaved={() => {
          refetch();
          showToast(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
        }}
      />

      {/* Confirm Delete */}
      <Modal open={deleteModal.open} onClose={deleteModal.closeModal} size="sm" title="تأكيد حذف المنتج">
        <div style={{ textAlign: 'center', padding: 16 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
          <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
          <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن هذا الإجراء.</div>
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
    </div>
  );
}
