// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosSearchCommand.ts
//
// Search text + the "*NN" quantity command for POSPage.
// ════════════════════════════════════════════════════════════════════════════
import { useRef, useCallback } from 'react';
import type { PosState } from './posPageTypes';

export function usePosSearchCommand(params: {
  searchQuery: string;
  posRef: { readonly current: PosState };
}) {
  const { searchQuery, posRef } = params;

  const isQtyCmd = /^\*\d*$/.test(searchQuery.trim());

  // ═══════════════════════════════════════════════════════════════════════
  // البحث الفوري (client-side) — بدون debounce وبدون رحلة شبكة لكل ضغطة مفتاح
  // ═══════════════════════════════════════════════════════════════════════
  // سابقاً: كان نص البحث يُرسل للسيرفر (بعد تأخير 300ms) وكل استعلام
  // منتجات جديد يعيد جلب البيانات، فيصير "وميض" (فراغ/تحميل ثم نتائج)
  // مع كل كلمة تُكتب. بما أننا أصلاً نجيب الكتالوج كامل (per_page 99999)
  // حسب التصنيف، ما فيه داعي إطلاقاً لإعادة الطلب من السيرفر عند الكتابة:
  // نجيب بيانات التصنيف الحالي مرة وحدة (تبقى بالكاش)، والفلترة بالاسم/
  // الباركود تصير محلياً بالكامل بـ filteredVariants — فورية 100% (فلترة
  // مصفوفة بالمتصفح أسرع بمراحل من أي طلب شبكة، حتى لو كان أسرع طلب ممكن).
  const rawQuery = searchQuery.trim();

  // نُجمّد نص البحث المستخدم بالفلترة أثناء وضع أمر الكمية (*NNN) حتى تبقى
  // نتائج البحث كما هي بدون أي تغيير أثناء كتابة الكمية (نفس فكرة القفل
  // القديمة، لكن مطبَّقة على الفلترة المحلية مباشرة بدل مفتاح استعلام السيرفر).
  const prevSearchRef = useRef('');
  if (!isQtyCmd) prevSearchRef.current = rawQuery;
  const displaySearch = isQtyCmd ? prevSearchRef.current : rawQuery;

  // عند اكتمال أمر الكمية (*NN + Enter)، نرجّع نص البحث لنفس ما كان قبل
  // "*" (مو نمسحه لفراغ) — عشان القائمة تضل نفس نتائج البحث. لكن هذا
  // "تغيير" بمربع البحث لازم ما يُعامَل كبحث جديد (اللي أصلاً يصفّر
  // highlightedIndex) — هذا العلم يخلي الـ effect يعرف يتخطى التصفير
  // مرة وحدة بس بعد هالاسترجاع تحديداً.
  const skipNextSearchResetRef = useRef(false);

  // سلوك Escape موحّد بمكان وحيد: أثناء وضع أمر الكمية (*NN) نرجّع نص
  // البحث السابق (بدل مسحه بالكامل) — وإلا لو ضغط المستخدم Escape بالغلط
  // وهو يكتب *56 بنية إلغاء الرقم بس، كان يفقد نتائج بحثه "علبة" كمان.
  // خارج وضع أمر الكمية، السلوك زي ما كان (مسح كامل). تُستخدم داخل معالج
  // اختصارات لوحة المفاتيح وداخل ProductSearchBar.
  const handleSearchEscape = useCallback(() => {
    if (isQtyCmd) {
      skipNextSearchResetRef.current = true;
      posRef.current.setSearch(prevSearchRef.current);
    } else {
      posRef.current.setSearch('');
    }
  }, [isQtyCmd, posRef]);

  return { isQtyCmd, rawQuery, displaySearch, prevSearchRef, skipNextSearchResetRef, handleSearchEscape };
}
