/**
 * ProductModal.tsx — نسخة Enterprise v2.0
 *
 * التحسينات الكاملة:
 *  - استخدام hooks من lookups.ts (useProductLookups + useValuationMethods)
 *  - 8 تابات: الأساسيات | الأسعار | التعبئة | المخزون | الخصومات | الأبعاد | SEO | الصور
 *  - حساب الهامش لحظياً لكل مستوى سعر
 *  - auto-slug من الاسم
 *  - meta_title / meta_description / meta_keywords
 *  - إدارة الصور (gallery) مع upload
 *  - نسخ الباركود بضغطة
 *  - مؤشر اكتمال النموذج (Completeness %)
 *  - Keyboard shortcuts: Esc = إغلاق، Ctrl+S = حفظ، Ctrl+Tab = تاب تالي
 *  - RTL-native بالكامل
 *  - Race condition fix لـ priceLevels
 */

import React, { Suspense } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CopyConfigModal from '@/components/products/CopyConfigModal';
import { fmtMoneyOrDash as fmtDZD } from '@/lib/format';
import type { Barcode } from '@/lib/api/core/types';
import type { ProductModalProps } from './product-modal/types';
import { TABS, TAB_IDS, type TabId } from './product-modal/constants';
const BarcodeScannerModal = React.lazy(() => import('@/components/BarcodeScannerModal'));
const CameraCaptureModal = React.lazy(() => import('@/components/CameraCaptureModal'));
import { useProductModal } from './product-modal/hooks/useProductModal';
import renderBasicTab from './product-modal/tabs/BasicTab';
import renderPricingTab from './product-modal/tabs/PricingTab';
import renderPackagingsTab from './product-modal/tabs/PackagingsTab';
import renderStockTab from './product-modal/tabs/StockTab';
import renderDiscountsTab from './product-modal/tabs/DiscountsTab';
import renderDimensionsTab from './product-modal/tabs/DimensionsTab';
import renderImagesTab from './product-modal/tabs/ImagesTab';
import renderSeoTab from './product-modal/tabs/SeoTab';
import renderBarcodesTab from './product-modal/tabs/BarcodesTab';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal(props: ProductModalProps) {
  const ctx = useProductModal(props);
  const {
    open, isEdit, bodyRef, confirmDialogProps, activeTab, form, apiError, setApiError, isDirty, copyModalOpen,
    setCopyModalOpen, showBarcodeScanner, setShowBarcodeScanner, lookupsLoading, productBarcodes, set,
    switchTab, mutation, handleSubmit, handleClose, showCamera, setShowCamera, handleCameraCapture,
    handleCopyConfig, completeness, tabDot, tabBadge, dotColor,
  } = ctx;

  // ── tabContent map ──
  const tabContent: Record<TabId, () => React.ReactNode> = {
    basic: () => renderBasicTab(ctx), barcodes: () => renderBarcodesTab(ctx), pricing: () => renderPricingTab(ctx), packagings: () => renderPackagingsTab(ctx),
    stock: () => renderStockTab(ctx), discounts: () => renderDiscountsTab(ctx), dimensions: () => renderDimensionsTab(ctx),
    images: () => renderImagesTab(ctx), seo: () => renderSeoTab(ctx),
  };

  const currentTabIdx = TAB_IDS.indexOf(activeTab);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const ovStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9000,
    display: open ? 'flex' : 'none',
    alignItems: 'flex-end', justifyContent: 'center',
    background: open ? 'rgba(0,0,0,.5)' : 'transparent',
    backdropFilter: open ? 'blur(3px)' : 'none',
    paddingTop: '4vh',
    pointerEvents: open ? 'auto' : 'none',
    opacity: open ? 1 : 0,
    transition: 'opacity .25s, background .25s',
  };

  return (
    <div style={ovStyle} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '100%', maxWidth: 900,
        background: 'var(--bg1)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 64px rgba(0,0,0,.25)',
        display: 'flex', flexDirection: 'column',
        height: '96vh', overflow: 'hidden',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--b2)', flexShrink: 0, background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--embo)' }}>
              <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
                {isDirty && (
                  <span style={{ fontSize: 10, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>غير محفوظ</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                {form.name.trim()
                  ? <span style={{ color: 'var(--em)', fontWeight: 600 }}>{form.name.length > 40 ? form.name.slice(0, 40) + '…' : form.name}</span>
                  : <span>بدون اسم</span>
                }
                {form.ref && <span style={{ color: 'var(--t4)', marginRight: 8 }}>#{form.ref}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* شريط الاكتمال */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>اكتمال النموذج</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 80, height: 5, borderRadius: 3, background: 'var(--b2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width .3s',
                    background: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? '#f59e0b' : 'var(--red)',
                    width: `${completeness}%`,
                  }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? '#f59e0b' : 'var(--red)' }}>
                  {completeness}%
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--b2)' }} />

            {/* Keyboard hint */}
            <div style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-keyboard" style={{ fontSize: 11 }} /> Ctrl+S
            </div>

            {/* زر الإغلاق */}
            <button
              onClick={handleClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', transition: 'all .15s' }}
              title="إغلاق (Esc)"
            >
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="tab-strip" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap', flexShrink: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', background: 'var(--bg2)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const dot      = tabDot(tab.id);
            const badge    = tabBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '11px 16px', fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--em)' : 'var(--t3)',
                  background: isActive ? 'var(--emb)' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--em)' : 'transparent'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto',
                  transition: 'color .15s, border-color .15s, background .15s',
                }}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                {tab.label}
                {badge !== null ? (
                  <span style={{ fontSize: 10, background: isActive ? 'var(--em)' : 'var(--b3)', color: isActive ? '#fff' : 'var(--t3)', padding: '0 5px', borderRadius: 10, fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px', height: 16 }}>
                    {badge}
                  </span>
                ) : (
                  dot !== 'empty' && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(dot), flexShrink: 0 }} />
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* ══ BODY ══ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin', background: 'var(--bg1)' }}>
          {/* Loading Lookups */}
          {lookupsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--r2)', background: 'var(--emb)', marginBottom: 16, fontSize: 12, color: 'var(--em)' }}>
              <i className="ti ti-loader" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} />
              جاري تحميل البيانات...
            </div>
          )}
          {/* API Error */}
          {apiError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 16, background: 'var(--redb)', border: '1px solid var(--redbo)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{apiError}</span>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          )}
          {tabContent[activeTab]()}
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg2)' }}>
          {/* ملخص سريع */}
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap', alignItems: 'center' }}>
            {form.name.trim() && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> اسم
              </span>
            )}
            {form.purchase_price_ht !== '' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {fmtDZD(form.purchase_price_ht)}
              </span>
            )}
            {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length} أسعار
              </span>
            )}
            {form.packagings.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.packagings.length} تعبئة
              </span>
            )}
            {form.images.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.images.length} صور
              </span>
            )}
            {isEdit && (productBarcodes as Barcode[]).length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {(productBarcodes as Barcode[]).length} باركود
              </span>
            )}
          </div>

          {/* أزرار التنقل + الحفظ */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {currentTabIdx > 0 && (
              <button
                onClick={() => switchTab(TAB_IDS[currentTabIdx - 1])}
                style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}
              >
                <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> السابق
              </button>
            )}
            {currentTabIdx < TAB_IDS.length - 1 && (
              <button
                onClick={() => switchTab(TAB_IDS[currentTabIdx + 1])}
                style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}
              >
                التالي <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
              </button>
            )}
            <div style={{ width: 1, height: 22, background: 'var(--b2)', margin: '0 2px' }} />
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              style={{ padding: '8px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              style={{
                padding: '8px 24px', borderRadius: 'var(--r2)', border: 'none',
                background: mutation.isPending ? 'var(--b3)' : 'var(--em)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'Tajawal, inherit', transition: 'background .15s',
                boxShadow: mutation.isPending ? 'none' : '0 2px 8px rgba(10,138,92,.3)',
              }}
            >
              {mutation.isPending
                ? <><i className="ti ti-loader" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> {isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}</>
              }
            </button>
          </div>
        </div>

      </div>
      <ConfirmDialog {...confirmDialogProps} />
      <CopyConfigModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onApply={handleCopyConfig}
        mode="inline"
      />
      <Suspense fallback={null}>
        <BarcodeScannerModal
          open={showBarcodeScanner}
          onScan={code => { set('barcode', code); setShowBarcodeScanner(false); }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <CameraCaptureModal
          open={showCamera}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          title="التقاط صورة للمنتج"
          hint="صوّب الكاميرا على المنتج واضغط زر الالتقاط — ستُرفع الصورة عند الحفظ"
        />
      </Suspense>
    </div>
  );
}