// All state, effects and handlers of ProductModal; the tab renderers and the shell read from its return value
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/lib/api/core/client';
import { productsApi } from '@/lib/api/endpoints/products';
import { useProductAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { useProductBarcodes, useBarcodeMutations } from '@/lib/api/endpoints/barcodes';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';
import type { PriceLevel } from '@/lib/api/core/types';
import type { TvaRate, ProductForm, ProductModalProps } from '../types';
import { TAB_IDS, type TabId } from '../constants';
import { slugify, emptyForm, productToForm, buildPayload } from '../helpers';
import { useProductImages } from './useProductImages';
import { createProductCollectionHandlers } from './productCollectionHandlers';
import { useTabIndicators } from './useTabIndicators';

export function useProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const isEdit    = !!product;
  const slug      = useActiveSlug();
  const qc        = useQueryClient();
  const bodyRef   = useRef<HTMLDivElement>(null);
  const nameRef   = useRef<HTMLInputElement>(null);
  const initDone  = useRef(false);
  const slugEdited = useRef(false); // لمنع auto-slug بعد التعديل اليدوي
  const { confirm, confirmDialogProps } = useConfirm();
  const notify = useNotification();

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form,      setForm]      = useState<ProductForm>(() => emptyForm());
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');
  const [isDirty,   setIsDirty]   = useState(false);
  const [specKey,   setSpecKey]   = useState('');
  const [specVal,   setSpecVal]   = useState('');
  const [kwInput,   setKwInput]   = useState('');
  const [copied,    setCopied]    = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  // ── Barcodes ──
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showAddBarcode, setShowAddBarcode] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // ── Lookups — single aggregated request (7 HTTP → 1) ──
  const { data: productLookups, isLoading: lookupsLoading } = useProductAggregatedLookups();
  const families          = productLookups?.families ?? [];
  const brands            = productLookups?.brands ?? [];
  const units             = productLookups?.units ?? [];
  const tvas              = productLookups?.tvas ?? [];
  const priceLevels       = productLookups?.priceLevels ?? [];
  const productTypes      = productLookups?.productTypes ?? [];
  const valuationMethods  = productLookups?.valuationMethods ?? [];
  const regulatedProducts = productLookups?.regulatedProducts ?? [];

  // ── Barcodes for current product (edit mode only) ──
  const productId = isEdit && product ? product.id : null;
  const { data: productBarcodes = [] } = useProductBarcodes(productId);
  const barcodeMutations = useBarcodeMutations(productId);

  const defaultTvaId = useMemo(
    () => (tvas as TvaRate[]).find(t => t.rate === 0)?.id ?? (tvas as TvaRate[]).find(t => t.is_default)?.id ?? null,
    [tvas],
  );

  // ── set helper ──
  const set = useCallback(<K extends keyof ProductForm>(key: K, val: ProductForm[K]) => {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
    // auto-slug من الاسم فقط إذا لم يتم التعديل اليدوي
    if (key === 'name' && !isEdit && !slugEdited.current) {
      setForm(f => ({ ...f, name: val as string, slug: slugify(val as string) }));
    }
  }, [isEdit]);

  // ── الصور (رفع، حذف، كاميرا، اقتراحات من الإنترنت) ──
  const {
    imgUploadPct, setImgUploadPct, imgFileRef, pendingImage, setPendingImage, pendingImageUrl,
    setPendingImageUrl, showCamera, setShowCamera, showImgSuggest, setShowImgSuggest, imgQuery, setImgQuery,
    imgResults, setImgResults, imgLoading, setImgLoading, imgError, setImgError, imgSearchSeq,
    searchProductImages, addSuggestedImage, handleCameraCapture, clearPendingImage, handleUploadImage,
    handleDeleteImage, setDefaultImage, toggleImgSuggest,
  } = useProductImages({ form, set, setForm, setIsDirty, productId, notify });

  // ── Reset عند الفتح ──
  useEffect(() => {
    if (!open) { initDone.current = false; slugEdited.current = false; return; }
    setErrors({}); setApiError(''); setActiveTab('basic');
    setIsDirty(false); setSpecKey(''); setSpecVal(''); setKwInput('');
    setImageInput(''); setCopied(false);
    setBarcodeInput('');
    setShowImgSuggest(false); setImgQuery(''); setImgResults([]); setImgError(''); setImgLoading(false);

    if ((priceLevels as PriceLevel[]).length > 0) {
      initDone.current = true;
      setForm(
        isEdit && product
          ? productToForm(product, priceLevels as PriceLevel[])
          : emptyForm(priceLevels as PriceLevel[], defaultTvaId),
      );
    } else {
      setForm(emptyForm([], defaultTvaId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Init priceLevels عند تحميلها لأول مرة بعد فتح المودل ──
  useEffect(() => {
    if (!open || initDone.current || (priceLevels as PriceLevel[]).length === 0) return;
    initDone.current = true;
    setForm(
      isEdit && product
        ? productToForm(product, priceLevels as PriceLevel[])
        : emptyForm(priceLevels as PriceLevel[], defaultTvaId),
    );
  }, [priceLevels, open, isEdit, product, defaultTvaId]);

  // ── Focus اسم المنتج عند الفتح ──
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => nameRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ── منع scroll في الصفحة الخلفية عند فتح المودل ──
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ── Switch Tab مع Scroll للأعلى ──
  function switchTab(id: TabId) {
    setActiveTab(id);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { handleClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const idx = TAB_IDS.indexOf(activeTab);
        const next = e.shiftKey ? idx - 1 : idx + 1;
        if (next >= 0 && next < TAB_IDS.length) switchTab(TAB_IDS[next]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, form, isDirty]);

  const {
    updatePrice, addPackaging, updatePackaging, removePackaging, movePackaging, addBarcode, removeBarcodeItem,
    makePrimaryBarcode, copyBarcodeText, handleCopyConfig, addDiscount, updateDiscount, removeDiscount,
  } = createProductCollectionHandlers({ form, setForm, setIsDirty, barcodeInput, setBarcodeInput, setShowAddBarcode, productId, productBarcodes, barcodeMutations });

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? apiPut<any>(`/products/${product.id}`, payload)
        : apiPost<any>('/products', payload),
    onError: (err: any) => {
      setApiError(err?.message ?? 'حدث خطأ أثناء الحفظ');
      if (err?.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(err.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]]),
          ),
        );
      }
    },
  });

  // ── Validation ──
  function validateField(key: string) {
    if (key === 'name') {
      if (!form.name.trim()) setErrors(e => ({ ...e, name: 'اسم المنتج مطلوب' }));
      else setErrors(e => { const x = { ...e }; delete x.name; return x; });
    }
    if (key === 'purchase_price_ht') {
      if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0)
        setErrors(e => ({ ...e, purchase_price_ht: 'سعر الشراء مطلوب (0 أو أكثر)' }));
      else setErrors(e => { const x = { ...e }; delete x.purchase_price_ht; return x; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0)
      errs.purchase_price_ht = 'سعر الشراء مطلوب (0 أو أكثر)';
    setErrors(errs);
    if (Object.keys(errs).length) { setActiveTab('basic'); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setApiError('');
    let saved: any;
    try {
      saved = await mutation.mutateAsync(buildPayload(form));
    } catch {
      return; // onError يعرض رسالة الخطأ ويملأ الحقول
    }

    // رفع صورة الكاميرا المعلّقة فور حصول المنتج على id حقيقي (B.2):
    // - وضع التعديل: id المنتج حقيقي دائماً (الرفع ينتظر في قائمة الانتظار إن كنا دون اتصال).
    // - وضع الإنشاء عبر الشبكة: id يأتي من استجابة الإنشاء.
    // - وضع الإنشاء دون اتصال: لا id حقيقي بعد → لا يمكن الرفع، نُعلم المستخدم فقط.
    const realId = isEdit ? (product?.id ?? null) : (isOfflineQueuedResponse(saved) ? null : saved?.id);
    if (pendingImage && pendingImageUrl && realId) {
      try {
        const fd = new FormData();
        fd.append('image', pendingImage);
        const updated = await productsApi.uploadImage(realId, fd, p => setImgUploadPct(p));
        if (updated?.images) set('images', updated.images);
        notify.success('تم رفع الصورة الملتقطة');
      } catch (e) {
        notify.error('فشل رفع الصورة الملتقطة', e instanceof Error ? e.message : undefined);
      }
    } else if (pendingImage) {
      notify.info('أُضيف المنتج إلى قائمة الانتظار', 'ستُرفع الصورة الملتقطة لاحقاً من صفحة تعديل المنتج');
    }

    clearPendingImage();
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    onSaved(saved);
    onClose();
  }

  async function handleClose() {
    if (isDirty && !mutation.isPending) {
      if (!await confirm('لديك تعديلات غير محفوظة. هل تريد الخروج؟')) return;
    }
    clearPendingImage();
    onClose();
  }

  // ── Copy barcode ──
  function copyBarcode() {
    if (!form.barcode) return;
    navigator.clipboard.writeText(form.barcode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Generate barcode (with confirm) ──
  async function handleGenerateBarcode() {
    if (!await confirm('تأكيد توليد باركود جديد؟ سيتم استبدال الباركود الحالي بباركود فريد غير مستعمل.')) return;
    try {
      const res = await productsApi.generateBarcode();
      set('barcode', res?.barcode ?? '');
      notify.success('تم توليد باركود فريد', res?.barcode ?? undefined);
    } catch (e) {
      notify.error('فشل توليد الباركود', e instanceof Error ? e.message : undefined);
    }
  }

  const {
    completeness, tabDot, tabBadge, dotColor,
  } = useTabIndicators({ form, pendingImageUrl, productBarcodes });

  return {
    open, product, onClose, onSaved,
    isEdit, slug, qc, bodyRef, nameRef, initDone, slugEdited, confirm, confirmDialogProps, notify, activeTab,
    setActiveTab, form, setForm, errors, setErrors, apiError, setApiError, isDirty, setIsDirty, specKey,
    setSpecKey, specVal, setSpecVal, kwInput, setKwInput, copied, setCopied, imageInput, setImageInput,
    copyModalOpen, setCopyModalOpen, barcodeInput, setBarcodeInput, showAddBarcode, setShowAddBarcode,
    showBarcodeScanner, setShowBarcodeScanner, productLookups, lookupsLoading, families, brands, units, tvas,
    priceLevels, productTypes, valuationMethods, regulatedProducts, productId, productBarcodes,
    barcodeMutations, defaultTvaId, set, switchTab, mutation, validateField, validate, handleSubmit,
    handleClose, copyBarcode, handleGenerateBarcode, imgUploadPct, setImgUploadPct, imgFileRef, pendingImage,
    setPendingImage, pendingImageUrl, setPendingImageUrl, showCamera, setShowCamera, showImgSuggest,
    setShowImgSuggest, imgQuery, setImgQuery, imgResults, setImgResults, imgLoading, setImgLoading, imgError,
    setImgError, imgSearchSeq, searchProductImages, addSuggestedImage, handleCameraCapture, clearPendingImage,
    handleUploadImage, handleDeleteImage, setDefaultImage, toggleImgSuggest, updatePrice, addPackaging,
    updatePackaging, removePackaging, movePackaging, addBarcode, removeBarcodeItem, makePrimaryBarcode,
    copyBarcodeText, handleCopyConfig, addDiscount, updateDiscount, removeDiscount, completeness, tabDot,
    tabBadge, dotColor,
  };
}

export type ProductModalCtx = ReturnType<typeof useProductModal>;
