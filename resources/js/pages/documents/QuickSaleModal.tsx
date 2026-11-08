// resources/js/pages/documents/QuickSaleModal.tsx
// QuickSaleModal — مودل البيع السريع مع التحسينات:
// - تحميل حساب الخزينة بشكل صحيح
// - زر "تعبئة المبلغ المستحق"
// - التنقل بالـ Enter: منتج ← كمية ← سطر جديد
// - اختصار F8 للحفظ
// - الدفع فوري ونقدي بشكل افتراضي

//
// التقسيم: quick-sale/ (المكونات + الأنواع + الأنماط) و hooks/useQuickSaleForm + hooks/useQuickSaleLookups

import { useQuickSaleForm } from './hooks/useQuickSaleForm';
import QuickSaleHeader from './quick-sale/QuickSaleHeader';
import QuickSaleSuccessBanner from './quick-sale/QuickSaleSuccessBanner';
import QuickSaleTopFields from './quick-sale/QuickSaleTopFields';
import QuickSaleLines from './quick-sale/QuickSaleLines';
import QuickSaleTotalsBox from './quick-sale/QuickSaleTotalsBox';
import QuickSalePayment from './quick-sale/QuickSalePayment';
import QuickSaleFooter from './quick-sale/QuickSaleFooter';
import { lblStyle, inpStyle } from './quick-sale/quickSale.styles';
import type { SuccessState } from './quick-sale/quickSale.types';

interface QuickSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: SuccessState) => void;
}

export default function QuickSaleModal({ open, onClose, onSaved }: QuickSaleModalProps) {
  const {
    productInputRefs,
    quantityInputRefs,
    loadingProds,
    products,
    parties,
    paymentModes,
    treasuryAccounts,
    warehouses,
    partyId, setPartyId,
    warehouseId, setWarehouseId,
    docDate, setDocDate,
    notes, setNotes,
    lines,
    errors,
    apiErr,
    success,
    paymentLocal, setPaymentLocal,
    addLine,
    removeLine,
    updateLine,
    totals,
    getProductLabel,
    getProductSub,
    getPartyLabel,
    handleQuantityEnter,
    fillFullAmount,
    finalPayAmount,
    handleSave,
    isPending,
  } = useQuickSaleForm({ open, onSaved });

  // ========== JSX ==========
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: open ? 'rgba(0,0,0,.6)' : 'transparent',
        backdropFilter: open ? 'blur(5px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        pointerEvents: open ? 'auto' : 'none' as any,
        opacity: open ? 1 : 0,
        transition: 'opacity .25s, background .25s',
      }}
      onClick={!isPending && open ? onClose : undefined}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'var(--bg1)',
          borderRadius: 'var(--r3)',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <QuickSaleHeader isPending={isPending} onClose={onClose} />

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success */}
          {success && <QuickSaleSuccessBanner success={success} />}

          {/* API Error */}
          {apiErr && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--r2)',
                background: 'var(--redb)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                fontSize: 13,
                display: 'flex',
                gap: 8,
              }}
            >
              <i className="ti ti-alert-circle" style={{ marginTop: 1 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* Row 1: Customer + Date + Warehouse */}
          <QuickSaleTopFields
            parties={parties}
            partyId={partyId}
            setPartyId={setPartyId}
            getPartyLabel={getPartyLabel}
            docDate={docDate}
            setDocDate={setDocDate}
            warehouseId={warehouseId}
            setWarehouseId={setWarehouseId}
            warehouses={warehouses}
            errors={errors}
            isPending={isPending}
          />

          {/* Lines */}
          <QuickSaleLines
            lines={lines}
            errors={errors}
            loadingProds={loadingProds}
            products={products}
            isPending={isPending}
            addLine={addLine}
            updateLine={updateLine}
            removeLine={removeLine}
            getProductLabel={getProductLabel}
            getProductSub={getProductSub}
            productInputRefs={productInputRefs}
            quantityInputRefs={quantityInputRefs}
            handleQuantityEnter={handleQuantityEnter}
          />

          {/* Totals */}
          {lines.length > 0 && <QuickSaleTotalsBox totals={totals} />}

          {/* Payment section (friendly UI) */}
          <QuickSalePayment
            totals={totals}
            finalPayAmount={finalPayAmount}
            paymentLocal={paymentLocal}
            setPaymentLocal={setPaymentLocal}
            paymentModes={paymentModes}
            treasuryAccounts={treasuryAccounts}
            errors={errors}
            isPending={isPending}
            fillFullAmount={fillFullAmount}
          />

          {/* Notes */}
          <div>
            <div style={lblStyle}>ملاحظات</div>
            <textarea
              rows={2}
              value={notes}
              placeholder="ملاحظات اختيارية..."
              onChange={e => setNotes(e.target.value)}
              style={{ ...inpStyle(), resize: 'vertical' }}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Footer */}
        <QuickSaleFooter
          lines={lines}
          totals={totals}
          isPending={isPending}
          success={success}
          onClose={onClose}
          handleSave={handleSave}
        />
      </div>
    </div>
  );
}
