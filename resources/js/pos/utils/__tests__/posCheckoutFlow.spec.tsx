// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/lib/api/endpoints/documents', () => ({ documentsApi: { create: vi.fn(), update: vi.fn() } }));
vi.mock('@/pos/utils/thermalPrint', () => ({ openCashDrawerSmart: vi.fn() }));
vi.mock('@/pos/utils/posSounds', () => ({ playSaleSound: vi.fn() }));

import { documentsApi } from '@/lib/api/endpoints/documents';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { usePosProCheckout } from '@/pos-pro/hooks/usePosProCheckout';
import { beginCheckout, endCheckout, printOnce, afterPrint } from '../posCheckoutFlow';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const create = documentsApi.create as unknown as ReturnType<typeof vi.fn>;
const variant: any = { id: 7, product_id: 7, default_selling_price_ht: 100, tva: { rate: 0 }, product: { name: 'P' } };
const savedDoc = { document_number: 'POS-1', net_to_pay: 100, paid_amount: 100, total_ht: 100, total_tva: 0, total_ttc: 100 };

function deferred<T>() {
  let resolve!: (v: T) => void; let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup(handlePrintDirect: (...a: any[]) => Promise<void>) {
  const st = usePosProCart.getState;
  const posRef = { get current() {
    return { ...st(), totals: { total_ht: 100, total_tva: 0, total_ttc: 100, fiscal_stamp: 0 } } as any;
  } };
  let api!: ReturnType<typeof usePosProCheckout>;
  function Harness() {
    api = usePosProCheckout({
      slug: 's', queryClient: new QueryClient(), safeToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } as any,
      settings: { defaultDocTypeCode: 'POS', quickCashAction: 'print', afterSaleAction: 'print' } as any,
      posRef, mountedRef: { current: true }, documentTypes: [{ id: 1, code: 'POS' }] as any, paymentModes: [] as any,
      activeWarehouse: { id: 1 } as any, defaultCurrency: undefined, defaultTreasury: undefined,
      fiscalYear: { id: 1 } as any, sessionId: undefined, incrementMut: { mutateAsync: vi.fn() } as any,
      editingDocumentId: null, editingDocumentDate: null, clearEditingState: () => {},
      receiptSnapshotRef: { current: null }, isPrintEnabled: true, template: {},
      handlePrintDirect, setSaleBusy: () => {}, setPaymentOpen: () => {}, setReceiptOpen: () => {},
    });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Harness />));
  const sale = () => api.handleCompleteSale({ amountPaid: 100, payments: [], skipPreview: true } as any);
  return { sale, root };
}

describe('POS checkout flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    create.mockReset();
    usePosProCart.getState().clearCart();
    usePosProCart.getState().addItem(variant, 2);
  });
  afterEach(() => { vi.useRealTimers(); });

  it('clears the cart right after the save without waiting for the print', async () => {
    create.mockResolvedValue(savedDoc);
    const print = vi.fn(() => new Promise<void>(() => {})); // never finishes
    const { sale } = setup(print);
    const res = await sale();
    expect(res.ok).toBe(true);
    expect(usePosProCart.getState().items).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    // the receipt snapshot was taken before the clear
    expect(print).toHaveBeenCalledTimes(1);
    expect((print.mock.calls[0] as any[])[0].items[0].qty).toBe(2);
  });

  it('blocks cart edits during the save and saves a double submit once', async () => {
    const save = deferred<typeof savedDoc>();
    create.mockReturnValue(save.promise);
    const { sale } = setup(vi.fn(async () => {}));
    const first = sale();
    usePosProCart.getState().addItem(variant, 5);
    usePosProCart.getState().setNotes('lost');
    expect(usePosProCart.getState().items[0].quantity).toBe(2);
    expect(usePosProCart.getState().notes).toBe('');
    const second = await sale();
    expect(second.ok).toBe(false);
    save.resolve(savedDoc);
    expect((await first).ok).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    usePosProCart.getState().setNotes('next sale');
    expect(usePosProCart.getState().notes).toBe('next sale');
  });

  it('a print failure keeps the sale saved and the cart cleared', async () => {
    create.mockResolvedValue(savedDoc);
    const { sale } = setup(vi.fn(() => Promise.reject(new Error('offline'))));
    expect((await sale()).ok).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(usePosProCart.getState().items).toHaveLength(0);
  });

  it('a failed save keeps the cart and unlocks it', async () => {
    create.mockRejectedValue(new Error('boom'));
    const { sale } = setup(vi.fn(async () => {}));
    expect((await sale()).ok).toBe(false);
    expect(usePosProCart.getState().items).toHaveLength(1);
    usePosProCart.getState().setNotes('editable');
    expect(usePosProCart.getState().notes).toBe('editable');
  });
});

describe('posCheckoutFlow helpers', () => {
  it('only the owner token releases the lock', () => {
    const t = beginCheckout();
    expect(beginCheckout()).toBe(0);
    endCheckout(t + 1);
    expect(beginCheckout()).toBe(0);
    endCheckout(t);
    const t2 = beginCheckout();
    expect(t2).toBeGreaterThan(0);
    endCheckout(t2);
  });

  it('printOnce skips a second print of the same document while the first runs', async () => {
    const job = deferred<void>();
    const print = vi.fn(() => job.promise);
    const a = printOnce('POS-9', print);
    await printOnce('POS-9', print);
    expect(print).toHaveBeenCalledTimes(1);
    job.resolve();
    await a;
    await printOnce('POS-9', print);
    expect(print).toHaveBeenCalledTimes(2);
  });

  it('afterPrint waits for the print, capped by a timeout', async () => {
    vi.useFakeTimers();
    const work = vi.fn();
    afterPrint(new Promise(() => {}), work, 3000);
    await vi.advanceTimersByTimeAsync(2999);
    expect(work).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(work).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
