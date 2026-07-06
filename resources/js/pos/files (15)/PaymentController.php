<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Services\PaymentService;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;

class PaymentController extends BaseApiController
{
    protected string $resourceName = 'payment';
    protected ?string $resourceClass = PaymentResource::class;

    public function __construct(private PaymentService $paymentService)
    {
        parent::__construct();
    }

    protected function getService(): PaymentService
    {
        return $this->paymentService;
    }

    protected function getModelClass(): string
    {
        return Payment::class;
    }

    /**
     * ✅ تصحيح جوهري: BaseApiController::store(Request $request) يستقبل
     * Request عام، و getValidatedData() تتحقق فقط: "هل هذا instanceof
     * FormRequest؟" — بما أن PaymentController لم يكن يُعرِّف store() بنفسه
     * إطلاقاً، كان يرث النسخة العامة بدون أي type-hint خاص، فتُستدعى
     * $request->all() دائماً و StorePaymentRequest لا يُشغَّل أبداً — أي
     * قواعد التحقق (amount > 0، treasury_account_id مطلوب، إلخ) لم تكن
     * تُنفَّذ فعلياً لأي دفعة مستقلة تُنشأ عبر هذا الكونترولر.
     *
     * بمجرد type-hint الكلاس هنا، Laravel يُحوِّل الحقن (DI) تلقائياً
     * ليُنشئ StorePaymentRequest ويُشغِّل rules() قبل وصول التنفيذ لهذا الجسم،
     * والجسم نفسه (الموروث من BaseApiController) يكتشف instanceof FormRequest
     * ويستخدم ->validated() تلقائياً — لا حاجة لإعادة كتابة أي منطق آخر.
     */
    public function store(StorePaymentRequest $request): JsonResponse
    {
        return parent::store($request);
    }

    /**
     * ✅ نفس التصحيح لمسار التحديث.
     */
    public function update(UpdatePaymentRequest $request, $id): JsonResponse
    {
        return parent::update($request, $id);
    }

    public function confirmed()
    {
        return $this->getService()->getConfirmed();
    }

    public function pending()
    {
        return $this->getService()->getPending();
    }
}
