// ════════════════════════════════════════════════════════════════════════════
// patch: resources/js/pages/pos/POSPage.tsx
// ════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────
// 1) الجذر — حذف إعادة الحساب المكرِّرة للخصم بالكامل.
//    calcTotals() (داخل usePOS.ts) تُطبِّق invoiceDiscountPct بشكل صحيح
//    وكامل من البداية، وتُرجعه ضمن pos.totals (total_ht/total_tva/total_ttc
//    هي بالفعل الأرقام الصحيحة بعد الخصم). الكتلة التالية كانت تُعيد تطبيق
//    نفس النسبة المئوية على أرقام مخصومة أصلاً → خصم مضاعف حقيقي يقلل ما
//    يُحصَّل من الزبون فعلياً في كل فاتورة فيها "خصم فاتورة".
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن (السطور 505–527 تقريباً):
  // ── Invoice discount ───────────────────────────────────────────────────────
  const invoiceDiscountPct    = pos.invoiceDiscountPct;
  const invoiceDiscountAmount = useMemo(() => {
    if (!invoiceDiscountPct || invoiceDiscountPct <= 0) return 0;
    return Math.round(pos.totals.total_ht * invoiceDiscountPct / 100 * 100) / 100;
  }, [pos.totals.total_ht, invoiceDiscountPct]);

  const adjustedTotalHt  = pos.totals.total_ht - invoiceDiscountAmount;
  const adjustedTotalTva = useMemo(() => {
    if (!pos.totals.total_ht) return pos.totals.total_tva;
    return pos.items.reduce((s, i) => {
      const itemHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
      const share  = itemHt / pos.totals.total_ht;
      return s + (itemHt - invoiceDiscountAmount * share) * i.tva_rate / 100;
    }, 0);
  }, [pos.items, pos.totals.total_ht, invoiceDiscountAmount]);

  const adjustedTotalTtcFinal = adjustedTotalHt + adjustedTotalTva + pos.totals.fiscal_stamp;
  const existingPaymentsSum = useMemo(
    () => pos.payments.reduce((s, p) => s + p.amount, 0),
    [pos.payments],
  );
  const remainingToPay = Math.max(0, adjustedTotalTtcFinal - existingPaymentsSum);

// استبدل بـ:
  // ── Invoice discount ───────────────────────────────────────────────────────
  // ✅ تصحيح جذري: pos.totals (من calcTotals) تُطبِّق الخصم بالفعل ومرة واحدة
  // فقط. لا حاجة — ولا يجوز — إعادة حسابه هنا. نكتفي بقراءة القيم الجاهزة.
  const invoiceDiscountPct    = pos.invoiceDiscountPct;
  const invoiceDiscountAmount = pos.totals.invoice_discount_amount ?? 0;

  // القيم أصبحت مباشرة = pos.totals (لا "تعديل" إضافي)، أُبقي الأسماء القديمة
  // لتفادي تعديل كل نقطة استهلاك أخرى بالملف تستخدم هذه المتغيرات بالاسم.
  const adjustedTotalHt       = pos.totals.total_ht;
  const adjustedTotalTva      = pos.totals.total_tva;
  const adjustedTotalTtcFinal = pos.totals.total_ht + pos.totals.total_tva + pos.totals.fiscal_stamp;

  // ✅ حماية إضافية: existingPaymentsSum كان بلا Number() — لو وصل مبلغ
  // كنص من الخلفية (قبل تفعيل تصحيح PaymentResource) سينتج دمج نصوص بدل جمع.
  const existingPaymentsSum = useMemo(
    () => pos.payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [pos.payments],
  );
  const remainingToPay = Math.max(0, adjustedTotalTtcFinal - existingPaymentsSum);


// ─────────────────────────────────────────────────────────────────────────
// 2) داخل handleCompleteSale — تصحيح مقام lineDiscountShare.
//    كان يقسّم HT الخام لكل سطر على currentTotals.total_ht الذي هو بالفعل
//    "بعد خصم الفاتورة" (نفس جذر المشكلة أعلاه) — فتنتفخ حصة كل سطر من
//    الخصم، وتُخزَّن نسبة خصم أعلى من الصحيح في الفاتورة المحفوظة بالقاعدة.
//    الحل: نحسب المجموع الخام (قبل خصم الفاتورة) محلياً كمقام صحيح.
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
      const lineDiscountShare = currentInvDisc > 0
        ? currentItems.map(i => {
            const lineHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
            const share  = currentTotals.total_ht > 0 ? lineHt / currentTotals.total_ht : 0;
            return share * currentInvDisc;
          })
        : currentItems.map(() => 0);

// استبدل بـ:
      // ✅ تصحيح: المقام يجب أن يكون مجموع HT الخام (قبل خصم الفاتورة)،
      // وليس currentTotals.total_ht (وهو بعد الخصم بالفعل من calcTotals).
      const rawTotalHtBeforeInvoiceDiscount = currentItems.reduce(
        (s, i) => s + i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100),
        0,
      );
      const lineDiscountShare = currentInvDisc > 0
        ? currentItems.map(i => {
            const lineHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
            const share  = rawTotalHtBeforeInvoiceDiscount > 0 ? lineHt / rawTotalHtBeforeInvoiceDiscount : 0;
            return share * currentInvDisc;
          })
        : currentItems.map(() => 0);


// ─────────────────────────────────────────────────────────────────────────
// 3) تمرير تاريخ الفاتورة الحقيقي لـpartyBalancesApi بدل الاعتماد على
//    الرصيد اللحظي الحالي فقط + تصحيح صيغة الحساب العكسي الهشة.
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
    if (currentClient?.id) {
      try {
        const balanceRes = await partyBalancesApi.getOne(currentClient.id);
        const balanceData = (balanceRes as any)?.data ?? balanceRes;
        const currentBalance = Number(balanceData?.current_balance ?? 0);
        prevBalance = Math.max(0, currentBalance - totalTtcFinal + params.amountPaid);
        newBalance = prevBalance + invoiceRemaining;
      } catch {}
    }

// استبدل بـ:
    if (currentClient?.id) {
      try {
        // ✅ نطلب رصيد الزبون كما كان قبل تاريخ هذه الفاتورة تحديداً، بدل
        // محاولة "التخمين العكسي" من الرصيد اللحظي — الطريقة القديمة تفترض
        // ضمنياً عدم وجود أي حركة أخرى للزبون بين إنشاء الفاتورة وهذه اللحظة،
        // وهو افتراض ينكسر بسرعة في أي متجر نشط.
        const asOfDate = commonPayload.document_date; // نفس تاريخ الفاتورة المُنشأة/المُعدَّلة الآن
        const balanceRes = await partyBalancesApi.getOne(currentClient.id, asOfDate);
        const balanceData = (balanceRes as any)?.data ?? balanceRes;
        // هذا الرصيد المُرجَع هو "قبل" هذه الفاتورة (لأن التاريخ يستثنيها)
        prevBalance = Math.max(0, Number(balanceData?.current_balance ?? 0));
        newBalance  = prevBalance + invoiceRemaining;
      } catch {}
    }


// ─────────────────────────────────────────────────────────────────────────
// 4) تتبّع تاريخ الفاتورة الحقيقي وتمريره لـProfessionalPaymentModal
//    (مطلوب لتصحيح "الرصيد السابق" في ProfessionalPaymentModal.patch.tsx)
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن (بجانب تعريف editingDocumentId/editingDocStatus):
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocStatus,  setEditingDocStatus]  = useState<string | null>(null);

// استبدل بـ:
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocStatus,  setEditingDocStatus]  = useState<string | null>(null);
  // ✅ جديد — تاريخ الفاتورة الأصلية عند إعادة فتحها للتعديل (null = فاتورة جديدة اليوم)
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);


// ابحث عن (داخل handleOpenInvoice، عند تحميل المستند):
    useCartStore.setState({ items, client: doc.party ?? null, payments });

// استبدل بـ:
    useCartStore.setState({ items, client: doc.party ?? null, payments });
    setEditingDocumentDate(doc.document_date ?? null);   // ✅ جديد


// ابحث عن كل موضع يظهر فيه معاً (مسح السلة، بعد نجاح البيع):
    setEditingDocumentId(null);
    setEditingDocStatus(null);

// واستبدله في كل مرة بـ:
    setEditingDocumentId(null);
    setEditingDocStatus(null);
    setEditingDocumentDate(null);   // ✅ جديد


// ابحث عن (في الـJSX، عند استدعاء ProfessionalPaymentModal):
          totalTtcFinal={adjustedTotalTtcFinal}
          existingPayments={pos.payments}
          onClose={() => setModal('none')}
          onConfirm={handleCompleteSale}

// استبدل بـ:
          totalTtcFinal={adjustedTotalTtcFinal}
          existingPayments={pos.payments}
          documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}   // ✅ جديد
          onClose={() => setModal('none')}
          onConfirm={handleCompleteSale}
