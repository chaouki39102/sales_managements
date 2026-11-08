// pages/documents/hooks/useQuickSaleForm.ts
// حالة ومنطق البيع السريع: الأسطر، الإجماليات، الدفع، التحقق، الحفظ، اختصار F8
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/core/client';
import { invalidateStockQueries } from '@/lib/api/core/queryClient';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';
import { defaultDocDate } from '../quick-sale/quickSale.utils';
import type { Product, QuickLine, SuccessState } from '../quick-sale/quickSale.types';
import { useQuickSaleLookups } from './useQuickSaleLookups';

export function useQuickSaleForm({ open, onSaved }: { open: boolean; onSaved: (doc: SuccessState) => void }) {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    fiscalStampEnabled,
    loadingProds,
    products,
    parties,
    paymentModes,
    treasuryAccounts,
    warehouses,
    defaultWarehouseId,
    defaultPaymentModeId,
    defaultTreasuryId,
  } = useQuickSaleLookups(slug, open);

  // State
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [docDate, setDocDate] = useState(defaultDocDate(selectedYear as any));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuickLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Payment state — synced with defaults when queries resolve
  const [paymentLocal, setPaymentLocal] = useState({
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0,
    reference: '',
    payment_date: defaultDocDate(selectedYear as any),
  });

  // Effects for reset
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(defaultDocDate(selectedYear as any));
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
        payment_date: defaultDocDate(selectedYear as any),
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
  }, [warehouseId, lines, products, paymentLocal?.treasury_account_id]);

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
      const docNum = String(docRes?.document_number ?? '');

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: finalPayAmount,
        remaining: Math.max(0, totals.netPay - finalPayAmount),
        offline: isOfflineQueuedResponse(docRes),
      };
    },
    onSuccess: async state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        await invalidateStockQueries(qc, slug);
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

  return {
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
  };
}
