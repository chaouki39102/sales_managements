/**
 * ════════════════════════════════════════════════════════════════════════════
 * QuickSaleModal.tsx — مودل البيع السريع
 *
 * يُستخدم من:
 *   1. زر "بيع سريع" في الداشبورد
 *   2. زر "بيع سريع" في أي صفحة مستندات
 *
 * الفكرة: نموذج مبسّط لإنشاء فاتورة بيع + دفع فوري في خطوة واحدة.
 * لا حاجة لاختيار نوع المستند — دائماً FV (Facture de vente).
 *
 * التدفق:
 *   1. اختيار الزبون (اختياري — بيع نقدي بدون زبون)
 *   2. إضافة الأسطر (منتج + كمية)
 *   3. اختيار طريقة الدفع + المبلغ (اختياري)
 *   4. الحفظ → POST /documents + POST /payments (إذا كان دفع فوري)
 *
 * ✅ رقم الوثيقة يُولَّد تلقائياً من الـ Backend (NumberingSeries)
 * ✅ حركة المخزون تُنشأ تلقائياً عبر StockMovementObserver
 * ✅ الخزينة تُحدَّث تلقائياً عند إضافة الدفع
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id:                        number;
  name:                      string;
  ref?:                      string | null;
  default_selling_price_ht?: number | null;
  tva?:                      { id: number; rate: number } | null;
  unit?:                     { id: number; symbol: string } | null;
  manages_stock?:            boolean;
}

interface PaymentMode {
  id:   number;
  name: string;
  code: string;
}

interface TreasuryAccount {
  id:         number;
  name:       string;
  code:       string;
  is_default: boolean;
}

interface QuickLine {
  product_id: string;
  quantity:   number;
  price:      number;
  tva_rate:   number;
  _product?:  Product;
}

interface QuickPayment {
  enabled:             boolean;
  payment_mode_id:     string;
  treasury_account_id: string;
  amount:              number;       // 0 = يعني كامل المبلغ
  reference:           string;
  payment_date:        string;
}

interface SuccessState {
  document_number: string;
  net_to_pay:      number;
  paid:            number;
  remaining:       number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0]; }

function fmtDZD(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function extractList(d: unknown): unknown[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (typeof d === 'object' && d !== null) {
    const arr = (d as Record<string, unknown>).data;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuickSaleModalProps {
  open:    boolean;
  onClose: () => void;
  onSaved: (doc: SuccessState) => void;
}

export default function QuickSaleModal({ open, onClose, onSaved }: QuickSaleModalProps) {
  const slug   = useActiveSlug();
  const qc     = useQueryClient();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: rawProducts = [], isLoading: loadingProds } = useQuery({
    queryKey: [slug, 'quick-sale-products'],
    queryFn:  () => apiGet<unknown>('/products', {
      per_page: 500, include: 'unit,tva',
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawParties = [] } = useQuery({
    queryKey: [slug, 'quick-sale-customers'],
    queryFn:  () => apiGet<unknown>('/customers', { per_page: 500 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawPaymentModes = [] } = useQuery({
    queryKey: [slug, 'quick-sale-payment-modes'],
    queryFn:  () => apiGet<unknown>('/payment-modes', {
      per_page: 100, include: 'treasuryAccounts',
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawTreasuryAccounts = [] } = useQuery({
    queryKey: [slug, 'quick-sale-treasury'],
    queryFn:  () => apiGet<unknown>('/treasury-accounts', {
      per_page: 100,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawWarehouses = [] } = useQuery({
    queryKey: [slug, 'quick-sale-warehouses'],
    queryFn:  () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });

  const products        = rawProducts        as Product[];
  const parties         = rawParties         as Record<string, unknown>[];
  const paymentModes    = rawPaymentModes    as PaymentMode[];
  const treasuryAccounts = rawTreasuryAccounts as TreasuryAccount[];
  const warehouses      = rawWarehouses      as Record<string, unknown>[];

  // ── Defaults ──────────────────────────────────────────────────────────────
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : warehouses[0] ? String((warehouses[0] as Record<string, unknown>).id) : '';
  }, [warehouses]);

  const defaultPaymentModeId = useMemo(() => {
    const cash = paymentModes.find(pm => ['cash', 'espèces', 'نقدي'].some(k => String(pm.name).toLowerCase().includes(k)));
    return cash ? String(cash.id) : paymentModes[0] ? String(paymentModes[0].id) : '';
  }, [paymentModes]);

  const defaultTreasuryId = useMemo(() => {
    const def = treasuryAccounts.find(t => t.is_default);
    return def ? String(def.id) : treasuryAccounts[0] ? String(treasuryAccounts[0].id) : '';
  }, [treasuryAccounts]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [partyId,      setPartyId]      = useState('');
  const [warehouseId,  setWarehouseId]  = useState('');
  const [docDate,      setDocDate]      = useState(today());
  const [notes,        setNotes]        = useState('');
  const [lines,        setLines]        = useState<QuickLine[]>([]);
  const [payment,      setPayment]      = useState<QuickPayment>({
    enabled: true, payment_mode_id: '', treasury_account_id: '',
    amount: 0, reference: '', payment_date: today(),
  });
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [apiErr,   setApiErr]   = useState('');
  const [success,  setSuccess]  = useState<SuccessState | null>(null);

  // Reset عند الفتح
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(today());
      setNotes('');
      setLines([]);
      setErrors({});
      setApiErr('');
      setSuccess(null);
      setPayment({
        enabled: true, payment_mode_id: '',
        treasury_account_id: '', amount: 0,
        reference: '', payment_date: today(),
      });
    }
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, [open]);

  // تعبئة defaults بعد تحميل البيانات
  useEffect(() => {
    if (open) {
      if (!warehouseId && defaultWarehouseId) setWarehouseId(defaultWarehouseId);
      if (!payment.payment_mode_id && defaultPaymentModeId)
        setPayment(p => ({ ...p, payment_mode_id: defaultPaymentModeId }));
      if (!payment.treasury_account_id && defaultTreasuryId)
        setPayment(p => ({ ...p, treasury_account_id: defaultTreasuryId }));
    }
  }, [open, defaultWarehouseId, defaultPaymentModeId, defaultTreasuryId]);

  // ── Line helpers ──────────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    setLines(prev => [...prev, {
      product_id: '', quantity: 1, price: 0, tva_rate: 19,
    }]);
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback((idx: number, field: keyof QuickLine, value: unknown) => {
    setLines(prev => {
      const next = [...prev];
      const L = { ...next[idx] };

      if (field === 'product_id') {
        L.product_id = String(value);
        const p = products.find(pr => String(pr.id) === String(value));
        if (p) {
          L._product = p;
          L.price    = parseFloat(String(p.default_selling_price_ht ?? 0)) || 0;
          L.tva_rate = p.tva?.rate ?? 19;
        }
      } else if (field === 'quantity') {
        L.quantity = parseFloat(String(value)) || 1;
      } else if (field === 'price') {
        L.price = parseFloat(String(value)) || 0;
      } else if (field === 'tva_rate') {
        L.tva_rate = parseFloat(String(value)) || 0;
      }

      next[idx] = L;
      return next;
    });
  }, [products]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let ht = 0, tva = 0;
    lines.forEach(l => {
      const lineHt  = l.price * l.quantity;
      const lineTva = lineHt * (l.tva_rate / 100);
      ht  += lineHt;
      tva += lineTva;
    });
    const ttc    = ht + tva;
    const stamp  = ttc >= 30_000 ? Math.min(Math.ceil(ttc * 0.01), 2_500) : 0;
    const netPay = ttc + stamp;
    return { ht, tva, ttc, stamp, netPay };
  }, [lines]);

  // المبلغ الفعلي للدفع
  const payAmount = useMemo(() => {
    return payment.amount > 0 ? payment.amount : totals.netPay;
  }, [payment.amount, totals.netPay]);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!warehouseId)  errs.warehouse_id = 'المستودع إلزامي';
    if (lines.length === 0) errs.lines = 'أضف سطراً واحداً على الأقل';

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) { errs.lines = `السطر ${i + 1}: المنتج إلزامي`; break; }
      if (l.quantity <= 0) { errs.lines = `السطر ${i + 1}: الكمية يجب أن تكون > 0`; break; }
    }

    if (payment.enabled) {
      if (!payment.payment_mode_id)     errs.payment_mode = 'طريقة الدفع إلزامية';
      if (!payment.treasury_account_id) errs.treasury     = 'حساب الخزينة إلزامي';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [warehouseId, lines, payment]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      // 1. إنشاء الوثيقة (FV — فاتورة بيع)
      const docPayload = {
        document_type_id: null, // الـ Backend يجلب FV بواسطة code
        document_type_code: 'FV', // نُمرره لأن CommercialDocumentService يحتاجه
        party_id:    partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id:          parseInt(l.product_id),
          quantity:            l.quantity,
          unit_price_ht:       l.price,
          tva_rate:            l.tva_rate,
          discount_percentage: 0,
        })),
      };

      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docId  = Number((docRes as Record<string, unknown>).id
        ?? (docRes as Record<string, unknown>).data?.id);
      const docNum = String((docRes as Record<string, unknown>).document_number
        ?? (docRes as Record<string, unknown>).data?.document_number ?? '—');

      // 2. دفع فوري (اختياري)
      if (payment.enabled && docId) {
        const paidAmt = payment.amount > 0 ? payment.amount : totals.netPay;
        await apiPost('/payments', {
          commercial_document_id: docId,
          payment_mode_id:        parseInt(payment.payment_mode_id),
          treasury_account_id:    parseInt(payment.treasury_account_id),
          amount:                 paidAmt,
          payment_date:           payment.payment_date || docDate,
          reference:              payment.reference    || null,
          notes:                  null,
        });
      }

      return {
        document_number: docNum,
        net_to_pay:      totals.netPay,
        paid:            payment.enabled ? payAmount : 0,
        remaining:       payment.enabled ? Math.max(0, totals.netPay - payAmount) : totals.netPay,
      };
    },

    onSuccess: (state) => {
      // إبطال الكاش
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      // إغلاق بعد 2.5 ثانية
      successTimer.current = setTimeout(() => {
        onSaved(state);
      }, 2_500);
    },

    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      const msg = errs
        ? Object.values(errs).flat().join(' | ')
        : String(err?.message ?? 'فشل الحفظ');
      setApiErr(msg);
    },
  });

  const handleSave = useCallback(() => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  if (!open) return null;

  const isPending = saveMut.isPending;

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={!isPending ? onClose : undefined}
    >
      <div
        style={{
          width: '100%', maxWidth: 680,
          background: 'var(--bg1)', borderRadius: 'var(--r3)',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '95vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--em) 0%, color-mix(in srgb, var(--em) 70%, var(--blue)) 100%)',
          borderRadius: 'var(--r3) var(--r3) 0 0', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--r2)',
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-bolt" style={{ fontSize: 18, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>
                بيع سريع
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
                فاتورة بيع (FV) — رقم الوثيقة يُولَّد تلقائياً
              </div>
            </div>
          </div>
          <button
            onClick={!isPending ? onClose : undefined}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid rgba(255,255,255,.3)',
              background: 'rgba(255,255,255,.15)',
              color: 'white', cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Success */}
          {success && (
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r2)',
              background: 'var(--greenb)', border: '1px solid var(--green)',
              color: 'var(--green)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-check-circle" />
                تم إنشاء الفاتورة {success.document_number}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                <span>المبلغ المستحق: <b>{fmtDZD(success.net_to_pay)} دج</b></span>
                {success.paid > 0 && <span>المدفوع: <b style={{ color: 'var(--green)' }}>{fmtDZD(success.paid)} دج</b></span>}
                {success.remaining > 0 && <span>المتبقي: <b style={{ color: 'var(--red)' }}>{fmtDZD(success.remaining)} دج</b></span>}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>سيُغلق تلقائياً...</div>
            </div>
          )}

          {/* API Error */}
          {apiErr && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--red)',
              color: 'var(--red)', fontSize: 13,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <i className="ti ti-alert-circle" style={{ marginTop: 1 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* ── Row 1: زبون + تاريخ + مستودع ───────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* الزبون */}
            <div>
              <div style={lblStyle}>الزبون</div>
              <select
                value={partyId}
                onChange={e => setPartyId(e.target.value)}
                style={inpStyle()}
                disabled={isPending}
              >
                <option value="">— بيع نقدي —</option>
                {parties.map(p => (
                  <option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>
                ))}
              </select>
            </div>

            {/* التاريخ */}
            <div>
              <div style={lblStyle}>التاريخ</div>
              <input type="date" value={docDate}
                onChange={e => setDocDate(e.target.value)}
                style={inpStyle()} disabled={isPending}
              />
            </div>

            {/* المستودع */}
            <div>
              <div style={lblStyle}>المستودع <span style={{ color: 'var(--red)' }}>*</span></div>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                style={inpStyle(!!errors.warehouse_id)}
                disabled={isPending}
              >
                <option value="">— اختر —</option>
                {warehouses.map(w => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}{w.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && <ErrMsg msg={errors.warehouse_id} />}
            </div>
          </div>

          {/* ── أسطر المنتجات ──────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                المنتجات
                {lines.length > 0 && (
                  <span style={{
                    marginRight: 6, padding: '1px 7px', borderRadius: 99,
                    background: 'var(--em)', color: 'white',
                    fontSize: 11, fontWeight: 700,
                  }}>{lines.length}</span>
                )}
              </div>
              {errors.lines && <ErrMsg msg={errors.lines} />}
            </div>

            {loadingProds ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--t4)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري تحميل المنتجات...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lines.map((line, idx) => {
                  const { ht, tva, ttc } = calcLine(line);
                  return (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                      gap: 6, alignItems: 'center',
                      padding: '8px 10px',
                      background: 'var(--bg2)', borderRadius: 'var(--r2)',
                      border: '1px solid var(--b1)',
                    }}>
                      {/* المنتج */}
                      <select
                        value={line.product_id}
                        onChange={e => updateLine(idx, 'product_id', e.target.value)}
                        style={{
                          ...cellStyle(),
                          textAlign: 'right',
                          border: !line.product_id ? '1px solid var(--red)' : '1px solid var(--b3)',
                        }}
                        disabled={isPending}
                      >
                        <option value="">— اختر منتجاً —</option>
                        {products.map(p => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name}{p.ref ? ` (${p.ref})` : ''}
                          </option>
                        ))}
                      </select>

                      {/* الكمية */}
                      <input type="number" min="0.001" step="1"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        style={{ ...cellStyle(), border: line.quantity <= 0 ? '1px solid var(--red)' : '1px solid var(--b3)' }}
                        placeholder="الكمية"
                        disabled={isPending}
                      />

                      {/* السعر */}
                      <input type="number" min="0" step="0.01"
                        value={line.price}
                        onChange={e => updateLine(idx, 'price', e.target.value)}
                        style={cellStyle()}
                        placeholder="السعر HT"
                        disabled={isPending}
                      />

                      {/* TVA% */}
                      <input type="number" min="0" max="100" step="0.01"
                        value={line.tva_rate}
                        onChange={e => updateLine(idx, 'tva_rate', e.target.value)}
                        style={cellStyle()}
                        placeholder="TVA%"
                        disabled={isPending}
                      />

                      {/* TTC */}
                      <div style={{
                        textAlign: 'center', fontSize: 12, fontWeight: 700,
                        color: 'var(--em)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {fmtDZD(ttc)}
                      </div>

                      {/* حذف */}
                      <button onClick={() => removeLine(idx)} disabled={isPending}
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          border: '1px solid var(--b3)', background: 'var(--bg1)',
                          color: 'var(--red)', cursor: isPending ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  );
                })}

                <button onClick={addLine} disabled={isPending}
                  style={{
                    padding: '8px', borderRadius: 'var(--r2)',
                    border: '1px dashed var(--em)', background: 'transparent',
                    color: 'var(--em)', cursor: isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <i className="ti ti-plus" /> إضافة منتج
                </button>
              </div>
            )}
          </div>

          {/* ── الإجماليات ─────────────────────────────────────────── */}
          {lines.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <div style={{
                width: 280, display: 'flex', flexDirection: 'column', gap: 5,
                padding: '12px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b1)',
              }}>
                <TotRow label="إجمالي HT"    value={fmtDZD(totals.ht)} />
                <TotRow label="TVA"          value={fmtDZD(totals.tva)} />
                {totals.stamp > 0 && (
                  <TotRow label="الطابع الجبائي" value={fmtDZD(totals.stamp)} color="var(--gold)" />
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 8, marginTop: 4, borderTop: '2px solid var(--b2)',
                  fontSize: 15, fontWeight: 800,
                }}>
                  <span style={{ color: 'var(--t1)' }}>المستحق</span>
                  <span style={{ color: 'var(--em)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDZD(totals.netPay)} دج
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── الدفع الفوري ──────────────────────────────────────── */}
          <div style={{
            borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
            overflow: 'hidden',
          }}>
            {/* رأس قسم الدفع */}
            <div
              style={{
                padding: '10px 14px',
                background: payment.enabled ? 'var(--greenb)' : 'var(--bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', userSelect: 'none',
              }}
              onClick={() => setPayment(p => ({ ...p, enabled: !p.enabled }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: payment.enabled ? 'var(--green)' : 'var(--b3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}>
                  {payment.enabled && (
                    <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />
                  )}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: payment.enabled ? 'var(--green)' : 'var(--t3)',
                }}>
                  دفع فوري
                </span>
                {payment.enabled && totals.netPay > 0 && (
                  <span style={{
                    fontSize: 11, padding: '1px 8px', borderRadius: 99,
                    background: 'var(--green)', color: 'white', fontWeight: 700,
                  }}>
                    {fmtDZD(payAmount)} دج
                  </span>
                )}
              </div>
              <i
                className={`ti ti-chevron-${payment.enabled ? 'up' : 'down'}`}
                style={{ color: 'var(--t4)', fontSize: 14 }}
              />
            </div>

            {/* تفاصيل الدفع */}
            {payment.enabled && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* طريقة الدفع */}
                  <div>
                    <div style={lblStyle}>طريقة الدفع <span style={{ color: 'var(--red)' }}>*</span></div>
                    <select
                      value={payment.payment_mode_id}
                      onChange={e => setPayment(p => ({ ...p, payment_mode_id: e.target.value }))}
                      style={inpStyle(!!errors.payment_mode)}
                      disabled={isPending}
                    >
                      <option value="">— اختر —</option>
                      {paymentModes.map(pm => (
                        <option key={pm.id} value={String(pm.id)}>{pm.name}</option>
                      ))}
                    </select>
                    {errors.payment_mode && <ErrMsg msg={errors.payment_mode} />}
                  </div>

                  {/* حساب الخزينة */}
                  <div>
                    <div style={lblStyle}>حساب الخزينة <span style={{ color: 'var(--red)' }}>*</span></div>
                    <select
                      value={payment.treasury_account_id}
                      onChange={e => setPayment(p => ({ ...p, treasury_account_id: e.target.value }))}
                      style={inpStyle(!!errors.treasury)}
                      disabled={isPending}
                    >
                      <option value="">— اختر —</option>
                      {treasuryAccounts.map(ta => (
                        <option key={ta.id} value={String(ta.id)}>
                          {ta.name}{ta.is_default ? ' ★' : ''}
                        </option>
                      ))}
                    </select>
                    {errors.treasury && <ErrMsg msg={errors.treasury} />}
                  </div>

                  {/* المبلغ */}
                  <div>
                    <div style={lblStyle}>
                      المبلغ المدفوع
                      <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>
                        (0 = كامل المبلغ)
                      </span>
                    </div>
                    <input
                      type="number" min="0" step="0.01"
                      value={payment.amount || ''}
                      placeholder={`${fmtDZD(totals.netPay)} (كامل)`}
                      onChange={e => setPayment(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                      style={inpStyle()}
                      disabled={isPending}
                    />
                  </div>

                  {/* تاريخ الدفع */}
                  <div>
                    <div style={lblStyle}>تاريخ الدفع</div>
                    <input
                      type="date" value={payment.payment_date}
                      onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))}
                      style={inpStyle()}
                      disabled={isPending}
                    />
                  </div>

                  {/* المرجع */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={lblStyle}>المرجع / رقم الشيك</div>
                    <input
                      type="text" value={payment.reference}
                      placeholder="اختياري..."
                      onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))}
                      style={inpStyle()}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* ملخص الدفع */}
                {totals.netPay > 0 && (
                  <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap',
                    padding: '8px 12px', borderRadius: 'var(--r2)',
                    background: 'var(--bg2)', fontSize: 12,
                  }}>
                    <span>المستحق: <b>{fmtDZD(totals.netPay)} دج</b></span>
                    <span style={{ color: 'var(--green)' }}>المدفوع: <b>{fmtDZD(payAmount)} دج</b></span>
                    {payAmount < totals.netPay && (
                      <span style={{ color: 'var(--red)' }}>المتبقي: <b>{fmtDZD(totals.netPay - payAmount)} دج</b></span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ملاحظات */}
          <div>
            <div style={lblStyle}>ملاحظات</div>
            <textarea
              rows={2} value={notes} placeholder="ملاحظات اختيارية..."
              onChange={e => setNotes(e.target.value)}
              style={{ ...inpStyle(), resize: 'vertical' }}
              disabled={isPending}
            />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex',
          gap: 8, justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '0 0 var(--r3) var(--r3)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {lines.length > 0 && (
              <span>
                {lines.length} منتج
                {' · '}
                <span style={{ fontWeight: 700, color: 'var(--em)' }}>
                  {fmtDZD(totals.netPay)} دج
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={isPending}
              style={{
                padding: '8px 16px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg1)',
                color: 'var(--t2)', cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>
              إلغاء
            </button>
            <button onClick={handleSave}
              disabled={isPending || !!success}
              style={{
                padding: '8px 22px', borderRadius: 'var(--r2)',
                border: 'none',
                background: success
                  ? 'var(--green)'
                  : 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
                color: 'white', cursor: isPending || !!success ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: isPending ? 0.7 : 1,
              }}>
              {isPending ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
              ) : success ? (
                <><i className="ti ti-check" /> تم الحفظ</>
              ) : (
                <><i className="ti ti-bolt" /> تأكيد البيع</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function calcLine(l: QuickLine) {
  const ht  = l.price * l.quantity;
  const tva = ht * (l.tva_rate / 100);
  return { ht, tva, ttc: ht + tva };
}

function TotRow({ label, value, color = 'var(--t3)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{msg}</div>;
}

const lblStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--t3)',
  display: 'block', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: 0.4,
};

function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
  };
}

function cellStyle(): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '5px 6px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)',
    background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 12, fontFamily: 'Tajawal, sans-serif',
    outline: 'none', textAlign: 'center',
  };
}
