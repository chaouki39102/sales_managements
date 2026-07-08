# POS Page — Improvements & Dead Code

## تحسينات مقترحة

| الرقم | التحسين | الوصف | الموقع |
|-------|---------|-------|--------|
| 1 | ملفات صوتية | `playSoundOnAdd`/`playSoundOnSale` معرفين في الإعدادات لكن لا يوجد صوت عند الإضافة أو البيع | `usePOSSettings.ts:69,71` |
| 2 | autoClosePayment | إعداد موجود لكن غير مستخدم نهائياً | `usePOSSettings.ts:72` |
| 3 | إعدادات فاتورة قديمة | 4 إعدادات مخزنة لكن مهملة منذ Print Template pipeline | `usePOSSettings.ts:54-60` |
| 4 | تعديل الفواتير غير المسودة | عند تعديل فاتورة بحالة غير draft لا يتم إرسال الأصناف، فقط المدفوعات | `POSPage.tsx:798-803` |
| 5 | المرتجعات لا تؤثر على المخزون | `ReturnsModal` ينشئ مستند AVC لكن لا يضبط المخزون | `ReturnsModal.tsx` |
| 6 | ازدواجية الملاحظات | `cartNote` في POSPage و `notes` في useCartStore حقلين منفصلين | `POSPage.tsx:158` |
| 7 | طابع مالي افتراضياً ON | إذا لم يكن للإعداد `fiscal_stamp_enabled` قيمة في الخلفية، يفعل تلقائياً | `POSPage.tsx:89` |

## كود ميت (5 ملفات)

| الملف | المشكلة |
|------|---------|
| `pos/components/ProductSearchBarEnhanced.tsx` | كامل لكن غير مستورد في أي مكان |
| `pos/components/CategoryTabsEnhanced.tsx` | كامل لكن غير مستورد في أي مكان |
| `pos/DocumentStickyTotalsBar.tsx` | استيرادات مكسورة (`document.utils`/`document.types` غير موجودة)، غير مستخدم |
| `pos/hooks/useCartStore.ts` | نسخة مكررة من `pos/utils/useCartStore.ts` بسلوك مختلف (لا تتبع المدفوعات) |
| `user` variable (POSPage.tsx:101) | مسحوب من `useAuthUser()` لكن غير مرجع أبداً |


212 requests
1.1 MB transferred
9.6 MB resources
Finish: 18.59 s
DOMContentLoaded: 1.32
