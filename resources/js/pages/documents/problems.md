تحليل منهجي.

تحليل الخلفية (Laravel)
النماذج (Models)
CommercialDocument:

يحتوي على $fillable مع العديد من الحقول.

$casts مناسب.

$searchableFields, $filterable, $sortable, $allowedIncludes تستخدم لتكوين البحث والتصفية في المتحكم (ربما في BaseApiController).

علاقات: documentType, numberingSeries, user, party, warehouse, fiscalYear, currency, documentStatus, validatedBy, sourceDocument, cancellationOfDocument, lines, payments (BelongsToMany عبر pivot document_payment), stockMovements (HasManyThrough).

نطاقات: locked, unlocked, validated, unpaid, overdue.

دوال مساعدة: isFullyPaid, isOverdue, canBeModified.

ملاحظات:

stockMovements معرفة عبر HasManyThrough من CommercialDocumentLine إلى StockMovement، ولكن العلاقة تستخدم commercial_document_line_id في stock_movements. هذا صحيح.

payments هي BelongsToMany عبر pivot document_payment، ولكن في CommercialDocumentService يتم إنشاء Payment ثم ربطها عبر attach، وهذا صحيح.

validatedBy هو BelongsTo مع foreign_key validated_by.

sourceDocument و cancellationOfDocument تشير لنفس النموذج.

يوجد booted مع Global Scope ولكن التعليق يقول أنه لا يفعل شيئاً، فقط توضيح. هذا جيد، لأن SoftDeletes يطبق النطاق تلقائياً.

CommercialDocumentLine:

$fillable يحتوي على commercial_document_id, product_id, line_order, description, quantity, delivered_quantity, returned_quantity, unit_price_ht, discount_percentage, discount_amount, additional_costs, total_additional_cost, total_discount_amount, tva_rate, total_ht, total_tva, total_ttc, stock_lot_id, is_auto_split, parent_line_id, line_attributes, packaging_id.

$casts جيد.

علاقات: commercialDocument, product, stockLot, parentLine, childLines, stockMovements.

نطاقات parentLines, childLines.

دوال مساعدة: getRemainingQuantity, isFullyDelivered, hasDiscount.

ملاحظات:

لا يوجد packaging_id في $fillable؟ موجود بالفعل.

لا يوجد product_variant_id، فقط product_id. هذا مقبول إذا كان المنتج هو الـ variant نفسه.

stock_lot_id يشير إلى ProductLot.

المتحكمات (Controllers)
CommercialDocumentController:

يمتد من BaseApiController.

يقوم بحقن CommercialDocumentService و QRCodeService.

يقوم بتعريف getListConfig لتحديد الفلاتر والترتيب المسموح بها.

index ينفذ منطق التصفية والترتيب يدوياً (بدلاً من استخدام BaseApiController الافتراضي). هذا مكرر بعض الشيء، ولكنه يعمل.

دوال unpaid, overdue تستدعي الخدمة.

دوال validateDocument, lock, unlock, cancel, generateQRCode كلها تقبل Request, Company, CommercialDocument (مع ترتيب المعاملات كما هو موضح في التعليقات). هذا صحيح لأن المسارات في api.php تستخدم {company} ثم {commercialDocument}.

generateQRCode لا يستخدم $request، وهذا صحيح.

cancel يتحقق من cancellation_reason.

يستخدم authorizeAction للتحقق من الصلاحيات.

CommercialDocumentLineController:

يمتد من BaseApiController ويستخدم CommercialDocumentLineService.

الخدمات (Services)
CommercialDocumentService (موسع من BaseService):

يستخدم ValidatesTenantRelations trait.

beforeCreate:

يحدد company_id من السياق.

يجهز البيانات (prepareDocumentData) ويضبط user_id.

يتحقق من نوع الوثيقة ويتحقق من requires_party.

يحل numbering_series_id إذا لم يُعطى.

يولد رقم المستند عبر generateDocumentNumber (يستخدم معاملة لقفل الصف).

يحدد fiscal_year_id إذا لم يُعطى.

يضبط validated_at و validated_by و document_status_id إلى "validated" مباشرة.

يتحقق من العلاقات عبر validateTenantRelations.

afterCreate:

ينشئ الأسطر عبر createDocumentLines.

يعيد حساب الإجماليات recalculateTotals.

إذا كان نوع المستند يؤثر على المخزون (affects_stock_direction != 0)، ينشئ حركات المخزون createStockMovements.

يربط الدفعات إذا أرسلت payments.

beforeUpdate:

يتحقق من is_locked و is_exported_to_accounting ويمنع التحديث إذا كان أحدهما صحيحاً.

afterUpdate:

إذا أرسلت lines، يحذف الأسطر القديمة وينشئ جديدة (بدون معاملة؟ ملاحظة: حذف ثم إنشاء قد يسبب فقدان البيانات إذا فشل الإنشاء، ولكن داخل update في BaseService يكون في معاملة؟ يجب التحقق من BaseService، لكن من المفترض أن BaseService يقوم بمعاملة).

يعيد حساب الإجماليات.

beforeDelete: يرمي استثناء يمنع الحذف (يُستخدم الإلغاء بدلاً من ذلك).

دوال عامة: lockDocument, unlockDocument, cancelDocument, getUnpaid, getOverdue.

createDocumentLines: يحسب إجماليات السطر عبر computeLineTotals.

attachPayments: ينشئ Payment ويربطها عبر pivot، ويعيد حساب paid_amount و remaining_amount عبر recalculatePaymentAmounts.

recalculateTotals: يجمع من الأسطر، ويحسب الطابع الجبائي عبر FiscalStampCalculator، ويحديث الحقول.

createStockMovements:

يحدد اتجاه الحركة من document_type.affects_stock_direction.

يستخدم InventoryValuationService للحصول على سعر التكلفة للمبيعات.

ينشئ StockMovement مع is_validated = true.

دوال مساعدة: getStatusId, prepareDocumentData, resolveNumberingSeries, generateDocumentNumber, getCurrentFiscalYearId, getExchangeRate.

ملاحظات على الخدمة:

في beforeCreate، يتم تعيين validated_at و validated_by و document_status_id إلى "validated" مباشرة. هذا يتوافق مع منطق "لا مسودة، اعتماد فوري". لكن هذا يعني أن المستند يُنشأ معتمداً، ولا توجد حالة مسودة. هذا مقبول حسب المتطلبات.

generateDocumentNumber: يستخدم lockForUpdate() لضمان عدم تكرار الأرقام. ولكن يستخدم orderByDesc('id') بدلاً من orderByDesc('document_number')، وقد لا يكون دقيقاً إذا كانت الأرقام غير متتابعة حسب id. من الأفضل استخدام orderByDesc('document_number') أو max('document_number'). لكن بما أن التنسيق PREFIX-YEAR-XXXXXX، فاستخدام id قد لا يكون صحيحاً إذا كانت هناك فجوات. من الأفضل استخدام orderByDesc('document_number') مع like للحصول على آخر رقم.

resolveNumberingSeries: إذا لم يجد سلسلة، يقوم بإنشاء واحدة جديدة. هذا جيد.

createStockMovements: يستخدم $document->document_date كـ movement_date. هذا صحيح.

createStockMovements: يستخدم $valuationService->getCostPriceForSale للحصول على سعر التكلفة، ولكن إذا كان direction < 0 (بيع) يستخدم costPrice، وإلا يستخدم unit_price_ht كسعر التكلفة للمشتريات. هذا صحيح.

createStockMovements: لا يتحقق من وجود مخزون كافٍ قبل البيع. هذا قد يؤدي إلى مخزون سالب إذا لم يكن مسموحاً. لكن هناك دالة validateLineStock في الواجهة الأمامية تتحقق، لكن الخلفية لا تتحقق. قد يكون هناك حاجة لإضافة تحقق في beforeCreate أو afterCreate للتأكد من أن الكمية المطلوبة متاحة، وإلا رفض العملية. ولكن بما أن النظام يسمح بالمخزون السالب (إذا كان allow_negative_stock صحيحاً)، يمكن ترك الأمر.

recalculateTotals: يستخدم updateQuietly لتجنب تشغيل الـ Observers. هذا جيد لتجنب الحلقات.

attachPayments: ينشئ Payment بدون fiscal_year_id؟ لاحظ أن Payment model يتطلب fiscal_year_id، ولكن Payment في types.ts يحتوي على fiscal_year_id. في attachPayments، عند إنشاء Payment، لا يمرر fiscal_year_id، مما قد يسبب خطأ إذا كان الحقل مطلوباً في قاعدة البيانات. هذا خطأ. يجب إضافة fiscal_year_id من المستند.

attachPayments: payment_date يأخذ $document->document_date إذا لم يحدد. هذا جيد.

createStockMovements: يستخدم $stockMovementTypeId = match ولكن match في PHP 8.0+، جيد.

getExchangeRate: يبحث عن سعر الصرف من currency_id إلى العملة الأساسية (id=1). جيد.

CommercialDocumentLineService (موسع من BaseService):

يقوم بـ afterCreate, afterUpdate, afterDelete بإعادة حساب الوثيقة الأم عبر recalculateParentDocument.

recalculateParentDocument يحسب الإجماليات من الأسطر ويحدث الوثيقة باستخدام updateQuietly.

ملاحظات:

recalculateParentDocument يحسب الطابع الجبائي عبر FiscalStampCalculator، وهذا صحيح.

لا يوجد تحقق من is_locked عند تعديل سطر؟ ولكن beforeUpdate في CommercialDocumentService يمنع تحديث الوثيقة إذا كانت مقفلة، ولكن تحديث سطر منفرد قد لا يمر عبر CommercialDocumentService، بل عبر CommercialDocumentLineService مباشرة. يجب التأكد من أن CommercialDocumentLineService يتحقق من is_locked للوثيقة الأم قبل السماح بالتحديث. حالياً ليس هناك تحقق، مما قد يسمح بتعديل سطر في وثيقة مقفلة. هذا خطأ أمني ومنطقي.

الطلبات (Requests)
StoreCommercialDocumentRequest:

authorize يعيد true، ويتم التحقق من الصلاحيات في المتحكم.

rules:

party_id إلزامي أو اختياري حسب requires_party من نوع الوثيقة (يتم تحديده في resolvePartyRequired).

lines مطلوب مع min:1.

lines.*.product_id مطلوب، quantity مطلوب، unit_price_ht مطلوب.

packaging_id اختياري.

stock_lot_id اختياري.

due_date يجب أن يكون بعد أو يساوي document_date.

الرسائل جيدة.

UpdateCommercialDocumentRequest:

كل الحقول sometimes مع nullable، مما يسمح بتحديث جزئي.

lines.*.product_id و quantity و unit_price_ht مطلوبة فقط إذا تم إرسال lines (باستخدام required_with:lines).

لا يوجد تحقق من is_locked هنا، بل في الخدمة.

ملاحظات: كلا الطلبين لا يتحققان من وجود company_id، لكن الخدمة تتعامل مع ذلك.

السياسات (Policies)
CommercialDocumentPolicy: يستخدم can مع أسماء الأذونات القياسية (view_any_commercial_document, view_commercial_document, إلخ). هذا يعتمد على نظام الأذونات.

CommercialDocumentLinePolicy: مشابه.

المراقبون (Observers)
CommercialDocumentLineObserver:

saving: يحسب إجماليات السطر إذا تغيرت القيم الأساسية (كمية، سعر، خصم، ضريبة). يستخدم isDirty لتجنب إعادة الحساب غير الضرورية.

جيد.

CommercialDocumentObserver:

saving: إذا كانت علاقة lines محملة وليست فارغة، يحسب إجماليات الوثيقة باستخدام calculateDocumentTotals. هذا يعمل كطبقة احتياطية.

saved: إذا كان remaining_amount صغيراً (<= 0.001) و net_to_pay > 0، يغير الحالة إلى "paid" عبر saveQuietly. هذا يعمل تلقائياً عند تسديد كامل المبلغ.

ملاحظات:

saving في CommercialDocumentObserver يستخدم updateQuietly؟ لا، إنه يقوم بتعيين القيم على النموذج مباشرة، وهذا سيتم حفظه عند save() العادي. ولكن إذا تم استدعاء updateQuietly في الخدمة، فلن يُشغل الـ Observer. لكن في saving، يتم تعيين القيم، ولكن الـ saving لا ينفذ save، بل يُعدل النموذج قبل الحفظ. هذا جيد.

saved يستخدم saveQuietly لتجنب الحلقات.

يجب التأكد من أن paidStatus موجود، وإلا يتجاهل.

StockMovementObserver:

creating: يحسب cost_price للحركات الخارجة، ويضبط unit_price و total_price.

created: يقوم بـ:

تحديث PMP (لحركات الإدخال) عبر updateCostAfterPurchase.

إنشاء دفعة (lot) لحركات الإدخال.

تحديث أرصدة الدفعات لحركات الخروج (FIFO/LIFO).

تحديث stock_balance_after.

جيد.

السيدرز (Seeders)
DocumentBaseOperationSeeder, DocumentStatusSeeder, DocumentTypeSeeder, InventoryValuationMethodSeeder, StockMovementTypeSeeder كلها تدرج بيانات افتراضية للشركة الأولى. هذا جيد للاختبار.

المسارات (api.php)
تم تعريف المسارات بشكل جيد. تم استخدام middleware(['auth:sanctum', 'company']) لمجموعة {company}.

تم وضع المسارات المحددة (مثل unpaid, overdue) قبل apiResource لتجنب التعارض. هذا صحيح.

تم استخدام can:update_company لمجموعة معينة، و can:manage_fiscal_year، و can:create_sales_document، إلخ. هذه الأذونات مستخدمة في السياسات.

ملخص أخطاء الخلفية المحتملة:
عدم تمرير fiscal_year_id عند إنشاء الدفعات في attachPayments، مما قد يسبب فشل إنشاء Payment إذا كان الحقل مطلوباً.

إمكانية تعديل سطر منفرد (CommercialDocumentLine) في وثيقة مقفلة، لأن CommercialDocumentLineService لا يتحقق من is_locked للوثيقة الأم.

generateDocumentNumber يعتمد على id بدلاً من document_number، قد يؤدي إلى تكرار الأرقام في حال وجود فجوات.

عدم التحقق من كفاية المخزون عند البيع في الخلفية (قد يكون مقصوداً إذا كان allow_negative_stock).

استخدام updateQuietly في recalculateTotals يمنع تشغيل Observers، ولكن هذا مقصود لتجنب الحلقات. لكن قد يؤدي إلى عدم تحديث stock_balance_after في StockMovementObserver إذا تم تحديث الحركات مباشرة؟ لكن StockMovementObserver يعمل عند إنشاء الحركات، وليس عند تحديث المستند.

في afterUpdate من CommercialDocumentService، يتم حذف جميع الأسطر وإنشاؤها من جديد، دون التحقق من أن الأسطر الجديدة صالحة (مثل عدم وجود تعارض مع المخزون). هذا قد يؤدي إلى فقدان بيانات حركات المخزون المرتبطة بالأسطر القديمة إذا كانت قد أنشئت بالفعل. لكن بما أن المستند معتمد فوراً ويتم إنشاء حركات المخزون في afterCreate، فإن تحديث المستند بعد ذلك (إذا كان غير مقفل) سيؤدي إلى حذف الأسطر القديمة وحركات المخزون المرتبطة بها؟ في afterUpdate، لا يتم حذف حركات المخزون، بل فقط الأسطر. هذا يعني أن حركات المخزون القديمة ستبقى مرتبطة بأسطر محذوفة، مما يسبب مشاكل في سلامة البيانات. يجب إما حذف حركات المخزون القديمة مع الأسطر، أو منع تحديث الأسطر في المستندات المعتمدة (وهو ما يحدث بالفعل لأن beforeUpdate يمنع التحديث إذا كان is_locked أو is_exported_to_accounting، ولكن المستندات المعتمدة ليست مقفلة بالضرورة، لذا قد يسمح بتحديثها). لكن المستندات تُنشأ معتمدة (validated_at غير null)، وليست مقفلة (is_locked false). لذا يمكن تحديثها، وهذا سيؤدي إلى حذف الأسطر وحركات المخزون القديمة تبقى. هذا خطير. يجب إما منع تحديث المستندات المعتمدة (باستثناء بعض الحالات)، أو عند تحديث الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها. ولكن منطق "لا مسودة، اعتماد فوري" يتعارض مع إمكانية التعديل. يبدو أن النظام يسمح بتعديل المستندات المعتمدة (طالما ليست مقفلة)، ولكن هذا قد يسبب مشاكل في المخزون. يجب توضيح منطق التعديل. ربما يفترض أن المستندات المعتمدة تُقفل تلقائياً بعد فترة، أو أن التعديل مسموح فقط للحقول غير المؤثرة في المخزون. لكن afterUpdate يسمح بتعديل الأسطر، مما يؤثر على المخزون. هذا تناقض.

CommercialDocumentService::beforeUpdate يمنع التحديث فقط إذا كان is_locked أو is_exported_to_accounting، ولكن لا يمنع التحديث إذا كان validated_at موجوداً (أي معتمد). هذا يعني أنه يمكن تعديل مستند معتمد (غير مقفل) بحرية. لكن تعديل الأسطر في مستند معتمد سيؤدي إلى تغيير الإجماليات وربما حركات المخزون القديمة تصبح غير صحيحة. هذا مشكلة كبيرة.

في afterUpdate، يتم حذف الأسطر القديمة بدون معاملة؟ يجب أن يتم ذلك داخل معاملة لضمان التكامل. BaseService ربما يقوم بمعاملة، ولكن يجب التحقق.

**createStockMovements يستخدم $document->warehouse_id، ولكن إذا كان warehouse_id فارغاً، فإنه يسجل تحذيراً فقط ولا ينشئ الحركات. هذا قد يؤدي إلى عدم تحديث المخزون لبعض المستندات التي ليس لها مستودع (مثل الفواتير بدون مستودع). لكن النموذج يتطلب warehouse_id في fillable وهو مطلوب في الطلب، لذا قد لا يحدث.

**recalculatePaymentAmounts يتم استدعاؤها في attachPayments، ولكنها لا تُستدعى في أي مكان آخر عند تحديث المدفوعات عبر API آخر. إذا تم تحديث دفعة مباشرة عبر PaymentController، فقد لا يتم تحديث paid_amount و remaining_amount في المستند. هذا نقص في التكامل.

CommercialDocumentService::resolveNumberingSeries يقوم بإنشاء سلسلة جديدة إذا لم يجد، ولكن قد يؤدي ذلك إلى إنشاء عدة سلاسل لنفس نوع المستند إذا لم تكن هناك سلسلة افتراضية. قد يكون من الأفضل إنشاء سلسلة افتراضية واحدة لكل نوع.

getExchangeRate يعيد 1.0 إذا لم يجد سعر صرف، مما قد يؤدي إلى استخدام سعر غير صحيح.

تحليل الواجهة الأمامية (React)
CommercialDocumentModal.tsx
مكون رئيسي لإضافة/تعديل المستند.

يستخدم useDocumentForm لإدارة الحالة.

يستخدم useDocumentLookups لجلب البيانات المساعدة.

يستخدم useQuery للحصول على المخزون الفعلي (/inventory/stock-at).

يستخدم useMutation لحفظ المستند، والتحقق من رقم المستند.

يحتوي على تحذيرات لتغيير العميل (الزبون) عند وجود دفعات أو أسطر.

يتحكم في إظهار/إخفاء الأعمدة.

يعرض الإجماليات والدفعات.

ملاحظات:

disableLines يُحدد بـ isLocked || isCancelled، ولكن المطلوب هو تعطيل الأسطر للمعتمدة أيضاً (وفقاً لـ disableLines في التعليق: "الأسطر — معطلة للمعتمدة (validated) وكذلك locked/cancelled"). في الكود، disableLines يعتمد فقط على isLocked || isCancelled، وليس على isValidated. هذا قد يسمح بتعديل الأسطر في المستندات المعتمدة (غير المقفلة وغير الملغاة). يجب تعديل المنطق ليشمل isValidated. لكن لاحظ أن isValidated يُعرّف بأنه !isLocked && VALIDATED_STATUSES.has(docStatusName). لذا إذا كان المستند معتمداً وغير مقفل، فإن disableLines سيكون false (لأنه فقط isLocked || isCancelled). هذا يسمح بتعديل الأسطر. قد يكون هذا مقصوداً إذا كان التعديل مسموحاً للمعتمدين (طالما غير مقفلين). ولكن حسب التعليق، يجب تعطيل الأسطر للمعتمدة. لذا هناك تناقض بين التعليق والتنفيذ.

disableFields يعتمد على isLocked || isCancelled، وليس على isValidated. هذا يسمح بتعديل الحقول الأساسية (الزبون، التاريخ، إلخ) حتى للمعتمدين. قد يكون هذا مقصوداً، ولكن يجب التأكد من أن الخلفية تسمح بذلك (وهي تسمح طالما غير مقفلة). لكن تغيير الزبون في مستند معتمد قد يؤثر على الدفعات؟ هناك تحذير لمنع تغيير الزبون عند وجود دفعات، وهذا جيد.

handlePartyChangeWithWarning تستخدم handlePartyChange من useDocumentForm، والذي يمنع تغيير الزبون إذا كان هناك دفعات أو إذا تغيرت فئة السعر مع وجود أسطر. هذا جيد.

saveMut ترسل document_number إذا كان التعديل، ولكن الخدمة لا تسمح بتغيير document_number (لا يوجد تحقق في beforeUpdate من document_number، لكن StoreCommercialDocumentRequest لا يسمح بـ document_number في الإنشاء، ولكن في التعديل يمكن إرساله. الخدمة لا تمنعه، لذا قد يتم تغيير رقم المستند بعد الإنشاء. هذا قد يسبب مشاكل في الترقيم. يجب منع تغيير document_number في beforeUpdate.

saveMut ترسل payments كجزء من payload. الخدمة تقوم بإنشاء دفعات جديدة في afterCreate، ولكن في afterUpdate لا تتعامل مع payments (لا تحديث للدفعات). لذا إذا تم تعديل مستند وإرسال دفعات جديدة، فإن الخدمة لن تتعامل معها. يجب إما منع تحديث الدفعات عبر هذه الواجهة، أو معالجتها في afterUpdate. حالياً، afterUpdate لا يقرأ payments من الطلب، لذا سيتم تجاهلها. هذا خطأ.

deleteMut تستخدم apiDelete('/documents/...') ولكن الخدمة تمنع الحذف (ترمي استثناء). لذا زر الحذف سيفشل دائماً. يجب إما إزالة زر الحذف أو تعديل الخدمة للسماح بالحذف (لكن المنطق يقول استخدم الإلغاء بدلاً من الحذف). لذلك زر الحذف غير مفيد.

deleteMut لا تتعامل مع is_locked، ولكن الخدمة سترفض الحذف إذا كان مقفلاً.

handleSave يتحقق من docNumber في حالة التعديل، لكن الخدمة لا تطلب document_number في التعديل (ربما تقبله). ولكن docNumber يتم جلب من existingDocument?.document_number، ويمكن تغييره. لكن كما ذكرنا، يجب منع تغييره.

handlePartyChangeWithWarning يستخدم handlePartyChange الذي يعيد blocked، ويظهر تحذير. جيد.

useDocumentForm.ts
يدير حالة النموذج، ويحتوي على منطق حساب الأسعار، الخصومات، الضرائب، إلخ.

buildLineFromApi يقرأ packaging و stockLot من العلاقات.

handlePartyChange يمنع تغيير الزبون إذا كانت هناك دفعات مرتبطة (بما في ذلك الدفعات الموجودة في النموذج والدفعات الموجودة في المستند الأصلي). جيد.

updateLine يعيد حساب الأسعار عند تغيير المنتج، التعبئة، الكمية، إلخ.

buildPayload يبني الكائن المرسل إلى API.

ملاحظات:

في buildPayload، عند حساب discount_percentage من discount_amount_fixed، يتم حساب نسبة مكافئة لإرسالها للباكاند. ولكن الباكاند يقبل discount_percentage فقط (لا يوجد discount_amount في CommercialDocumentLine model). ولكن CommercialDocumentLine يحتوي على discount_amount، ولكن في fillable يوجد discount_amount؟ في النموذج، $fillable يحتوي على discount_amount بالفعل. لذا يمكن إرسال discount_amount مباشرة. لكن StoreCommercialDocumentRequest لا يحتوي على discount_amount، فقط discount_percentage. في updateLine، يتم إرسال discount_percentage أو discount_amount حسب الوضع. ولكن الخدمة createDocumentLines تستخدم $lineData['discount_percentage'] فقط لحساب الخصم (تحسب discount_amount منها). إذا أرسلنا discount_amount مباشرة، فلن يتم استخدامه. لذا يجب تعديل الخدمة لقبول discount_amount كقيمة مباشرة للخصم (لكل سطر) أو إرسال discount_percentage فقط. حالياً، buildPayload يحسب نسبة مكافئة ويرسلها كـ discount_percentage، ويتجاهل discount_amount (يرسل discount_amount: 0). هذا يعني أن الخصم الثابت يُحوَّل إلى نسبة، وقد لا يكون دقيقاً بسبب التقريب. الأفضل أن ترسل الخدمة discount_amount وتستخدمه مباشرة، أو أن تقبل كلاهما وتختار الأولوية. يجب تعديل الخدمة لدعم discount_amount كحقل منفصل.

buildPayload يرسل payments فقط إذا كان هناك دفعات. ولكن الخدمة في afterCreate تتعامل مع payments، ولكن في afterUpdate لا تتعامل معها. لذا عند التعديل، سيتم تجاهل الدفعات الجديدة أو المعدلة. يجب إما دعم تحديث الدفعات في الخدمة، أو منع إرسال الدفعات في التعديل.

buildPayload يرسل apply_fiscal_stamp، ولكن الخدمة لا تستخدم هذا الحقل (تحسب الطابع تلقائياً من الإجماليات). في StoreCommercialDocumentRequest لا يوجد apply_fiscal_stamp. لذا هذا الحقل غير مستخدم في الخلفية. يمكن إزالته أو استخدامه لتجاوز حساب الطابع.

buildPayload يرسل price_level_id، ولكن الخدمة لا تستخدمه (لا يوجد حقل price_level_id في CommercialDocument). هذا الحقل يستخدم فقط في الواجهة لحساب الأسعار، ولا يخزن في قاعدة البيانات. يجب إزالته من payload.

useDocumentLookups.ts
يجلب البيانات المساعدة باستخدام React Query.

يستخدم apiGet مع المسارات النسبية (بدون slug)، لأن client.ts يضيف slug تلقائياً.

جيد.

ProductSearch.tsx
يستخدم createPortal لعرض القائمة المنسدلة لتجنب مشاكل overflow.

يعرض المخزون المتاح.

جيد.

document.utils.ts
دوال مساعدة خالصة.

calcFiscalStamp: 1% من TTC بحد أقصى 2500، ولا تطبق إذا كان TTC < 30000. هذا يتوافق مع الخلفية (FiscalStampCalculator). جيد.

resolvePrice: يحسب السعر بناءً على فئة السعر ونوع العملية.

resolveQuantityDiscount: يحسب خصم الكميات.

validateLineStock: يتحقق من كفاية المخزون.

جيد.

documents.ts (نقاط نهاية API)
يحتوي على دوال API للقائمة، العرض، الإنشاء، التحديث، الحذف، والإجراءات.

show يطلب العديد من العلاقات، وهذا جيد.

checkNumber للتحقق من تكرار الرقم.

useDocumentMutations يعيد استخدام useMutation مع تحديث الكاش.

جيد.

types.ts (الأنواع العامة)
يحتوي على تعريفات لـ CommercialDocument, CommercialDocumentLine, Payment, إلخ.

ملاحظة: CommercialDocument في types.ts يحتوي على status: DocumentStatusCode و amount_paid, amount_remaining. ولكن في النموذج الخلفي، الحقول هي remaining_amount و paid_amount. يجب تطابق الأسماء. في types.ts، amount_paid و amount_remaining، بينما في النموذج paid_amount و remaining_amount. هذا قد يسبب عدم تطابق عند استخدام الأنواع. يجب تصحيح types.ts ليتطابق مع النموذج.

CommercialDocumentLine في types.ts يحتوي على product_variant_id، بينما النموذج الخلفي يستخدم product_id. يجب توحيد.

queryKeys.ts
يحتوي على مفاتيح للكاش، جيد.

client.ts
عميل HTTP مع دعم CSRF، إضافة slug تلقائياً، إدارة الأخطاء.

apiGet, apiPost, إلخ.

جيد.

التكامل بين الواجهة والخلفية
الواجهة ترسل payments في payload، لكن الخلفية تتعامل معها فقط في الإنشاء، وليس التحديث.

الواجهة ترسل price_level_id، لكن الخلفية لا تخزنه.

الواجهة ترسل apply_fiscal_stamp، لكن الخلفية لا تستخدمه (تحسب الطابع تلقائياً).

الواجهة ترسل document_number في التحديث، ولكن الخلفية قد تسمح بتغييره (لا تمنعه).

الواجهة ترسل discount_amount محولة إلى نسبة، ولكن الخلفية لا تقبل discount_amount مباشرة.

الواجهة تستخدم amount_paid و amount_remaining في الأنواع، بينما الخلفية تستخدم paid_amount و remaining_amount.

الواجهة تستخدم product_variant_id، بينما الخلفية تستخدم product_id.

الأخطاء الرئيسية المكتشفة
تحديث المستندات المعتمدة (غير المقفلة) يسمح بتعديل الأسطر، مما يؤدي إلى عدم اتساق حركات المخزون. يجب إما منع تعديل الأسطر في المستندات المعتمدة، أو عند تعديل الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها.

تحديث الدفعات غير مدعوم في الخدمة عند تحديث المستند. سيتم تجاهل الدفعات المرسلة في الطلب.

إمكانية تغيير رقم المستند في التحديث، مما قد يكسر الترقيم.

discount_amount غير مدعوم في الخدمة، يتم تحويله إلى نسبة، مما قد يؤدي إلى عدم دقة.

عدم تمرير fiscal_year_id عند إنشاء الدفعات في attachPayments.

إمكانية تعديل سطر منفرد في وثيقة مقفلة لأن CommercialDocumentLineService لا يتحقق من is_locked.

generateDocumentNumber يعتمد على id بدلاً من document_number، قد يؤدي إلى تكرار الأرقام.

عدم التحقق من كفاية المخزون في الخلفية (لكن قد يكون مقصوداً).

عدم تطابق الأنواع بين الواجهة والخلفية (amount_paid vs paid_amount, product_variant_id vs product_id).

زر الحذف في الواجهة (سيؤدي إلى فشل لأن الخدمة تمنع الحذف).

الـ Observer CommercialDocumentObserver يحول الحالة إلى "paid" تلقائياً إذا أصبح remaining_amount صفراً. هذا جيد، ولكن قد يتعارض مع تحديثات يدوية.

في CommercialDocumentService::afterCreate، يتم إنشاء حركات المخزون باستخدام is_validated = true. هذا جيد.

في afterUpdate، يتم حذف الأسطر القديمة ولكن لا يتم حذف حركات المخزون المرتبطة. قد تظل حركات المخزون مرتبطة بمعرفات أسطر محذوفة، مما يسبب مشاكل.

عدم وجود معاملة لإنشاء حركات المخزون والأسطر معاً، ولكن BaseService قد يوفر ذلك.

CommercialDocumentService::createStockMovements يستخدم $document->warehouse_id، ولكن إذا كان المستند من نوع نقل (BT) قد يكون له مستودع مصدر ومستودع وجهة، ولكن النموذج يحتوي على warehouse_id واحد فقط. هذا يعني أن حركات المخزون لنقل المخزون غير مدعومة بشكل صحيح (تحتاج إلى حركتين: خروج من مستودع ودخول إلى آخر). ولكن BT له affects_stock_direction = 0، لذا لن يتم إنشاء حركات، وهذا صحيح لأن النقل يتطلب معالجة خاصة.

توصيات الإصلاح
تعديل منطق التعديل: منع تعديل الأسطر في المستندات المعتمدة (ما لم تكن مقفلة). يمكن إضافة تحقق في beforeUpdate من CommercialDocumentService يمنع التحديث إذا كان validated_at موجوداً وتم تغيير الأسطر. أو على الأقل، إذا تم تحديث الأسطر، يجب حذف حركات المخزون المرتبطة وإعادة إنشائها.

دعم تحديث الدفعات: إما منع تحديث الدفعات في التعديل (بجعل حقل payments للقراءة فقط في الواجهة)، أو تنفيذ منطق لتحديث الدفعات (حذف الدفعات القديمة وإنشاء جديدة أو تحديثها). الأسهل هو منع تغيير الدفعات بعد إنشاء المستند (إلا عبر واجهة منفصلة).

منع تغيير document_number: في beforeUpdate، تحقق من أن document_number لم يتغير، أو تجاهل الحقل.

دعم discount_amount: تعديل createDocumentLines لقبول discount_amount مباشرة، وإذا وُجد استخدمه بدلاً من حساب الخصم من النسبة.

تمرير fiscal_year_id عند إنشاء الدفعات: إضافة fiscal_year_id من المستند إلى Payment عند الإنشاء.

التحقق من is_locked في CommercialDocumentLineService: قبل السماح بتحديث أو حذف سطر، تحقق من حالة الوثيقة الأم.

تحسين generateDocumentNumber: استخدام orderByDesc('document_number') مع like للحصول على آخر رقم بشكل صحيح.

تصحيح الأنواع في types.ts: تطابق أسماء الحقول مع النموذج الخلفي (paid_amount, remaining_amount, product_id).

إزالة زر الحذف من الواجهة أو تعديل الخدمة للسماح بالحذف (ولكن منطق الإلغاء أفضل).

معالجة حركات المخزون عند تحديث الأسطر: حذف الحركات القديمة وإنشاء جديدة بعد تحديث الأسطر.

تعديل buildPayload لإزالة price_level_id و apply_fiscal_stamp إذا لم تستخدم في الخلفية.

إضافة تحقق من allow_negative_stock في الخلفية: إذا كان false، ارفض البيع إذا كانت الكمية المطلوبة أكبر من المخزون.

خلاصة الأخطاء المكتشفة
سنقوم بتعداد الأخطاء بشكل واضح.

خطأ في CommercialDocumentService::attachPayments: لا يمرر fiscal_year_id عند إنشاء Payment.

خطأ في CommercialDocumentLineService: لا يتحقق من is_locked للوثيقة الأم، مما يسمح بتعديل سطر في وثيقة مقفلة.

خطأ في generateDocumentNumber: يعتمد على id وليس على document_number، مما قد يؤدي إلى تكرار الأرقام.

خطأ في CommercialDocumentService::afterUpdate: لا يحذف حركات المخزون المرتبطة بالأسطر القديمة، مما يسبب عدم اتساق.

خطأ في CommercialDocumentService::beforeUpdate: لا يمنع تعديل الأسطر في المستندات المعتمدة (غير المقفلة)، مما يسمح بتغيير الإجماليات والمخزون بعد الاعتماد.

خطأ في CommercialDocumentService::afterUpdate: يتجاهل payments المرسلة في الطلب، لذا لا يمكن تحديث الدفعات.

خطأ في CommercialDocumentService::beforeUpdate: لا يمنع تغيير document_number، مما قد يكسر الترقيم.

خطأ في createDocumentLines: لا يدعم discount_amount كقيمة مباشرة، بل يحسب من discount_percentage فقط، مما يضيع قيمة الخصم الثابت.

خطأ في CommercialDocumentModal.tsx: disableLines لا يشمل isValidated، مما يسمح بتعديل الأسطر في المستندات المعتمدة (وهو ما ذكرناه).

خطأ في types.ts: عدم تطابق أسماء الحقول (amount_paid vs paid_amount, amount_remaining vs remaining_amount, product_variant_id vs product_id).

خطأ في buildPayload: يرسل price_level_id و apply_fiscal_stamp وهما غير مستخدمين في الخلفية.

خطأ في CommercialDocumentModal.tsx: زر الحذف موجود ولكن الخدمة تمنع الحذف، مما سيؤدي إلى فشل دائم.

خطأ في CommercialDocumentService::createStockMovements: لا يتحقق من allow_negative_stock، مما قد يسمح ببيع كمية أكبر من المخزون.

خطأ في CommercialDocumentService::resolveNumberingSeries: قد ينشئ سلسلة جديدة لكل طلب إذا لم يجد، مما يؤدي إلى تكرار السلاسل.
