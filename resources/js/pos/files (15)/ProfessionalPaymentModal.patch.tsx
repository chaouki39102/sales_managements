// ════════════════════════════════════════════════════════════════════════════
// patch: resources/js/pos/components/ProfessionalPaymentModal.tsx
// ════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────
// 1) أضف documentDate للـProps — تاريخ الفاتورة الحقيقي (اليوم لفاتورة
//    جديدة، أو تاريخ الفاتورة الأصلي عند إعادة الفتح للتعديل)
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal,
  existingPayments, onClose, onConfirm,
}: Props) {

// استبدل بـ:
export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal,
  existingPayments, onClose, onConfirm,
  documentDate,   // ✅ جديد — راجع بند التاريخ أدناه
}: Props) {


// ─────────────────────────────────────────────────────────────────────────
// 2) تصحيح ep.amount.toFixed(2) — حماية ضد وصول نص من الخلفية
//    (حتى بعد تصحيح PaymentResource.php من الجذر، هذا خط دفاع ثانٍ رخيص
//    ولا يضر أبداً — "toFixed" فقط لو ضَمِنّا رقماً أولاً)
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
    if (existingPayments?.length) {
      return existingPayments.map(ep => ({
        id:                 uid(),
        dbId:               ep.id,
        modeId:             ep.payment_mode_id,
        amount:             ep.amount.toFixed(2),
        refNote:            ep.reference ?? '',
        treasuryAccountId:  ep.treasury_account_id ?? null,
      }));
    }

// استبدل بـ:
    if (existingPayments?.length) {
      return existingPayments.map(ep => ({
        id:                 uid(),
        dbId:               ep.id,
        modeId:             ep.payment_mode_id,
        amount:             Number(ep.amount || 0).toFixed(2),   // ✅ Number() قبل toFixed
        refNote:            ep.reference ?? '',
        treasuryAccountId:  ep.treasury_account_id ?? null,
      }));
    }


// ─────────────────────────────────────────────────────────────────────────
// 3) تصحيح activeLineId — كان يبدأ بقيمة عشوائية غير فارغة فلا يُصحَّح أبداً
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
  /** الـ line النشط الذي يتلقى مدخلات الـ numpad */
  const [activeLineId, setActiveLineId] = useState<string | null>(
    () => (defaultMode ? uid() : null),
  );

  // نُوحِّد activeLineId مع أول line عند التهيئة
  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lines.length && !activeLineId) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);

// استبدل بـ:
  /** الـ line النشط الذي يتلقى مدخلات الـ numpad */
  // ✅ تصحيح: كان يُولَّد uid() عشوائي هنا لا يطابق أي id حقيقي لأي سطر —
  // ما يجعل شرط "!activeLineId" بالأسفل يفشل دائماً (القيمة ليست فارغة أبداً)
  // فلا تتم مزامنته أبداً مع lines[0].id الحقيقي. البداية الصحيحة: null دائماً.
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  // نُوحِّد activeLineId مع أول line عند التهيئة (وعند أي تغيير لاحق في lines
  // يصبح فيه activeLineId لم يعد يطابق أي سطر موجود فعلاً — مثال: حذف السطر
  // النشط نفسه)
  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    const stillValid = lines.some(l => l.id === activeLineId);
    if (lines.length && !stillValid) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);


// ─────────────────────────────────────────────────────────────────────────
// 4) توحيد existingTotal — كانت محسوبة مرتين بنفس الصيغة غير المحمية
//    (مرة داخل useEffect الرصيد، ومرة كـ useMemo منفصل بالأسفل)
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن (احذف هذا الـuseMemo الموجود بالأسفل — سنستخدم مصدراً واحداً):
  const existingTotal = useMemo(
    () => (existingPayments ?? []).reduce((s, p) => s + p.amount, 0),
    [existingPayments],
  );

// استبدل بـ:
  // ✅ مصدر واحد فقط لهذا الحساب الآن (كان مكرراً هنا وأيضاً داخل useEffect
  // الرصيد بالأسفل، بنفس الصيغة غير المحمية من نصوص محتملة)
  const existingTotal = useMemo(
    () => (existingPayments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0),
    [existingPayments],
  );

// ─────────────────────────────────────────────────────────────────────────
// 5) استخدام existingTotal الموحّد داخل useEffect الرصيد بدل إعادة حسابه،
//    + تمرير documentDate لـpartyBalancesApi بدل الاعتماد على الرصيد اللحظي
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن:
  useEffect(() => {
    if (!client?.id) {
      setInternalPrevBalance(0);
      return;
    }
    setBalanceLoading(true);
    partyBalancesApi.getOne(client.id)
      .then(res => {
        const data = (res as any)?.data ?? res;
        const currentBalance = Number(data?.current_balance ?? 0);
        if (existingPayments?.length) {
          const existingTotal = existingPayments.reduce((s, p) => s + p.amount, 0);
          const remainingOnInvoice = Math.max(0, totalTtcFinal - existingTotal);
          setInternalPrevBalance(Math.max(0, currentBalance - remainingOnInvoice));
        } else {
          setInternalPrevBalance(Math.max(0, currentBalance));
        }
      })
      .catch(() => setInternalPrevBalance(0))
      .finally(() => setBalanceLoading(false));
  }, [client?.id, existingPayments, totalTtcFinal]);

// استبدل بـ:
  useEffect(() => {
    if (!client?.id) {
      setInternalPrevBalance(0);
      return;
    }
    setBalanceLoading(true);
    // ✅ تصحيح جذري: نطلب الرصيد "كما كان قبل تاريخ هذه الفاتورة تحديداً"
    // بدل جلب الرصيد اللحظي الحالي والتخمين العكسي بطرحه من المتبقي — تلك
    // الطريقة القديمة تفترض ضمنياً عدم وجود أي نشاط مالي آخر للزبون بين
    // إنشاء الفاتورة وإعادة فتحها، وهو افتراض ينكسر في أي متجر نشط.
    // الـAPI (partyBalancesApi.getOne) يدعم فعلياً معامل date منذ البداية.
    partyBalancesApi.getOne(client.id, documentDate)
      .then(res => {
        const data = (res as any)?.data ?? res;
        const currentBalance = Number(data?.current_balance ?? 0);
        // بما أن الاستعلام بالتاريخ يُرجِع أصلاً الرصيد "قبل" هذه الفاتورة،
        // لا حاجة لأي طرح إضافي — القيمة صحيحة كما هي.
        setInternalPrevBalance(Math.max(0, currentBalance));
      })
      .catch(() => setInternalPrevBalance(0))
      .finally(() => setBalanceLoading(false));
  }, [client?.id, documentDate]);


// ─────────────────────────────────────────────────────────────────────────
// 6) تعريف الـProps — أضف documentDate (اختياري)
// ─────────────────────────────────────────────────────────────────────────

// ابحث عن تعريف interface Props (أعلى الملف)، وأضف السطر التالي داخله:
  documentDate?: string;   // ISO date — تاريخ الفاتورة الحقيقي لجلب الرصيد التاريخي الصحيح
