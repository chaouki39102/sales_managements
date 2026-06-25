المشاكل الجوهرية الموجودة الآن:

usePOSStore لا يزال يحتوي على sessionStarted / sessionInvoices / sessionSales / incrementSession الذي بنيناه ليُحذَف — هناك تعارض مباشر مع نظام الجلسات الجديد في DB، والكود يستدعي pos.incrementSession(...) في مكانين
POSTopBar يقرأ sessionInvoices و sessionSales من الـ store القديم بدلاً من currentSession?.invoices_count
pos.endSession() في السطر 978 يُغلق الجلسة محلياً فقط في Zustand بدون أي API call — يُفسد بيانات DB
handleCompleteSale في POSKioskPage يستدعي pos.incrementSession الـ Zustand فقط، لا يُسجّل في DB
OrderType موجود في state لكنه لا يُمرَّر لـ documentsApi.create ولا يظهر في الإيصال

ما ينقص وهو الأهم الآن:

ربط posSession.ts بـ POSPage فعلياً — الملفات موجودة لكن لم تُدمج بعد
حذف incrementSession / startSession / endSession من usePOSStore نهائياً وتعديل كل من يستدعيها
POSTopBar يحتاج prop اختياري session?: PosSession يقرأ منه بدلاً من sessionInvoices: number

المشاكل الموجودة حالياً:

pos.incrementSession(...) الـ Zustand لا يزال في POSPage وPOSKioskPage — يجب استبداله بـ incrementMut.mutate()
POSTopBar لا يزال يقرأ sessionInvoices / sessionSales من Zustand
ProfessionalReceipt يعرض 🏪 نظام المبيعات والجزائر — نظام ERP المتكامل ثابتَين بدلاً من بيانات الشركة الحقيقية
printThermal() لديها ReceiptOptions جاهز لبيانات الشركة لكن لا أحد يُمررها — تطبع بلا اسم شركة
POSKioskPage تُمرر client_id: null دائماً بدل currentClient?.id
usePOSSettings الذي بنيناه غير مُدمج — الـ maxDiscountPct وmanagerPin وreceiptFooter لا تعمل

سوف تجد الحل في الملفات المجاورة لهذا الملف قم بدكجها مع المشروع الحالي دون مشاكل


ترتيب التطبيق بالضبط
الملفات التي تُستبدَل كلياً:
usePOSStore.ts و usePOS.ts — استبدلهما بالنسختين الجديدتين. كل الـ session state اختفت منهما نهائياً.
POSTopBar.tsx — يقرأ الآن من session?: PosSession بدلاً من sessionInvoices: number. تغير الـ prop الوحيد المهم هو تحويل sessionInvoices={pos.sessionInvoices} إلى session={currentSession}.
الملفات التي تُعدَّل (patch):
POSPage_integration.tsx يحتوي 8 نقاط موسومة بـ ✅ SESSION مع الكود الجاهز للنسخ — لا تعديل خمين.
api_routes_sessions.php — 6 أسطر تُضاف في api.php داخل Route::prefix('{company}').
النتيجة بعد التطبيق:
بيانات الجلسة تُحفَظ في DB دائماً، لا تُفقَد عند إغلاق المتصفح، يمكن للمدير مراجعة جلسات الكاشيرين السابقة، جرد الصندوق مقارنة بالمتوقع، وأكثر المنتجات مبيعاً — كل ذلك مرتبط بـ pos_sessions في قاعدة البيانات.
