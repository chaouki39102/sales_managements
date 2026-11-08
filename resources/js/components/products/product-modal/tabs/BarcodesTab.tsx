// Tab "الباركودات" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import type { Barcode } from '@/lib/api/core/types';
import { s } from '../ui/styles';
import Field from '../ui/Field';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderBarcodesTab(ctx: ProductModalCtx) {
  const {
    isEdit, barcodeInput, setBarcodeInput, showAddBarcode, setShowAddBarcode, productBarcodes,
    barcodeMutations, addBarcode, removeBarcodeItem, makePrimaryBarcode, copyBarcodeText,
  } = ctx;

  const barcodes = (productBarcodes as Barcode[]);
  const isCreating = !isEdit;

  if (isCreating) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
        <i className="ti ti-barcode" style={{ fontSize: 40, opacity: 0.3 }} />
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>أضف الباركودات بعد إنشاء المنتج</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>احفظ المنتج أولاً ثم أضف الباركودات من تاب التعديل</div>
      </div>
    );
  }

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-barcode" title="باركودات المنتج" subtitle="أضف باركود واحد أو أكثر — الباركود الأول يصبح رئيسي تلقائياً" />

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>
          {barcodes.length === 0
            ? 'لا توجد باركودات'
            : `${barcodes.length} باركود`}
        </div>
        {!showAddBarcode && (
          <button
            onClick={() => { setShowAddBarcode(true); setBarcodeInput(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة باركود
          </button>
        )}
      </div>

      {/* Inline Add — single input */}
      {showAddBarcode && (
        <div style={{ ...s.card, border: '1px solid var(--em)', background: 'var(--bg1)', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--em)' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>باركود جديد</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Field label="الباركود" col={1}>
              <input
                autoFocus
                style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace' }}
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && barcodeInput.trim()) addBarcode();
                  if (e.key === 'Escape') setShowAddBarcode(false);
                }}
                placeholder="6121234567890"
              />
            </Field>
            <div style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
              <button
                onClick={addBarcode}
                disabled={!barcodeInput.trim() || barcodeMutations.create.isPending}
                style={{ padding: '8px 18px', borderRadius: 'var(--r2)', border: 'none', background: barcodeInput.trim() ? 'var(--em)' : 'var(--b3)', color: barcodeInput.trim() ? '#fff' : 'var(--t4)', fontSize: 12, fontWeight: 600, cursor: barcodeInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, height: 36, whiteSpace: 'nowrap' }}
              >
                {barcodeMutations.create.isPending
                  ? <i className="ti ti-loader" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />
                  : <i className="ti ti-check" style={{ fontSize: 14 }} />}
                حفظ
              </button>
              <button
                onClick={() => setShowAddBarcode(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', height: 36 }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Cards */}
      {barcodes.length === 0 && !showAddBarcode ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
          <i className="ti ti-barcode" style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد باركودات مُعرَّفة</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف باركوداً بالضغط على &ldquo;إضافة باركود&rdquo;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {barcodes.map((bc) => (
            <div key={bc.id} style={{
              padding: '10px 14px',
              borderRadius: 'var(--r3)',
              border: `1px solid ${bc.is_primary ? 'var(--embo)' : 'var(--b2)'}`,
              background: bc.is_primary ? 'var(--emb)' : 'var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              {/* Left: barcode info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: bc.is_primary ? 'var(--gold, #c8952c)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${bc.is_primary ? 'ti-star' : 'ti-barcode'}`} style={{ fontSize: 15, color: bc.is_primary ? '#fff' : 'var(--t4)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: bc.is_primary ? 700 : 500, direction: 'ltr', color: 'var(--t1)', letterSpacing: '0.05em' }}>
                    {bc.barcode}
                  </span>
                  {bc.is_primary && (
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: 'var(--em)', color: '#fff', fontWeight: 700 }}>
                      رئيسي
                    </span>
                  )}
                </div>
              </div>

              {/* Right: action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => makePrimaryBarcode(bc.id)}
                  disabled={bc.is_primary}
                  title={bc.is_primary ? 'رئيسي بالفعل' : 'تعيين كرئيسي'}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    border: bc.is_primary ? 'none' : '1px solid var(--b3)',
                    background: bc.is_primary ? 'var(--gold, #c8952c)' : 'var(--bg3)',
                    color: bc.is_primary ? '#fff' : 'var(--t4)',
                    cursor: bc.is_primary ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, opacity: bc.is_primary ? 1 : 0.7, transition: 'all .15s',
                  }}
                >
                  <i className={`ti ${bc.is_primary ? 'ti-star' : 'ti-star-off'}`} />
                </button>
                <button
                  onClick={() => copyBarcodeText(bc.barcode)}
                  title="نسخ"
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                >
                  <i className="ti ti-copy" />
                </button>
                <button
                  onClick={() => removeBarcodeItem(bc.id)}
                  disabled={barcodeMutations.remove.isPending}
                  title="حذف"
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {barcodes.length > 0 && !showAddBarcode && (
        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
          الباركود <strong>الرئيسي</strong> (النجمة الذهبية) يظهر في فواتير البيع.
        </div>
      )}
    </div>
  );
}
