# ERP Global Roadmap — خارطة الطريق نحو نظام عالمي

> Professional feature list to take the application to a global-ERP level (Odoo / SAP / Zoho style).
> قائمة الميزات الاحترافية للارتقاء بالتطبيق إلى مستوى نظام عالمي (بأسلوب Odoo / SAP / Zoho).
>
> Already-covered areas (excluded from this list): approvals, credit checks, multi-currency/FX, employees/contracts, POS sessions, bank reconciliation, audit log, G50/IFU declarations, product lots, weighted-average valuation, alerts, estimated budget.
> المجالات المغطاة بالفعل (مستثناة من القائمة): الموافقات، فحص الائتمان، تعدد العملات وأسعار الصرف، الموظفون والعقود، جلسات نقاط البيع، المطابقة البنكية، سجل التدقيق، إقرارات G50/IFU، الدفعات/الدفعات اللوت، تقييم المخزون بالمتوسط المرجح، التنبيهات، الميزانية التقديرية.

## Build Order — ترتيب التنفيذ
1. **#5** Customer self-service portal — بوابة الزبائن للخدمة الذاتية
2. **#2** Customizable dashboard builder — مُنشئ لوحة التحكم القابلة للتخصيص
3. **#3** Warehouse transfers + adjustments + counting — التحويلات والتسويات وجرد المخزون
4. **#4** Document lifecycle state machine — دورة حياة الوثائق (الحالة)

---

## Tier 1 — Core ERP Backbone | العمود الفقري للنظام

### #1 Real Double-Entry Accounting — المحاسبة الحقيقية بالقيد المزدوج
- **EN**: Plan Comptable SCF/DGI, automatic journal entries from every document/payment, trial balance (Balance de Vérification), Bilan (balance sheet), Compte de Résultat (P&L). *The defining ERP feature.*
- **AR**: مخطط حسابات وفق SCF/DGI، قيود يومية تلقائية من كل وثيقة ودفعة، ميزان المراجعة، الميزانية (Bilan)، حساب النتائج. *الميزة المميزة لأي نظام عالمي.*

### #2 Customizable Dashboard Builder — مُنشئ لوحة تحكم قابلة للتخصيص
- **EN**: Drag-and-drop KPI widgets, charts, aging, drill-down into reports.
- **AR**: عناصر KPI بالسحب والإفلات، رسوم بيانية، تتبع الأجال (aging)، وتفاصيل تفاعلية حتى التقارير.

### #3 Warehouse Transfers + Adjustments + Counting — تحويلات وتسويات وجرد المخزون
- **EN**: Move stock between warehouses, correction/± adjustment documents, inventory counting, reorder-point alerts with auto-purchase suggestions, FIFO/LIFO valuation options.
- **AR**: نقل المخزون بين المستودعات، وثائق تسوية تصحيحية (±)، جرد فعلي للمخزون، تنبيهات حد إعادة الطلب مع اقتراح شراء تلقائي، خيارات تقييم FIFO/LIFO.

### #4 Document Lifecycle State Machine — دورة حياة الوثائق
- **EN**: Odoo-style status per document: Devis→Confirmé→Livré→Facturé→Payé (BCF→BR→FA, BCC→BL→FV get automated transitions).
- **AR**: حالات بأسلوب Odoo لكل وثيقة: عرض→مؤكد→تم التسليم→تمت الفاتورة→مدفوع (أتمتة انتقالات BCF→BR→FA و BCC→BL→FV).

### #5 Customer Self-Service Portal — بوابة الزبائن للخدمة الذاتية
- **EN**: Customers log in with a portal account, see their invoices, balances, payments, download statements/documents, pay online.
- **AR**: دخول الزبون بحساب بوابة خاص، الاطلاع على فواتيره وأرصدته ودفعاته، تحميل الكشوفات والوثائق، والدفع عبر الإنترنت.

### #6 Email / WhatsApp / SMS Sending — إرسال عبر البريد وواتساب والرسائل
- **EN**: Send invoices with QR + payment link, templates, send-history per document.
- **AR**: إرسال الفواتير مع رمز QR ورابط الدفع، قوالب جاهزة، وسجل الإرسال لكل وثيقة.

### #7 External REST API + Webhooks — واجهة برمجية خارجية وخطافات ويب
- **EN**: Let external apps push/pull orders, products, and stock for integrations.
- **AR**: تمكين تطبيقات خارجية من القراءة/الكتابة (طلبيات، منتجات، مخزون) لأغراض التكامل.

### #8 Recurring Invoices — فواتير دورية
- **EN**: Subscriptions, rent, monthly contracts auto-generated on schedule.
- **AR**: اشتراكات وإيجارات وعقود شهرية تُنشأ تلقائيًا حسب جدول.

---

## Tier 2 — BI, Automation & Money | الذكاء والأتمتة والمال

### #9 Scheduled Emailed Reports — تقارير دورية عبر البريد
- **EN**: Daily sales, stock alerts, receivables aging auto-emailed at set times.
- **AR**: تقارير المبيعات اليومية وتنبيهات المخزون وأجال الذمم المدينة تُرسل تلقائيًا حسب مواعيد محددة.

### #10 Generalized Approval Engine — محرك موافقات معمّم
- **EN**: Multi-level approvals per document type and amount thresholds (build on existing ApprovalWorkflowService).
- **AR**: موافقات متعددة المستويات حسب نوع الوثيقة وحدود المبالغ (بالبناء على ApprovalWorkflowService الموجود).

### #11 Budget vs Actual — الميزانية مقابل الفعلي
- **EN**: Compare approved budget against real expenses/incomes per category with variance alerts.
- **AR**: مقارنة الميزانية المعتمدة مع المصروفات/الإيرادات الفعلية لكل فئة مع تنبيهات الانحراف.

### #12 Cash-Flow Forecast — توقعات التدفق النقدي
- **EN**: Projected in/out from pending documents (BCC/BCF, devis) over the coming weeks.
- **AR**: إسقاط المدخلات/المخرجات من الوثائق المعلقة (BCC/BCF، العروض) على الأسابيع القادمة.

### #13 Custom Report Builder — مُنشئ تقارير مخصصة
- **EN**: Drag-and-drop fields/columns, saved as your own reports.
- **AR**: اختيار الحقول والأعمدة بالسحب والإفلات وحفظها كتقارير خاصة بك.

### #14 Multi-Currency Revaluation + Live FX — إعادة تقييم العملات وأسعار صرف لحظية
- **EN**: Auto revalue balances at month-end; fetch rates.
- **AR**: إعادة تقييم الأرصدة تلقائيًا نهاية الشهر؛ وجلب أسعار الصرف.

### #15 Branches / Departments + Cost Centers — الفروع والإدارات ومراكز التكلفة
- **EN**: Analytic accounting, per-branch P&L.
- **AR**: محاسبة تحليلية وأرباح/خسائر لكل فرع.

### #16 Online Payments (Algeria) — الدفع الإلكتروني (الجزائر)
- **EN**: Nour Satim, CIB interbank, Edahabia integration with payment reconciliation.
- **AR**: تكامل مع نور ساتيم والدفع بين البنوك وبروتوكول Edahabia مع تسوية الدفعات.

---

## Tier 3 — HR, Production & Advanced Operations | الموارد البشرية والإنتاج والعمليات المتقدمة

### #17 Payroll (Algeria) — الرواتب (الجزائر)
- **EN**: Salaries, CNAS/CASNOS, IRG, leave, payslips.
- **AR**: الأجور، الاشتراكات الاجتماعية CNAS/CASNOS، اقتطاع IRG، العطل، وجداول الأجور.

### #18 Fixed Assets — الأصول الثابتة
- **EN**: Asset register, straight-line/declining amortization, DGI/SGF book.
- **AR**: سجل الأصول، إهلاك خطي/متناقص، والدفاتر وفق DGI/SGF.

### #19 Manufacturing / BOM — التصنيع وقائمة المواد
- **EN**: Bill-of-materials for packaged products, work orders, raw-material consumption.
- **AR**: قوائم مكونات (BOM) للمنتجات المعبأة، أوامر عمل، واستهلاك المواد الخام.

### #20 Contract Management — إدارة العقود
- **EN**: Supplier/customer contracts with renewal reminders.
- **AR**: عقود الموردين/الزبائن مع تذكيرات التجديد.

### #21 Tenders / RFQ — طلبات العروض والمناقصات
- **EN**: Supplier quotations comparison for purchases.
- **AR**: مقارنة عروض الموردين للمشتريات.

### #22 Consignment (Dépôt-Vente) — بيع الأمانة (بالوديعة)
- **EN**: Stock on consignment, settlement on sale.
- **AR**: مخزون بالوديعة وتسوية عند البيع.

### #23 Warehouse Zones / Bin Locations — مناطق وأرفف المستودعات
- **EN**: Physical bin-level stock positions.
- **AR**: تتبع المواقع الفعلية للمخزون على مستوى الرفوف.

---

## Tier 4 — Platform & Security | المنصة والأمان

### #24 2FA + Password Policy + Session Management — التحقق الثنائي وسياسة كلمات المرور
- **EN**: TOTP login, force-rotate passwords, revoke sessions.
- **AR**: دخول برمز TOTP، إجبار تغيير كلمات المرور، وإلغاء الجلسات.

### #25 Data Backup / Restore + Full Export — النسخ الاحتياطي والتصدير الشامل
- **EN**: Scheduled DB backup, one-click full download.
- **AR**: نسخ احتياطي مجدول لقاعدة البيانات وتنزيل شامل بنقرة واحدة.

### #26 Activity Feed ("Chatter") on Documents — سجل النشاط على الوثائق
- **EN**: Internal notes/comments with timeline on every document.
- **AR**: ملاحظات وتعليقات داخلية مع خط زمني على كل وثيقة.

### #27 Custom Fields — حقول مخصصة
- **EN**: User-defined fields on products, parties, and documents.
- **AR**: حقول معرفة من المستخدم على المنتجات والأطراف والوثائق.

---

## Verification — التحقق
- `npx tsc --noEmit` — TypeScript clean
- `npm test` — vitest suites pass
- `npm run build` — 0 errors; then `public/sw.js` == `public/build/sw.js` (SW MATCH)
- `vendor\bin\pest.bat` / `php artisan test` — backend tests pass
- `php -l` — PHP syntax clean
