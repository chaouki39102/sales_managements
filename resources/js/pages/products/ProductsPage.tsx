// resources/js/pages/products/ProductsPage.tsx (نسخة مطورة بالفلاتر)
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import ColumnFilterPopover from '@/components/ui/ColumnFilterPopover';
import ProductModal from '@/components/products/ProductModal';
import apiClient from '@/lib/api/client';

// ---------- Types ----------
interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  family_id?: number;
  brand_id?: number;
  product_type_id?: number;
  active: boolean;
  variants?: Variant[];
  family?: { id: number; name: string };
  brand?: { id: number; name: string };
  productType?: { id: number; name: string };
}

interface Variant {
  id: number;
  ref: string;
  stock_quantity?: number;
  default_selling_price_ht: number;
  active: boolean;
}

// ---------- API ----------
const productsApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/products', { params }).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/products/${id}`).then(r => r.data),
};

// ---------- Helpers ----------
const formatDZD = (amount: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' دج';

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---------- Component ----------
export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);

  // 🔽 فلاتر الأعمدة
  const [nameFilter, setNameFilter] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState<number | ''>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');

  // فلاتر القوائم المنسدلة
  const { data: families } = useQuery({
    queryKey: ['families-select'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: brands } = useQuery({
    queryKey: ['brands-select'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // جلب المنتجات مع دمج جميع الفلاتر
  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: [
      'products',
      debouncedSearch,
      nameFilter,
      familyFilter,
      brandFilter,
      minPriceFilter,
      maxPriceFilter,
      activeFilter,
      page,
      perPage,
    ],
    queryFn: () => {
      const params: any = {
        sort: '-created_at',
        per_page: perPage,
        page,
        include: 'family,brand,productType,variants',
      };
      if (debouncedSearch) params['filter[search]'] = debouncedSearch;
      if (familyFilter) params['filter[family_id]'] = familyFilter;
      if (brandFilter) params['filter[brand_id]'] = brandFilter;
      if (activeFilter !== '') params['filter[active]'] = activeFilter ? '1' : '0';
      if (nameFilter) params['filter[name]'] = nameFilter;
      if (minPriceFilter !== '' || maxPriceFilter !== '') {
        // نطاق السعر يتم التعامل معه من خلال المتغيرات - مبسط: نمرر min_price و max_price
        if (minPriceFilter) params['filter[min_price]'] = minPriceFilter;
        if (maxPriceFilter) params['filter[max_price]'] = maxPriceFilter;
      }
      return apiClient.get('/products', { params }).then(r => r.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const products: Product[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  const totalProducts = meta?.total ?? 0;
  const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
  const activeProducts = products.filter(p => p.active).length;
  const lowStockVariants = products.flatMap(p => p.variants || []).filter(v => (v.stock_quantity || 0) <= 5).length;

  // عمليات الحذف
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      deleteModal.closeModal();
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'فشل الحذف'),
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteModal.openModal();
  };
  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };

  // دالة مساعدة لمسح جميع الفلاتر
  const clearAllFilters = () => {
    setNameFilter('');
    setFamilyFilter('');
    setBrandFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setActiveFilter('');
    setSearch('');
    setPage(1);
  };

  const activeFiltersCount = [
    nameFilter,
    familyFilter,
    brandFilter,
    minPriceFilter,
    maxPriceFilter,
    activeFilter !== '',
    search,
  ].filter(Boolean).length;

  return (
    <div className="page on" id="p-products">
      <PageHeader
        title="المنتجات"
        subtitle={`إدارة المنتجات — ${meta?.total ?? 0} منتج`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={() => { setEditingProduct(null); modal.openModal(); }}>
            منتج جديد
          </Button>
        }
      />

      {error && <AlertBar variant="red" dismissible>{error}</AlertBar>}

      {/* KPI Cards */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-package" label="المنتجات" value={totalProducts} />
        <KpiCard variant="blue" icon="ti-versions" label="المتغيرات" value={totalVariants} />
        <KpiCard variant="indigo" icon="ti-check" label="نشطة" value={activeProducts} />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخزون منخفض" value={lowStockVariants} />
      </div>

      {/* Active Filters Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-md">
          <span className="text-sm text-gray-600">الفلاتر النشطة:</span>
          {nameFilter && (
            <Badge variant="info" className="cursor-pointer" onClick={() => setNameFilter('')}>
              الاسم: {nameFilter} ✕
            </Badge>
          )}
          {familyFilter && families && (
            <Badge variant="info" className="cursor-pointer" onClick={() => setFamilyFilter('')}>
              الفئة: {families.find((f: any) => f.id === parseInt(familyFilter))?.name} ✕
            </Badge>
          )}
          {brandFilter && brands && (
            <Badge variant="info" className="cursor-pointer" onClick={() => setBrandFilter('')}>
              العلامة: {brands.find((b: any) => b.id === parseInt(brandFilter))?.name} ✕
            </Badge>
          )}
          {(minPriceFilter !== '' || maxPriceFilter !== '') && (
            <Badge variant="info" className="cursor-pointer" onClick={() => { setMinPriceFilter(''); setMaxPriceFilter(''); }}>
              السعر: {minPriceFilter || '0'} - {maxPriceFilter || '∞'} دج ✕
            </Badge>
          )}
          {activeFilter !== '' && (
            <Badge variant="info" className="cursor-pointer" onClick={() => setActiveFilter('')}>
              الحالة: {activeFilter ? 'نشط' : 'غير نشط'} ✕
            </Badge>
          )}
          <Button size="xs" variant="danger" onClick={clearAllFilters}>مسح الكل</Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : products.length === 0 ? (
        <EmptyState icon="ti-package-off" text="لا توجد منتجات" action={<Button variant="primary" onClick={() => modal.openModal()}>إضافة منتج</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>
                    <div className="flex items-center justify-between">
                      المنتج
                      <ColumnFilterPopover
                        type="text"
                        label="المنتج"
                        value={nameFilter}
                        onChange={setNameFilter}
                        onClear={() => setNameFilter('')}
                      >
                        <span>المنتج</span>
                      </ColumnFilterPopover>
                    </div>
                  </th>
                  <th style={{ minWidth: 120 }}>
                    <div className="flex items-center justify-between">
                      الفئة
                      <ColumnFilterPopover
                        type="select"
                        label="الفئة"
                        value={familyFilter}
                        onChange={setFamilyFilter}
                        options={families?.map((f: any) => ({ value: f.id.toString(), label: f.name })) || []}
                        onClear={() => setFamilyFilter('')}
                      >
                        <span>الفئة</span>
                      </ColumnFilterPopover>
                    </div>
                  </th>
                  <th style={{ minWidth: 120 }}>
                    <div className="flex items-center justify-between">
                      العلامة
                      <ColumnFilterPopover
                        type="select"
                        label="العلامة التجارية"
                        value={brandFilter}
                        onChange={setBrandFilter}
                        options={brands?.map((b: any) => ({ value: b.id.toString(), label: b.name })) || []}
                        onClear={() => setBrandFilter('')}
                      >
                        <span>العلامة</span>
                      </ColumnFilterPopover>
                    </div>
                  </th>
                  <th style={{ minWidth: 80 }}>المتغيرات</th>
                  <th style={{ minWidth: 120 }}>
                    <div className="flex items-center justify-between">
                      السعر الأدنى
                      <ColumnFilterPopover
                        type="number-range"
                        label="السعر"
                        value={{ min: minPriceFilter, max: maxPriceFilter }}
                        onChange={(range) => {
                          setMinPriceFilter(range.min);
                          setMaxPriceFilter(range.max);
                        }}
                        onClear={() => { setMinPriceFilter(''); setMaxPriceFilter(''); }}
                      >
                        <span>السعر</span>
                      </ColumnFilterPopover>
                    </div>
                  </th>
                  <th style={{ minWidth: 100 }}>
                    <div className="flex items-center justify-between">
                      الحالة
                      <ColumnFilterPopover
                        type="boolean"
                        label="الحالة"
                        value={activeFilter}
                        onChange={setActiveFilter}
                        onClear={() => setActiveFilter('')}
                      >
                        <span>الحالة</span>
                      </ColumnFilterPopover>
                    </div>
                  </th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  const minPrice = Math.min(...(prod.variants?.map(v => v.default_selling_price_ht) ?? [0]));
                  return (
                    <tr key={prod.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{prod.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{prod.slug}</div>
                      </td>
                      <td>{prod.family?.name ?? '—'}</td>
                      <td>{prod.brand?.name ?? '—'}</td>
                      <td>{prod.variants?.length ?? 0}</td>
                      <td>{minPrice > 0 ? formatDZD(minPrice) : '—'}</td>
                      <td><Badge variant={prod.active ? 'success' : 'danger'}>{prod.active ? 'نشط' : 'غير نشط'}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => { setEditingProduct(prod); modal.openModal(); }} />
                          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(prod.id)} />
                        </div>
                      </td>
                    </table>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ProductModal open={modal.open} record={editingProduct} onClose={() => { modal.closeModal(); setEditingProduct(null); }} />
      <ConfirmDeleteModal open={deleteModal.open} onClose={deleteModal.closeModal} onConfirm={confirmDelete} loading={deleteMutation.isPending} />
    </div>
  );
}

function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد حذف المنتج">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن حذف المنتج.</div>
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
