// resources/js/pages/documents/QuickSaleModal.tsx
// QuickSaleModal — مودل البيع السريع مع التحسينات:
// - تحميل حساب الخزينة بشكل صحيح
// - زر "تعبئة المبلغ المستحق"
// - التنقل بالـ Enter: منتج ← كمية ← سطر جديد
// - اختصار F8 للحفظ
// - الدفع فوري ونقدي بشكل افتراضي

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  ref?: string | null;
  default_selling_price_ht?: number | null;
  tva?: { id: number; rate: number } | null;
  unit?: { id: number; symbol: string } | null;
  manages_stock?: boolean;
  current_stock?: number | null;
}

interface PaymentMode {
  id: number;
  name: string;
  code: string;
}

interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}

interface QuickLine {
  product_id: string;
  quantity: number;
  price: number;
  tva_rate: number;
  _product?: Product;
}

interface SuccessState {
  document_number: string;
  net_to_pay: number;
  paid: number;
  remaining: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function defaultDocDate(selectedYear?: { start_date?: string; end_date?: string }): string {
  const d = today();
  if (selectedYear?.start_date && selectedYear?.end_date) {
    const s = selectedYear.start_date.substring(0, 10);
    const e = selectedYear.end_date.substring(0, 10);
    if (d >= s && d <= e) return d;
    return e;
  }
  return d;
}

function fmtDZD(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ─── SearchSelect ────────────────────────────────────────────────────────────

interface SearchSelectProps<T extends Record<string, unknown>> {
  items: T[];
  value: string;
  onChange: (id: string, item?: T) => void;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string | null;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onEnter?: () => void;
}

function SearchSelect<T extends Record<string, unknown>>({
  items,
  value,
  onChange,
  getLabel,
  getSub,
  placeholder,
  disabled,
  error,
  inputRef,
  onEnter,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  const selected = items.find(i => String(i.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => getLabel(i).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: T) => {
    onChange(String(item.id), item);
    setOpen(false);
    setQuery('');
    // بعد اختيار المنتج، ننتقل إلى حقل الكمية (يتم التعامل معه من خلال المكون الأب)
    setTimeout(() => {
      if (finalInputRef.current) {
        const quantityInput = finalInputRef.current.closest('tr')?.querySelector('input[type="number"]') as HTMLInputElement;
        quantityInput?.focus();
      }
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0 && query.trim()) {
      e.preventDefault();
      handleSelect(filtered[0]);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...inpStyle(error),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: selected ? 'var(--t1)' : 'var(--t4)',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? getLabel(selected) : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {selected && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t4)',
                padding: '0 2px',
                fontSize: 12,
              }}
            >
              <i className="ti ti-x" />
            </button>
          )}
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ color: 'var(--t4)', fontSize: 12 }}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            zIndex: 900,
            background: 'var(--bg1)',
            border: '1px solid var(--b3)',
            borderRadius: 'var(--r2)',
            boxShadow: 'var(--shadow2)',
            marginTop: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>
            <input
              ref={finalInputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="بحث..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)',
                background: 'var(--bg2)',
                color: 'var(--t1)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Tajawal, sans-serif',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--t4)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                لا توجد نتائج
              </div>
            ) : (
              filtered.slice(0, 60).map(item => {
                const sub = getSub?.(item);
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      background: String(item.id) === value ? 'var(--emb)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => {
                      if (String(item.id) !== value)
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        String(item.id) === value ? 'var(--emb)' : 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--t1)' }}>{getLabel(item)}</span>
                    {sub && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--t4)',
                          flexShrink: 0,
                          marginRight: 8,
                        }}
                      >
                        {sub}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuickSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: SuccessState) => void;
}

export default function QuickSaleModal({ open, onClose, onSaved }: QuickSaleModalProps) {
  // ========== HOOKS (all at top) ==========
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: fiscalStampRaw } = useQuery({
    queryKey: [slug, 'settings', 'fiscal_stamp_enabled'],
    queryFn:  () => settingsApi.getValue('fiscal_stamp_enabled'),
    enabled:  !!slug && open,
    staleTime: 60_000,
  });
  const fiscalStampEnabled = useMemo(() => {
    const v = fiscalStampRaw?.value;
    return v === undefined || v === true || v === 'true' || v === 1 || v === '1';
  }, [fiscalStampRaw]);

  // Queries
  const { data: rawProducts = [], isLoading: loadingProds } = useQuery({
    queryKey: [slug, 'quick-sale-products'],
    queryFn: () =>
      apiGet<unknown>('/products', { per_page: 500, include: 'unit,tva' }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawParties = [] } = useQuery({
    queryKey: [slug, 'quick-sale-customers'],
    queryFn: () => apiGet<unknown>('/customers', { per_page: 500 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawPaymentModes = [] } = useQuery({
    queryKey: [slug, 'quick-sale-payment-modes'],
    queryFn: () => apiGet<unknown>('/payment-modes', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawTreasuryAccounts = [] } = useQuery({
    queryKey: [slug, 'quick-sale-treasury'],
    queryFn: () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: settingsDict } = useQuery({
    queryKey: [slug, 'settings-dict'],
    queryFn: () => settingsApi.list(),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawWarehouses = [] } = useQuery({
    queryKey: [slug, 'quick-sale-warehouses'],
    queryFn: () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const products = rawProducts as Product[];
  const parties = rawParties as Record<string, unknown>[];
  const paymentModes = rawPaymentModes as PaymentMode[];
  const treasuryAccounts = rawTreasuryAccounts as TreasuryAccount[];
  const warehouses = rawWarehouses as Record<string, unknown>[];

  // Defaults
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : warehouses[0] ? String(warehouses[0].id) : '';
  }, [warehouses]);

  // الدائم: طريقة الدفع نقدي (cash) وحساب الخزينة الأول
  const defaultPaymentModeId = useMemo(() => {
    const fromSettings = settingsDict?.default_payment_mode_id?.value;
    if (fromSettings) {
      const found = paymentModes.find(pm => pm.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const cash = paymentModes.find(
      pm => pm.name.toLowerCase().includes('نقد') || pm.code?.toLowerCase() === 'cash'
    );
    return cash ? String(cash.id) : paymentModes[0] ? String(paymentModes[0].id) : '';
  }, [paymentModes, settingsDict]);

  const defaultTreasuryId = useMemo(() => {
    const fromSettings = settingsDict?.default_treasury_account_id?.value;
    if (fromSettings) {
      const found = treasuryAccounts.find(t => t.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const def = treasuryAccounts.find(t => t.is_default);
    return def ? String(def.id) : treasuryAccounts[0] ? String(treasuryAccounts[0].id) : '';
  }, [treasuryAccounts, settingsDict]);

  // State
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [docDate, setDocDate] = useState(defaultDocDate(selectedYear));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuickLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Effects for reset
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(defaultDocDate(selectedYear));
      setNotes('');
      setLines([{ product_id: '', quantity: 1, price: 0, tva_rate: 19 }]);
      setErrors({});
      setApiErr('');
      setSuccess(null);
      setWarehouseId(defaultWarehouseId);
      setPaymentLocal(p => ({
        ...p,
        payment_mode_id: defaultPaymentModeId,
        treasury_account_id: defaultTreasuryId,
        amount: 0,
        payment_date: defaultDocDate(selectedYear),
      }));
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [open, defaultWarehouseId, selectedYear]);

  // Line helpers — use ref to avoid addLine depending on lines.length
  const linesLenRef = useRef(0);
  linesLenRef.current = lines.length;

  const addLine = useCallback(() => {
    setLines(prev => [...prev, { product_id: '', quantity: 1, price: 0, tva_rate: 19 }]);
    setTimeout(() => {
      const input = productInputRefs.current[linesLenRef.current];
      input?.focus();
    }, 50);
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback(
    (idx: number, field: keyof QuickLine, value: unknown) => {
      setLines(prev => {
        const next = [...prev];
        const L = { ...next[idx] };
        if (field === 'product_id') {
          L.product_id = String(value);
          const p = products.find(pr => String(pr.id) === String(value));
          if (p) {
            L._product = p;
            L.price = parseFloat(String(p.default_selling_price_ht ?? 0)) || 0;
            L.tva_rate = p.tva?.rate ?? 19;
          } else {
            L._product = undefined;
            L.price = 0;
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
    },
    [products]
  );

  // Totals
  const totals = useMemo(() => {
    let ht = 0,
      tva = 0;
    lines.forEach(l => {
      const lineHt = l.price * l.quantity;
      const lineTva = lineHt * (l.tva_rate / 100);
      ht += lineHt;
      tva += lineTva;
    });
    const ttc = ht + tva;
    const stamp = !fiscalStampEnabled ? 0 : (ttc <= 0 ? 0 : Math.round(Math.max(5, Math.min(ttc * 0.01, 2_500)) * 100) / 100);
    const netPay = ttc + stamp;
    return { ht, tva, ttc, stamp, netPay };
  }, [lines, fiscalStampEnabled]);

  // Validation
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!warehouseId) errs.warehouse_id = 'المستودع إلزامي';
    if (lines.length === 0) errs.lines = 'أضف سطراً واحداً على الأقل';

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) {
        errs.lines = `السطر ${i + 1}: المنتج إلزامي`;
        break;
      }
      if (l.quantity <= 0) {
        errs.lines = `السطر ${i + 1}: الكمية يجب أن تكون > 0`;
        break;
      }
      const prod = products.find(p => String(p.id) === l.product_id);
      if (prod?.manages_stock && prod.current_stock != null && l.quantity > prod.current_stock) {
        errs.lines = `السطر ${i + 1}: الكمية (${l.quantity}) تتجاوز المخزون المتاح (${prod.current_stock})`;
        break;
      }
    }

    // التحقق من وجود حساب خزينة (تم تعبئته افتراضياً)
    if (!paymentLocal.treasury_account_id) {
      errs.treasury = 'حساب الخزينة إلزامي';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [warehouseId, lines, products, paymentLocal.treasury_account_id]);

  // Getters for SearchSelect
  const getProductLabel = useCallback(
    (p: Product) => `${p.name}${p.ref ? ` (${p.ref})` : ''}`,
    []
  );
  const getProductSub = useCallback((p: Product): string | null => {
    if (!p.manages_stock || p.current_stock == null) return null;
    const color = p.current_stock <= 0 ? '🔴' : p.current_stock <= 5 ? '🟡' : '🟢';
    return `${color} ${p.current_stock} ${p.unit?.symbol ?? ''}`;
  }, []);
  const getPartyLabel = useCallback((p: Record<string, unknown>) => String(p.name), []);

  // معالجة Enter في حقل الكمية: إضافة سطر جديد
  const handleQuantityEnter = useCallback(
    (idx: number) => {
      if (idx === linesLenRef.current - 1) {
        addLine();
      } else {
        const nextInput = productInputRefs.current[idx + 1];
        nextInput?.focus();
      }
    },
    [addLine]
  );

  // Fill payment amount with full due amount
  const fillFullAmount = useCallback(() => {
    setPaymentLocal(prev => ({ ...prev, amount: totals.netPay }));
  }, [totals.netPay]);

  // Payment state — synced with defaults when queries resolve
  const [paymentLocal, setPaymentLocal] = useState({
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0,
    reference: '',
    payment_date: defaultDocDate(selectedYear),
  });

  // Sync paymentLocal with defaults after queries resolve
  useEffect(() => {
    if (defaultPaymentModeId && defaultTreasuryId) {
      setPaymentLocal(prev => ({
        ...prev,
        payment_mode_id: defaultPaymentModeId,
        treasury_account_id: defaultTreasuryId,
      }));
    }
  }, [defaultPaymentModeId, defaultTreasuryId]);

  // Compute actual payment amount (0 means full amount)
  const finalPayAmount = useMemo(() => {
    const amt = paymentLocal.amount;
    if (amt <= 0 || amt >= totals.netPay) return totals.netPay;
    return amt;
  }, [paymentLocal.amount, totals.netPay]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const docPayload = {
        document_type_code: 'FV',
        party_id: partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: l.quantity,
          unit_price_ht: l.price,
          tva_rate: l.tva_rate,
          discount_percentage: 0,
        })),
        payments: finalPayAmount > 0 ? [{
          payment_mode_id: parseInt(paymentLocal.payment_mode_id),
          treasury_account_id: parseInt(paymentLocal.treasury_account_id),
          amount: finalPayAmount,
          payment_date: paymentLocal.payment_date || docDate,
          reference: paymentLocal.reference || null,
          client_ref: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }] : [],
      };
      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docNum = String(docRes?.document_number ?? '—');

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: finalPayAmount,
        remaining: Math.max(0, totals.netPay - finalPayAmount),
      };
    },
    onSuccess: state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      successTimer.current = setTimeout(() => onSaved(state), 2_500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      setApiErr(
        errs ? Object.values(errs).flat().join(' | ') : String(err?.message ?? 'فشل الحفظ')
      );
    },
  });

  const handleSave = useCallback(() => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  // اختصار F8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' && open && !saveMut.isPending && !success) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saveMut.isPending, success, handleSave]);

  const isPending = saveMut.isPending;

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
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              'linear-gradient(135deg, var(--em) 0%, color-mix(in srgb, var(--em) 70%, var(--blue)) 100%)',
            borderRadius: 'var(--r3) var(--r3) 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r2)',
                background: 'rgba(255,255,255,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ti ti-bolt" style={{ fontSize: 18, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>بيع سريع</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
                فاتورة بيع (FV) — رقم الوثيقة يُولَّد تلقائياً — <kbd>F8</kbd> للحفظ
              </div>
            </div>
          </div>
          <button
            onClick={!isPending ? onClose : undefined}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.3)',
              background: 'rgba(255,255,255,.15)',
              color: 'white',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success */}
          {success && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--r2)',
                background: 'var(--greenb)',
                border: '1px solid var(--green)',
                color: 'var(--green)',
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <i className="ti ti-check-circle" />
                تم إنشاء الفاتورة {success.document_number}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                <span>
                  المستحق: <b>{fmtDZD(success.net_to_pay)} دج</b>
                </span>
                {success.paid > 0 && (
                  <span>
                    المدفوع: <b>{fmtDZD(success.paid)} دج</b>
                  </span>
                )}
                {success.remaining > 0 && (
                  <span>
                    المتبقي: <b style={{ color: 'var(--red)' }}>{fmtDZD(success.remaining)} دج</b>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>سيُغلق تلقائياً...</div>
            </div>
          )}

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={lblStyle}>الزبون</div>
              <SearchSelect
                items={parties as any}
                value={partyId}
                onChange={setPartyId}
                getLabel={getPartyLabel as any}
                placeholder="— بيع نقدي —"
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>التاريخ</div>
              <input
                type="date"
                value={docDate}
                onChange={e => setDocDate(e.target.value)}
                style={inpStyle()}
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>
                المستودع <span style={{ color: 'var(--red)' }}>*</span>
              </div>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                style={inpStyle(!!errors.warehouse_id)}
                disabled={isPending}
              >
                <option value="">— اختر —</option>
                {warehouses.map(w => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}
                    {w.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && <ErrMsg msg={errors.warehouse_id} />}
            </div>
          </div>

          {/* Lines */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                المنتجات
                {lines.length > 0 && (
                  <span
                    style={{
                      marginRight: 6,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: 'var(--em)',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {lines.length}
                  </span>
                )}
              </div>
              {errors.lines && <ErrMsg msg={errors.lines} />}
            </div>

            {loadingProds ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--t4)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                تحميل المنتجات...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lines.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                      gap: 6,
                      padding: '4px 10px',
                    }}
                  >
                    {['المنتج', 'الكمية', 'سعر HT', 'TVA%', 'TTC', ''].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--t4)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          textAlign: 'center',
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {lines.map((line, idx) => {
                  const { ttc } = calcLine(line);
                  const prod = products.find(p => String(p.id) === line.product_id);
                  const overStock =
                    prod?.manages_stock && prod.current_stock != null && line.quantity > prod.current_stock;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                        gap: 6,
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: overStock
                          ? 'color-mix(in srgb, var(--red) 5%, var(--bg2))'
                          : 'var(--bg2)',
                        borderRadius: 'var(--r2)',
                        border: `1px solid ${overStock ? 'var(--redbo)' : 'var(--b1)'}`,
                      }}
                    >
                      <SearchSelect
                        items={products as any}
                        value={line.product_id}
                        onChange={(id, _item) => updateLine(idx, 'product_id', id)}
                        getLabel={getProductLabel as any}
                        getSub={getProductSub as any}
                        placeholder="— اختر منتجاً —"
                        disabled={isPending}
                        error={!line.product_id}
                        inputRef={(el: any) => (productInputRefs.current[idx] = el)}
                        onEnter={() => {
                          // عند الضغط Enter في حقل البحث بعد اختيار منتج (أو بدون اختيار)
                          // ننتقل إلى حقل الكمية
                          const quantityInput = quantityInputRefs.current[idx];
                          quantityInput?.focus();
                        }}
                      />
                      <input
                        ref={el => (quantityInputRefs.current[idx] = el)}
                        type="number"
                        min="0.001"
                        step="1"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuantityEnter(idx);
                          }
                        }}
                        style={{
                          ...cellStyle(),
                          border: `1px solid ${
                            overStock
                              ? 'var(--red)'
                              : line.quantity <= 0
                              ? 'var(--red)'
                              : 'var(--b3)'
                          }`,
                        }}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price}
                        onChange={e => updateLine(idx, 'price', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.tva_rate}
                        onChange={e => updateLine(idx, 'tva_rate', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--em)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtDZD(ttc)}
                      </div>
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={isPending}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid var(--b3)',
                          background: 'var(--bg1)',
                          color: 'var(--red)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addLine}
                  disabled={isPending}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--r2)',
                    border: '1px dashed var(--em)',
                    background: 'transparent',
                    color: 'var(--em)',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-plus" /> إضافة منتج
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: '12px 14px',
                  borderRadius: 'var(--r2)',
                  background: 'var(--bg2)',
                  border: '1px solid var(--b1)',
                }}
              >
                <TotRow label="إجمالي HT" value={fmtDZD(totals.ht)} />
                <TotRow label="TVA" value={fmtDZD(totals.tva)} />
                {totals.stamp > 0 && (
                  <TotRow label="الطابع الجبائي" value={fmtDZD(totals.stamp)} color="var(--gold)" />
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: '2px solid var(--b2)',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <span style={{ color: 'var(--t1)' }}>المستحق</span>
                  <span
                    style={{
                      color: 'var(--em)',
                      direction: 'ltr',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtDZD(totals.netPay)} دج
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment section (friendly UI) */}
          <div
            style={{
              borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--greenb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  دفع فوري (نقدي)
                </span>
                {totals.netPay > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 8px',
                      borderRadius: 99,
                      background: 'var(--green)',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    {fmtDZD(finalPayAmount)} دج
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={lblStyle}>
                    طريقة الدفع <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.payment_mode_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, payment_mode_id: e.target.value }))
                    }
                    style={inpStyle()}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {paymentModes.map(pm => (
                      <option key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={lblStyle}>
                    حساب الخزينة <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.treasury_account_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, treasury_account_id: e.target.value }))
                    }
                    style={inpStyle(!!errors.treasury)}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {treasuryAccounts.map(ta => (
                      <option key={ta.id} value={String(ta.id)}>
                        {ta.name}
                        {ta.is_default ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.treasury && <ErrMsg msg={errors.treasury} />}
                </div>
                <div>
                  <div style={lblStyle}>
                    المبلغ المدفوع
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>
                      (0 = كامل المبلغ)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentLocal.amount || ''}
                      placeholder={`${fmtDZD(totals.netPay)} (كامل)`}
                      onChange={e =>
                        setPaymentLocal(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                      }
                      style={{ ...inpStyle(), flex: 1 }}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={fillFullAmount}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)',
                        background: 'var(--bg2)',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--em)',
                      }}
                    >
                      الكل
                    </button>
                  </div>
                </div>
                <div>
                  <div style={lblStyle}>تاريخ الدفع</div>
                  <input
                    type="date"
                    value={paymentLocal.payment_date}
                    onChange={e => setPaymentLocal(p => ({ ...p, payment_date: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={lblStyle}>المرجع / رقم الشيك</div>
                  <input
                    type="text"
                    value={paymentLocal.reference}
                    placeholder="اختياري..."
                    onChange={e => setPaymentLocal(p => ({ ...p, reference: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
              </div>

              {totals.netPay > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: 'var(--r2)',
                    background: 'var(--bg2)',
                    fontSize: 12,
                  }}
                >
                  <span>
                    المستحق: <b>{fmtDZD(totals.netPay)} دج</b>
                  </span>
                  <span style={{ color: 'var(--green)' }}>
                    المدفوع: <b>{fmtDZD(finalPayAmount)} دج</b>
                  </span>
                  {finalPayAmount < totals.netPay && (
                    <span style={{ color: 'var(--red)' }}>
                      المتبقي: <b>{fmtDZD(totals.netPay - finalPayAmount)} دج</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

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
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--b1)',
            background: 'var(--bg2)',
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 var(--r3) var(--r3)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {lines.length > 0 && (
              <span>
                {lines.length} منتج ·{' '}
                <span style={{ fontWeight: 700, color: 'var(--em)' }}>
                  {fmtDZD(totals.netPay)} دج
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)',
                background: 'var(--bg1)',
                color: 'var(--t2)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !!success}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--r2)',
                border: 'none',
                background: success
                  ? 'var(--green)'
                  : 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
                color: 'white',
                cursor: isPending || !!success ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                  الحفظ...
                </>
              ) : success ? (
                <>
                  <i className="ti ti-check" /> تم الحفظ
                </>
              ) : (
                <>
                  <i className="ti ti-bolt" /> تأكيد البيع (F8)
                </>
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
  const ht = l.price * l.quantity;
  const tva = ht * (l.tva_rate / 100);
  return { ht, tva, ttc: ht + tva };
}

function TotRow({ label, value, color = 'var(--t3)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{msg}</div>;
}

const lblStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t3)',
  display: 'block',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
  };
}

function cellStyle(): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 6px',
    borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)',
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 12,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}
