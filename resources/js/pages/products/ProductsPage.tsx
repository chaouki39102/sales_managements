// pages/products/ProductsPage.tsx
import React, { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useFamilies, useBrands, useTvas, useUnits } from '@/hooks/useData';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import Modal       from '@/components/ui/Modal';
import EmptyState  from '@/components/ui/EmptyState';
import KpiCard     from '@/components/ui/KpiCard';
import type { Product, ProductVariant } from '@/types';
import type { ProductFilters } from '@/lib/api/products';

export default function ProductsPage() {
  const [filters, setFilters]       = useState<ProductFilters>({ page: 1, per_page: 24 });
  const [view,    setView]          = useState<'grid' | 'list'>('grid');
  const [editing, setEditing]       = useState<Product | null>(null);
  const [creating, setCreating]     = useState(false);

  const { data, isLoading }  = useProducts(filters);
  const { data: families }   = useFamilies();
  const { data: brands }     = useBrands();

  const products = data?.data ?? [];
  const meta     = data?.meta;

  const openCreate = () => { setEditing(null); setCreating(true); };
  const openEdit   = (p: Product) => { setEditing(p); setCreating(true); };
  const closeModal = () => { setEditing(null); setCreating(false); };

  return (
    <div className="page on" id="p-products">

      <PageHeader
        title="المنتجات"
        subtitle={`إدارة كتالوج المنتجات — ${meta?.total ?? '...'} منتج`}
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-download"/>}>تصدير</Button>
            <Button size="sm" icon={<i className="ti ti-upload"/>}>استيراد</Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-square-plus"/>} onClick={openCreate}>
              منتج جديد
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-package"       label="إجمالي المنتجات"  value={meta?.total ?? '—'} sub={`${meta?.total ?? 0} نشط`}  />
        <KpiCard variant="red"    icon="ti-alert-triangle" label="نفد من المخزون"   value="—"                  sub="يحتاج تدخل"              />
        <KpiCard variant="gold"   icon="ti-coin"           label="قيمة المخزون"     value="—"                  unit="دج"                     />
        <KpiCard variant="blue"   icon="ti-chart-line"     label="هامش متوسط"       value="—"                                                 />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input
            type="text"
            placeholder="ابحث بالاسم، الباركود، الرمز..."
            style={{ width: '100%' }}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          style={{ width: 140 }}
          onChange={e => setFilters(f => ({ ...f, family_id: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
        >
          <option value="">كل الفئات</option>
          {families?.map(fam => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
        </select>
        <select
          style={{ width: 140 }}
          onChange={e => setFilters(f => ({ ...f, brand_id: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
        >
          <option value="">كل العلامات</option>
          {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 3, border: '1px solid var(--b2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
          <button
            className="btn btn-xs"
            style={{ border: 'none', borderRadius: 0, ...(view === 'grid' ? { background: 'var(--emb)', color: 'var(--em)' } : {}) }}
            onClick={() => setView('grid')}
          >
            <span className="ic ic-xs"><i className="ti ti-grid-dots"/></span>
          </button>
          <button
            className="btn btn-xs"
            style={{ border: 'none', borderRadius: 0, ...(view === 'list' ? { background: 'var(--emb)', color: 'var(--em)' } : {}) }}
            onClick={() => setView('list')}
          >
            <span className="ic ic-xs"><i className="ti ti-list"/></span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ic"><i className="ti ti-loader"/></div>
          <div className="empty-tx">جاري التحميل...</div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="ti-package"
          text="لا توجد منتجات"
          sub="أضف منتجك الأول الآن"
          action={<Button variant="primary" onClick={openCreate} icon={<i className="ti ti-plus"/>}>منتج جديد</Button>}
        />
      ) : view === 'grid' ? (
        <ProductGrid products={products} onEdit={openEdit} />
      ) : (
        <ProductList products={products} onEdit={openEdit} />
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <Button
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            ←
          </Button>
          <span style={{ padding: '5px 12px', fontSize: 13, color: 'var(--t2)' }}>
            {filters.page} / {meta.last_page}
          </span>
          <Button
            size="sm"
            disabled={filters.page === meta.last_page}
            onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            →
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <ProductModal
        open={creating}
        product={editing}
        onClose={closeModal}
      />
    </div>
  );
}

// ── Grid view ─────────────────────────────────────
function ProductGrid({ products, onEdit }: { products: Product[]; onEdit: (p: Product) => void }) {
  return (
    <div className="prod-grid">
      {products.map(p => {
        const variant   = p.variants?.[0];
        const stock     = variant?.current_stock ?? 0;
        const price     = variant?.default_selling_price_ht ?? 0;
        const tva       = variant?.tva?.rate ?? 19;
        const priceTtc  = price * (1 + tva / 100);
        const isLow     = variant?.manages_stock && stock <= (variant?.min_stock_alert ?? 0);
        const isOOS     = variant?.manages_stock && stock <= 0;

        return (
          <div
            key={p.id}
            className="prod-c"
            style={isOOS ? { borderColor: 'var(--redbo)' } : isLow ? { borderColor: 'var(--goldbo)' } : {}}
            onClick={() => onEdit(p)}
          >
            <div className="prod-img" style={{ background: 'var(--emb)' }}>
              <span className="ic ic-xl" style={{ color: 'var(--em)' }}>
                <i className="ti ti-package"/>
              </span>
            </div>
            <div className="prod-name">{p.name}</div>
            <div className="prod-meta">{p.family?.name ?? '—'} • {variant?.barcode ?? '—'}</div>
            <div className="prod-row">
              <span style={{ fontWeight: 900, color: 'var(--em)' }}>
                {priceTtc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
              </span>
              {variant?.manages_stock && (
                <Badge variant={isOOS ? 'danger' : isLow ? 'warning' : 'success'}>
                  {stock}
                </Badge>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--t4)', display: 'flex', justifyContent: 'space-between' }}>
              <span>HT: {price.toFixed(0)} دج</span>
              <span style={{ color: 'var(--em)' }}>TVA {tva}%</span>
            </div>
          </div>
        );
      })}
      {/* Add new card */}
      <div
        className="prod-c"
        style={{ border: '2px dashed var(--b3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, cursor: 'pointer' }}
        onClick={() => {}}
      >
        <div style={{ marginBottom: 8, opacity: 0.2, fontSize: 36 }}><i className="ti ti-plus-circle"/></div>
        <div style={{ fontSize: '12.5px', color: 'var(--t4)', fontWeight: 600 }}>إضافة منتج جديد</div>
      </div>
    </div>
  );
}

// ── List view ─────────────────────────────────────
function ProductList({ products, onEdit }: { products: Product[]; onEdit: (p: Product) => void }) {
  return (
    <Card noHeader>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الفئة</th>
              <th>الباركود</th>
              <th>TVA</th>
              <th>شراء HT</th>
              <th>بيع TTC</th>
              <th>المخزون</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const v       = p.variants?.[0];
              const tva     = v?.tva?.rate ?? 19;
              const priceTtc = (v?.default_selling_price_ht ?? 0) * (1 + tva / 100);
              const stock    = v?.current_stock;
              const isOOS    = v?.manages_stock && (stock ?? 1) <= 0;
              const isLow    = v?.manages_stock && (stock ?? 0) <= (v?.min_stock_alert ?? 0);

              return (
                <tr key={p.id} onClick={() => onEdit(p)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--em)' }}>
                        <i className="ti ti-package"/>
                      </div>
                      <div>
                        <div className="s">{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                          {v?.ref ?? '—'} • {v?.unit?.symbol ?? 'قطعة'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><Badge variant="warning" noDot>{p.family?.name ?? '—'}</Badge></td>
                  <td className="m">{v?.barcode ?? '—'}</td>
                  <td className="m">{tva}%</td>
                  <td className="m">{(v?.last_purchase_price ?? 0).toFixed(0)} دج</td>
                  <td className="e">{priceTtc.toFixed(0)} دج</td>
                  <td className="s">
                    {v?.manages_stock ? (
                      <Badge variant={isOOS ? 'danger' : isLow ? 'warning' : 'success'}>
                        {stock ?? 0}
                      </Badge>
                    ) : '—'}
                  </td>
                  <td><Badge variant={p.active ? 'success' : 'danger'}>{p.active ? 'نشط' : 'موقوف'}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => onEdit(p)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Add/Edit product modal ─────────────────────────
function ProductModal({
  open, product, onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const isEdit = !!product;
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const { data: families } = useFamilies();
  const { data: brands }   = useBrands();
  const { data: tvas }     = useTvas();
  const { data: units }    = useUnits();

  const [form, setForm] = useState({
    name:        product?.name ?? '',
    family_id:   product?.family_id ?? '',
    brand_id:    product?.brand_id  ?? '',
    description: product?.description ?? '',
  });

  // Variant form
  const [vForm, setVForm] = useState({
    barcode:                 '',
    unit_id:                 '',
    tva_id:                  '',
    last_purchase_price:     '',
    default_selling_price_ht:'',
    min_stock_alert:         '10',
  });

  const handleSave = async () => {
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: product!.id, data: { ...form, family_id: Number(form.family_id) || null, brand_id: Number(form.brand_id) || null } });
      } else {
        await createMut.mutateAsync({ ...form, family_id: Number(form.family_id) || null, brand_id: Number(form.brand_id) || null, product_type_id: 1 });
      }
      onClose();
    } catch {}
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-device-floppy"/>}
            onClick={handleSave}
            disabled={isLoading || !form.name.trim()}
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </Button>
        </>
      }
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className="tab on">معلومات أساسية</div>
        <div className="tab">التسعير</div>
        <div className="tab">المخزون</div>
      </div>

      <div className="fgrid c3">
        <div className="fg s3">
          <label className="req">اسم المنتج</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="أدخل الاسم الكامل للمنتج"
          />
        </div>
        <div className="fg">
          <label>الفئة</label>
          <select value={form.family_id} onChange={e => setForm(f => ({ ...f, family_id: e.target.value }))}>
            <option value="">— اختر —</option>
            {families?.map(fam => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>العلامة التجارية</label>
          <select value={form.brand_id} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))}>
            <option value="">— اختياري —</option>
            {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>وحدة القياس</label>
          <select value={vForm.unit_id} onChange={e => setVForm(v => ({ ...v, unit_id: e.target.value }))}>
            <option value="">— اختر —</option>
            {units?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>TVA</label>
          <select value={vForm.tva_id} onChange={e => setVForm(v => ({ ...v, tva_id: e.target.value }))}>
            <option value="">— اختر —</option>
            {tvas?.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
          </select>
        </div>
        <div className="fg">
          <label>الباركود EAN</label>
          <div className="inp-row">
            <input
              value={vForm.barcode}
              onChange={e => setVForm(v => ({ ...v, barcode: e.target.value }))}
              placeholder="امسح أو أدخل يدوياً"
              style={{ fontFamily: 'monospace' }}
            />
            <div className="inp-suf"><i className="ti ti-barcode"/></div>
          </div>
        </div>
        <div className="fg">
          <label className="req">سعر الشراء HT</label>
          <div className="inp-row">
            <input
              type="number"
              value={vForm.last_purchase_price}
              onChange={e => setVForm(v => ({ ...v, last_purchase_price: e.target.value }))}
              placeholder="0.00"
            />
            <div className="inp-suf">دج</div>
          </div>
        </div>
        <div className="fg">
          <label className="req">سعر البيع HT</label>
          <div className="inp-row">
            <input
              type="number"
              value={vForm.default_selling_price_ht}
              onChange={e => setVForm(v => ({ ...v, default_selling_price_ht: e.target.value }))}
              placeholder="0.00"
            />
            <div className="inp-suf">دج</div>
          </div>
        </div>
        <div className="fg">
          <label>الحد الأدنى للتنبيه</label>
          <input
            type="number"
            value={vForm.min_stock_alert}
            onChange={e => setVForm(v => ({ ...v, min_stock_alert: e.target.value }))}
            placeholder="10"
          />
        </div>
        <div className="fg s3">
          <label>وصف المنتج</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="وصف اختياري للمنتج..."
          />
        </div>
      </div>
    </Modal>
  );
}
