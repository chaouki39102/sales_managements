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
import Switch from '@/components/ui/Switch';
import ProgressBar from '@/components/ui/ProgressBar';
import ProductModal from '@/pages/products/ProductModal';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// Types — مطابقة للـ DB الحقيقي (لا variants جدول منفصل)
// ═══════════════════════════════════════════════════════════════════════════

interface Family     { id: number; name: string; }
interface Brand      { id: number; name: string; }
interface PriceLevel { id: number; name: string; }

interface ProductPrice {
  id: number;
  price_level_id: number;
  pricing_method: 'fixed' | 'rate' | 'margin';
  price:   number | null;
  rate:    number | null;
  margin:  number | null;
  active:  boolean;
  price_level?: PriceLevel;
}

interface ProductPackaging {
  id: number;
  code: string;
  label: string;
  quantity: number;
  barcode: string | null;
  is_default: boolean;
  active: boolean;
}

// Product مطابق لـ ProductResource.php + جدول products
interface Product {
  id: number;
  name: string;
  slug: string;
  ref: string | null;
  barcode: string | null;
  description: string | null;
  family_id: number | null;
  brand_id:  number | null;
  product_type_id: number | null;
  tva_id:    number | null;
  unit_id:   number | null;
  purchase_price_ht:   number;
  current_cost_price:  number;
  current_stock:       number;  // appended accessor
  is_low_stock:        boolean; // appended accessor
  manages_stock:       boolean;
  allow_negative_stock: boolean;
  has_lots:            boolean;
  has_expiration_date: boolean;
  min_stock_alert:     number;
  max_stock_alert:     number;
  manages_quantity_discounts: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Relations via include=
  family?:       Family | null;
  brand?:        Brand  | null;
  product_type?: { id: number; name: string } | null;
  prices?:       ProductPrice[];
  packagings?:   ProductPackaging[];
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

// أول سعر بيع ثابت نشط للمنتج
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
  const { activeCompany } = useAuth();
  const slug = activeCompany?.slug ?? '';

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

  // Tooltip للتعبئات والأسعار
  const [priceTooltip, setPriceTooltip] = useState<number | null>(null);

  // ── Lookups ──
  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['families', slug],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
    enabled: !!slug,
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands', slug],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
    enabled: !!slug,
  });

  // ── Products Query — include الصحيح بدون variants ──
  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', slug, debouncedSearch, familyFilter, brandFilter, activeFilter, page, perPage, sortField, sortDir],
    queryFn: () => {
      const params: Record<string, any> = {
        sort: sortDir === 'desc' ? `-${sortField}` : sortField,
        per_page: perPage,
        page,
        // ✅ include مسموح به فعلاً من الـ backend
        include: 'family,brand,productType,prices,packagings',
      };
      if (debouncedSearch) params['filter[search]'] = debouncedSearch;
      if (familyFilter)    params['filter[family_id]'] = familyFilter;
      if (brandFilter)     params['filter[brand_id]']  = brandFilter;
      if (activeFilter)    params['filter[active]']     = activeFilter;
      return apiClient.get<ApiResponse<Product>>('/products', { params }).then(r => r.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: !!slug,
  });

  const products: Product[] = response?.data ?? [];
  const meta = response?.meta ?? { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };

  // ── Stats ──
  const stats = {
    totalProducts:  meta.total,
    activeProducts: products.filter(p => p.active).length,
    lowStock:       products.filter(p => p.manages_stock && p.is_low_stock).length,
    totalStock:     products.reduce((s, p) => s + (p.current_stock ?? 0), 0),
    highestPrice:   Math.max(...products.map(p => getMinPrice(p)), 0),
    withPrices:     products.filter(p => (p.prices ?? []).some(x => x.active)).length,
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
  const getBrandName  = (id: number | null) => brands.find(b => b.id === id)?.name  ?? '—';

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
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r3)',
          background: toast.type === 'success' ? 'var(--em)' : 'var(--red)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,.2)',
        }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-package"        label="إجمالي المنتجات"  value={stats.totalProducts} />
        <KpiCard variant="blue"   icon="ti-check"          label="نشطة"              value={stats.activeProducts} />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخزون منخفض"      value={stats.lowStock} />
        <KpiCard variant="teal"   icon="ti-box"            label="إجمالي المخزون"    value={stats.totalStock} suffix=" وحدة" />
        <KpiCard variant="purple" icon="ti-tag"            label="لها أسعار"          value={stats.withPrices} />
        <KpiCard variant="indigo" icon="ti-trending-up"    label="أعلى سعر"          value={formatDZD(stats.highestPrice)} />
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
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id))}
                    />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: 180 }}>
                    المنتج {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الفئة / العلامة</th>
                  <th style={{ textAlign: 'right' }}>سعر الشراء</th>
                  <th style={{ textAlign: 'right' }}>سعر البيع</th>
                  <th style={{ textAlign: 'center' }}>المخزون</th>
                  <th style={{ textAlign: 'center' }}>الحالة</th>
                  <th style={{ textAlign: 'center', width: 100 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  const sellPrice    = getMinPrice(prod);
                  const stockQty     = prod.current_stock ?? 0;
                  const minAlert     = prod.min_stock_alert ?? 0;
                  const stockPct     = minAlert > 0 ? Math.min(100, (stockQty / (minAlert * 2)) * 100) : stockQty > 0 ? 100 : 0;
                  const isSelected   = selectedIds.includes(prod.id);
                  const priceCount   = (prod.prices ?? []).filter(p => p.active).length;

                  return (
                    <tr key={prod.id} style={{ background: isSelected ? 'var(--emb)' : undefined }}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds(prev =>
                            isSelected ? prev.filter(id => id !== prod.id) : [...prev, prod.id]
                          )}
                        />
                      </td>

                      {/* المنتج */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* أيقونة */}
                          <div style={{
                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
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
                                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                                  <i className="ti ti-building-warehouse" style={{ fontSize: 10 }} /> مخزون
                                </span>
                              )}
                              {prod.has_lots && (
                                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                                  <i className="ti ti-layers" style={{ fontSize: 10 }} /> دفعات
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* الفئة / العلامة */}
                      <td>
                        <div style={{ fontSize: 12 }}>{getFamilyName(prod.family_id)}</div>
                        {prod.brand_id && (
                          <div style={{ fontSize: 11, color: 'var(--t4)' }}>{getBrandName(prod.brand_id)}</div>
                        )}
                      </td>

                      {/* سعر الشراء */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
                          {prod.purchase_price_ht > 0 ? formatDZD(prod.purchase_price_ht) : '—'}
                        </div>
                      </td>

                      {/* سعر البيع — مع tooltip للأسعار */}
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <div
                            style={{ cursor: priceCount > 1 ? 'pointer' : 'default' }}
                            onMouseEnter={() => priceCount > 0 && setPriceTooltip(prod.id)}
                            onMouseLeave={() => setPriceTooltip(null)}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)' }}>
                              {sellPrice > 0 ? formatDZD(sellPrice) : '—'}
                            </div>
                            {priceCount > 1 && (
                              <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                                {priceCount} مستوى <i className="ti ti-chevron-down" style={{ fontSize: 9 }} />
                              </div>
                            )}
                          </div>

                          {/* Tooltip أسعار */}
                          {priceTooltip === prod.id && (prod.prices ?? []).length > 0 && (
                            <div style={{
                              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                              background: 'var(--bg1)', border: '1px solid var(--b2)',
                              borderRadius: 'var(--r2)', boxShadow: 'var(--shadow2)',
                              padding: 8, minWidth: 200, zIndex: 200, whiteSpace: 'nowrap',
                              marginBottom: 4,
                            }}>
                              {(prod.prices ?? []).filter(p => p.active).map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', fontSize: 11, gap: 12 }}>
                                  <span style={{ color: 'var(--t3)' }}>{p.price_level?.name ?? `مستوى ${p.price_level_id}`}</span>
                                  <span style={{ fontWeight: 600 }}>
                                    {p.pricing_method === 'fixed'  && p.price  !== null ? formatDZD(p.price)  : ''}
                                    {p.pricing_method === 'rate'   && p.rate   !== null ? `${p.rate}%` : ''}
                                    {p.pricing_method === 'margin' && p.margin !== null ? `+${formatDZD(p.margin)}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* المخزون */}
                      <td style={{ textAlign: 'center' }}>
                        {prod.manages_stock ? (
                          <div style={{ minWidth: 80 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <ProgressBar value={stockPct} height={4} />
                              <span style={{ fontSize: 11, minWidth: 28, fontWeight: 600 }}>{stockQty}</span>
                            </div>
                            <StockBadge qty={stockQty} min={minAlert} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--t4)' }}>غير محدد</span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={prod.active}
                          onChange={val => toggleActiveMutation.mutate({ id: prod.id, active: val })}
                        />
                      </td>

                      {/* إجراءات */}
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
      <ProductModal
        open={modal.open}
        product={editingProduct}
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
    </div>
  );
}
