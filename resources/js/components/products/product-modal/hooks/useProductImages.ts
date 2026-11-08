// Image gallery state for ProductModal: upload, delete, camera capture, web image suggestions
import React, { useState, useRef, useCallback } from 'react';
import { productsApi } from '@/lib/api/endpoints/products';
import type { useNotification } from '@/hooks/useNotification';
import type { ProductForm } from '../types';

interface Deps {
  form: ProductForm;
  set: <K extends keyof ProductForm>(key: K, val: ProductForm[K]) => void;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  productId: number | null;
  notify: ReturnType<typeof useNotification>;
}

export function useProductImages({ form, set, setForm, setIsDirty, productId, notify }: Deps) {
  const [imgUploadPct, setImgUploadPct] = useState(0);
  const imgFileRef = useRef<HTMLInputElement>(null);

  // ── صورة ملتقطة بالكاميرا (تُرفع عند الحفظ) ──
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // ── اقتراح صورة من الإنترنت ──
  const [showImgSuggest, setShowImgSuggest] = useState(false);
  const [imgQuery,       setImgQuery]       = useState('');
  const [imgResults,     setImgResults]     = useState<{ id: string; thumb: string; full: string; exact?: boolean; label?: string; source?: string | null }[]>([]);
  const [imgLoading,     setImgLoading]     = useState(false);
  const [imgError,       setImgError]       = useState('');
  const imgSearchSeq = useRef(0); // لمنع race condition بين طلبات بحث متتالية

  // ── بحث الصور ──
  // كل المصادر (Google CSE مقيّد بمواقع جزائرية، متاجر جزائرية عبر WooCommerce
  // Store API، Open Food Facts بالباركود والاسم، Pexels احتياطياً) تُستعلَم من
  // الباك-إند في طلب واحد. سابقاً كنا نستدعي world.openfoodfacts.org مباشرة من
  // المتصفح، وهذا كان يفشل بخطأ CORS لأن ذلك المسار لا يرسل رؤوس
  // Access-Control-Allow-Origin؛ طلبات الخادم لا تخضع لسياسة CORS، لذا هذا
  // الحل هو الصحيح والنهائي.
  const searchProductImages = useCallback(async (queryRaw: string) => {
    const query = queryRaw.trim();
    if (!query || query.length < 2) return;
    const seq = ++imgSearchSeq.current;
    setImgLoading(true);
    setImgError('');
    try {
      const barcode = form.barcode?.trim() || undefined;
      const results = await productsApi.searchImages(query, 1, barcode);
      if (seq !== imgSearchSeq.current) return; // نتيجة بحث قديمة — تجاهل

      const mapped = (results ?? [])
        .filter(r => !!r?.thumb && !!r?.full)
        .map(r => ({
          id:     r.id,
          thumb:  r.thumb as string,
          full:   r.full as string,
          exact:  r.exact,
          label:  r.label ?? undefined,
          source: r.source ?? undefined,
        }));

      setImgResults(mapped);
      if (mapped.length === 0) setImgError('لا توجد نتائج لهذا البحث');
    } catch (e: any) {
      if (seq !== imgSearchSeq.current) return;
      setImgError(e?.message || 'تعذّر البحث عن الصور، تحقق من اتصالك بالإنترنت');
      setImgResults([]);
    } finally {
      if (seq === imgSearchSeq.current) setImgLoading(false);
    }
  }, [form.barcode]);

  function addSuggestedImage(url: string) {
    if (form.images.includes(url)) return;
    set('images', [...form.images, url]);
  }

  // ── صورة الكاميرا: معاينة محلية + رفع عند الحفظ (B.2) ──
  // المنتج قد لا يملك بعد id في وضع الإنشاء، لذا نُبقي الصورة كـ blob محلي
  // (بدون أي طلب شبكة) ونرفعها فور نجاح الحفظ عبر مسار الرفع الموجود.
  const handleCameraCapture = useCallback((file: File) => {
    setPendingImage(prev => {
      if (prev) return prev;
      return file;
    });
    setPendingImageUrl(prev => {
      if (prev) return prev;
      return URL.createObjectURL(file);
    });
    setIsDirty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setIsDirty is a stable state setter passed in from useProductModal
  }, []);

  const clearPendingImage = useCallback(() => {
    setPendingImage(null);
    setPendingImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      notify.error('الملف كبير جداً', 'الحد الأقصى 5 ميغابايت');
      if (imgFileRef.current) imgFileRef.current.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      notify.error('صيغة غير مدعومة', 'JPG, PNG, GIF, WebP فقط');
      if (imgFileRef.current) imgFileRef.current.value = '';
      return;
    }
    setImgUploadPct(0);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const updated = await productsApi.uploadImage(productId, fd, p => setImgUploadPct(p));
      if (updated?.images) set('images', updated.images);
    } catch (e) {
      notify.error('فشل رفع الصورة', e instanceof Error ? e.message : undefined);
    }
    setImgUploadPct(0);
    if (imgFileRef.current) imgFileRef.current.value = '';
  }

  async function handleDeleteImage(url: string, idx: number) {
    const remaining = form.images.filter((_, i) => i !== idx);
    set('images', remaining);
    if (form.default_image === url) {
      setForm(f => ({ ...f, default_image: remaining[0] ?? null }));
    }
    if (productId && url.includes('/storage/')) {
      try {
        await productsApi.deleteImage(productId, url);
      } catch (e) {
        notify.error('فشل حذف الصورة', e instanceof Error ? e.message : undefined);
      }
    }
  }

  function setDefaultImage(url: string) {
    setForm(f => ({ ...f, default_image: f.default_image === url ? null : url }));
  }

  function toggleImgSuggest() {
    setShowImgSuggest(v => {
      const next = !v;
      if (next && imgResults.length === 0 && !imgLoading) {
        const q = imgQuery.trim() || form.name.trim();
        if (q) { setImgQuery(q); searchProductImages(q); }
      }
      return next;
    });
  }

  return {
    imgUploadPct,
    setImgUploadPct,
    imgFileRef,
    pendingImage,
    setPendingImage,
    pendingImageUrl,
    setPendingImageUrl,
    showCamera,
    setShowCamera,
    showImgSuggest,
    setShowImgSuggest,
    imgQuery,
    setImgQuery,
    imgResults,
    setImgResults,
    imgLoading,
    setImgLoading,
    imgError,
    setImgError,
    imgSearchSeq,
    searchProductImages,
    addSuggestedImage,
    handleCameraCapture,
    clearPendingImage,
    handleUploadImage,
    handleDeleteImage,
    setDefaultImage,
    toggleImgSuggest,
  };
}
