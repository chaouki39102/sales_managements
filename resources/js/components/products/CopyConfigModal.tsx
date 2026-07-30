import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { ProductPackaging, QuantityDiscount } from '@/lib/api/core/types';

interface SourceProduct {
  id: number;
  name: string;
  ref?: string | null;
  barcode?: string | null;
  packagings?:        ProductPackaging[];
  quantity_discounts?: QuantityDiscount[];
}

interface CopyConfigResult {
  copy_packaging: boolean;
  copy_discounts: boolean;
  replace_packaging: boolean;
  replace_discounts: boolean;
  packagings:        ProductPackaging[];
  quantity_discounts: Array<{
    price_level_id:      number;
    min_qty:             number | '';
    max_qty:             number | null;
    discount_amount:     number | null;
    discount_percentage: number | null;
    tier_order:          number;
    is_blocked:          boolean;
    active:              boolean;
  }>;
}

interface CopyConfigModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (result: CopyConfigResult) => void;
  mode: 'inline' | 'bulk';
  bulkCount?: number;
  onBulkApply?: (sourceProduct: SourceProduct, options: { copy_packaging: boolean; copy_discounts: boolean; replace_packaging: boolean; replace_discounts: boolean }) => Promise<void>;
}

function Toggle({ checked, onChange, icon, label, desc, color }: {
  checked: boolean; onChange: () => void; icon: string; label: string; desc: string; color: string;
}) {
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderRadius: 'var(--r2)',
        border: `1px solid ${checked ? color : 'var(--b2)'}`,
        background: checked ? `${color}11` : 'var(--bg3)',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative',
        background: checked ? color : 'var(--b3)', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: checked ? color : 'var(--t1)' }}>
          <i className={`ti ${icon}`} style={{ marginLeft: 4, fontSize: 13 }} />
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function CopyConfigModal({
  open,
  onClose,
  onApply,
  mode,
  bulkCount = 0,
  onBulkApply,
}: CopyConfigModalProps) {
  const slug = useActiveSlug();
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<SourceProduct[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [selected, setSelected] = useState<SourceProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [copyPackaging, setCopyPackaging] = useState(true);
  const [copyDiscounts, setCopyDiscounts] = useState(true);
  const [replacePackaging, setReplacePackaging] = useState(false);
  const [replaceDiscounts, setReplaceDiscounts] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(null);
      setCopyPackaging(true);
      setCopyDiscounts(true);
      setReplacePackaging(false);
      setReplaceDiscounts(false);
      setError('');
      return;
    }
    setLoadingAll(true);
    apiGet<any>('/products', {
      include: 'packagings,quantityDiscounts', per_page: 2000, 'filter[active]': 1,
    })
      .then(data => {
        const items = Array.isArray(data) ? data : (data?.data ?? []);
        setAllProducts(items as SourceProduct[]);
      })
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingAll(false));
  }, [open, slug]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.ref && p.ref.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    : allProducts;

  const selectProduct = (p: SourceProduct) => {
    setSelected(p);
    setQuery(p.name);
    setError('');
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setError('');

    if (!copyPackaging && !copyDiscounts) {
      setError('فعّل نسخ التعبئات أو التخفيضات على الأقل');
      return;
    }

    if (mode === 'bulk' && onBulkApply) {
      setLoading(true);
      try {
        await onBulkApply(selected, {
          copy_packaging: copyPackaging,
          copy_discounts: copyDiscounts,
          replace_packaging: replacePackaging,
          replace_discounts: replaceDiscounts,
        });
        onClose();
      } catch (e: any) {
        setError(e?.message || 'حدث خطأ أثناء النسخ');
      } finally {
        setLoading(false);
      }
      return;
    }

    onApply({
      copy_packaging: copyPackaging,
      copy_discounts: copyDiscounts,
      replace_packaging: replacePackaging,
      replace_discounts: replaceDiscounts,
      packagings: copyPackaging ? (selected.packagings ?? []).map(pkg => ({
        ...pkg, id: undefined,
      })) : [],
      quantity_discounts: copyDiscounts ? (selected.quantity_discounts ?? []).map(d => ({
        price_level_id:      d.price_level_id,
        min_qty:             d.min_qty,
        max_qty:             d.max_qty ?? null,
        discount_amount:     d.discount_amount ?? null,
        discount_percentage: d.discount_percentage ?? null,
        tier_order:          d.tier_order,
        is_blocked:          d.is_blocked ?? false,
        active:              d.active ?? true,
      })) : [],
    });
    onClose();
  };

  const pkgCount = selected?.packagings?.length ?? 0;
  const discounts = selected?.quantity_discounts ?? [];
  const discCount = discounts.length;
  const previewDiscounts = discounts.slice(0, 6);
  const discountAmountSummary = (() => {
    if (discounts.length === 0) return null;
    const amounts = discounts.filter(d => d.discount_amount).map(d => d.discount_amount as number);
    const pcts = discounts.filter(d => d.discount_percentage).map(d => d.discount_percentage as number);
    const parts: string[] = [];
    if (amounts.length) {
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      parts.push(min === max ? `${min} دج` : `${min}–${max} دج`);
    }
    if (pcts.length) {
      const min = Math.min(...pcts);
      const max = Math.max(...pcts);
      parts.push(min === max ? `${min}%` : `${min}–${max}%`);
    }
    return parts.join(' | ') || null;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={mode === 'bulk' ? `نسخ التكوين إلى ${bulkCount} منتج` : 'نسخ التكوين من منتج آخر'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            style={{
              padding: '7px 18px', borderRadius: 'var(--r2)', border: 'none',
              background: !selected || loading ? 'var(--b3)' : 'var(--em)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: !selected || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Tajawal, inherit', transition: 'background .15s',
            }}
          >
            {loading
              ? <><i className="ti ti-loader" style={{ fontSize: 13, animation: 'spin 1s linear infinite', marginLeft: 6 }} /> جاري النسخ...</>
              : <><i className="ti ti-copy" style={{ fontSize: 13, marginLeft: 6 }} /> {mode === 'bulk' ? `نسخ إلى ${bulkCount} منتج` : 'تطبيق'}</>
            }
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--blue-bg, #e6f4ff)', border: '1px solid var(--blue-border, #91caff)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
          <i className="ti ti-info-circle" style={{ marginLeft: 6, color: 'var(--blue)' }} />
          اختر المنتج المصدر، ثم حدد ما تريد نسخه: التعبئات و/أو التخفيضات المالية.
          {mode === 'bulk' && ' يمكنك نسخ كل قسم بشكل مستقل.'}
        </div>

        {/* ── Copy options: 2 sections side by side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Packaging */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Toggle
              checked={copyPackaging}
              onChange={() => setCopyPackaging(v => !v)}
              icon="ti-package"
              label="نسخ التعبئات"
              desc={copyPackaging ? (pkgCount > 0 ? `${pkgCount} تعبئة متاحة` : 'لا توجد تعبئات') : 'معطّل'}
              color="var(--em)"
            />
            {copyPackaging && (
              <div
                onClick={() => setReplacePackaging(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderRadius: 'var(--r1)', cursor: 'pointer',
                  background: replacePackaging ? 'var(--red-bg, #fff1f0)' : 'var(--bg3)',
                  border: `1px solid ${replacePackaging ? 'var(--redbo)' : 'var(--b2)'}`,
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 28, height: 16, borderRadius: 8, position: 'relative',
                  background: replacePackaging ? 'var(--red)' : 'var(--b3)', transition: 'background .2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: replacePackaging ? 14 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: replacePackaging ? 'var(--red)' : 'var(--t3)', fontWeight: 600 }}>
                  <i className="ti ti-trash" style={{ marginLeft: 3, fontSize: 10 }} />
                  {replacePackaging ? 'حذف الموجود + نسخ' : 'إضافة فقط'}
                </div>
              </div>
            )}
          </div>

          {/* Discounts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Toggle
              checked={copyDiscounts}
              onChange={() => setCopyDiscounts(v => !v)}
              icon="ti-discount"
              label="نسخ التخفيضات"
              desc={copyDiscounts ? (discCount > 0 ? `${discCount} تخفيض (${discountAmountSummary ?? '—'})` : 'لا توجد تخفيضات') : 'معطّل'}
              color="var(--gold, #d48806)"
            />
            {copyDiscounts && (
              <div
                onClick={() => setReplaceDiscounts(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderRadius: 'var(--r1)', cursor: 'pointer',
                  background: replaceDiscounts ? 'var(--red-bg, #fff1f0)' : 'var(--bg3)',
                  border: `1px solid ${replaceDiscounts ? 'var(--redbo)' : 'var(--b2)'}`,
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 28, height: 16, borderRadius: 8, position: 'relative',
                  background: replaceDiscounts ? 'var(--red)' : 'var(--b3)', transition: 'background .2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: replaceDiscounts ? 14 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: replaceDiscounts ? 'var(--red)' : 'var(--t3)', fontWeight: 600 }}>
                  <i className="ti ti-trash" style={{ marginLeft: 3, fontSize: 10 }} />
                  {replaceDiscounts ? 'حذف الموجود + نسخ' : 'إضافة فقط'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Search input ── */}
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 16 }} />
          <input
            type="text"
            placeholder={loadingAll ? 'جاري تحميل المنتجات...' : 'ابحث بالاسم، المرجع، أو الباركود...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loadingAll}
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              borderRadius: 'var(--r2)', border: '1px solid var(--b3)',
              background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
              outline: 'none', fontFamily: 'Tajawal, inherit',
              boxSizing: 'border-box' as const,
              opacity: loadingAll ? 0.6 : 1,
            }}
            autoFocus
          />
          {loadingAll && (
            <i className="ti ti-loader" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 16, animation: 'spin 1s linear infinite' }} />
          )}
          {!loadingAll && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--t4)', pointerEvents: 'none' }}>
              {filtered.length}
            </span>
          )}
        </div>

        {/* ── Product list ── */}
        <div
          ref={listRef}
          style={{
            maxHeight: 300,
            overflowY: 'auto',
            border: '1px solid var(--b2)',
            borderRadius: 'var(--r2)',
            background: 'var(--bg1)',
          }}
        >
          {loadingAll && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              <i className="ti ti-loader" style={{ fontSize: 20, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 8 }} />
              جاري تحميل المنتجات...
            </div>
          )}

          {!loadingAll && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              <i className="ti ti-package-off" style={{ fontSize: 28, opacity: 0.3, display: 'block', marginBottom: 8 }} />
              {q ? <>لا توجد نتائج لـ &ldquo;{query}&rdquo;</> : 'لا توجد منتجات نشطة'}
            </div>
          )}

          {!loadingAll && filtered.map(p => {
            const pc = p.packagings?.length ?? 0;
            const pd = p.quantity_discounts ?? [];
            const isActive = selected?.id === p.id;
            const discSummary = (() => {
              if (pd.length === 0) return null;
              const amts = pd.filter(d => d.discount_amount).map(d => d.discount_amount as number);
              const parts: string[] = [];
              if (amts.length) {
                const mn = Math.min(...amts);
                const mx = Math.max(...amts);
                parts.push(mn === mx ? `${mn} دج` : `${mn}–${mx} دج`);
              }
              return parts.join(' ') || null;
            })();
            return (
              <div
                key={p.id}
                onClick={() => selectProduct(p)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--b1)',
                  background: isActive ? 'var(--emb)' : undefined,
                  transition: 'background .1s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ''; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: isActive ? 'var(--em)' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 11, color: 'var(--t4)' }}>
                    {p.ref && <span>ref: {p.ref}</span>}
                    {p.barcode && <span style={{ fontFamily: 'monospace' }}>{p.barcode}</span>}
                    {discSummary && <span style={{ color: 'var(--gold, #d48806)', fontWeight: 600 }}><i className="ti ti-cash" style={{ fontSize: 10, marginLeft: 2 }} />{discSummary}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {pc > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 10,
                      background: copyPackaging ? 'var(--emb)' : 'var(--bg3)',
                      color: copyPackaging ? 'var(--em)' : 'var(--t4)',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      <i className="ti ti-package" style={{ fontSize: 10 }} /> {pc}
                    </span>
                  )}
                  {pd.length > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 10,
                      background: copyDiscounts ? 'var(--gold-bg, #fffbe6)' : 'var(--bg3)',
                      color: copyDiscounts ? 'var(--gold, #d48806)' : 'var(--t4)',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      <i className="ti ti-discount" style={{ fontSize: 10 }} /> {pd.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--red-bg, #fff1f0)', border: '1px solid var(--redbo)', color: 'var(--red)', fontSize: 12 }}>
            <i className="ti ti-alert-circle" style={{ marginLeft: 6 }} /> {error}
          </div>
        )}

        {/* ── Preview ── */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 'var(--r2)', border: '2px solid var(--em)', background: 'var(--emb)', opacity: loading ? 0.6 : 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-check-circle" style={{ fontSize: 16 }} />
              {selected.name}
              {copyPackaging && pkgCount > 0 && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--em)', color: '#fff', fontWeight: 700 }}>
                  {pkgCount} تعبئة
                </span>
              )}
              {copyDiscounts && discCount > 0 && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--gold, #d48806)', color: '#fff', fontWeight: 700 }}>
                  <i className="ti ti-cash" style={{ fontSize: 9, marginLeft: 3 }} />{discCount} تخفيض{discountAmountSummary ? ` (${discountAmountSummary})` : ''}
                </span>
              )}
            </div>

            {copyPackaging && pkgCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' as const }}>
                  التعبئات{replacePackaging && <span style={{ color: 'var(--red)', marginRight: 4 }}>(استبدال)</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {(selected.packagings ?? []).map((pkg, i) => (
                    <div key={i} style={{ padding: '5px 10px', borderRadius: 'var(--r1)', background: 'var(--bg2)', border: '1px solid var(--b2)', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--em)', marginLeft: 4 }}>{pkg.code}</span>
                      <span style={{ color: 'var(--t2)' }}>{pkg.label}</span>
                      <span style={{ color: 'var(--t4)', marginRight: 4 }}>×{pkg.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {copyDiscounts && discCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' as const }}>
                  <i className="ti ti-cash" style={{ fontSize: 10, marginLeft: 3 }} />التخفيضات المالية{replaceDiscounts && <span style={{ color: 'var(--red)', marginRight: 4 }}>(استبدال)</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px', gap: 4, padding: '0 2px' }}>
                  {['من كمية', 'حتى كمية', 'خصم (دج)', 'خصم (%)'].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)' }}>{h}</div>
                  ))}
                </div>
                {previewDiscounts.map((d, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px', gap: 4, alignItems: 'center', padding: '4px 8px', borderRadius: 'var(--r1)', background: 'var(--bg2)', fontSize: 11 }}>
                    <div style={{ textAlign: 'center', fontWeight: 600 }}>{d.min_qty}</div>
                    <div style={{ textAlign: 'center', color: 'var(--t3)' }}>{d.max_qty ?? '∞'}</div>
                    <div style={{ textAlign: 'center', color: d.discount_amount ? 'var(--gold, #d48806)' : 'var(--t4)' }}>{d.discount_amount ? `${d.discount_amount} دج` : '—'}</div>
                    <div style={{ textAlign: 'center', color: d.discount_percentage ? 'var(--gold, #d48806)' : 'var(--t4)' }}>{d.discount_percentage ? `${d.discount_percentage}%` : '—'}</div>
                  </div>
                ))}
                {discCount > 6 && (
                  <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center' }}>+{discCount - 6} شروط إضافية</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
