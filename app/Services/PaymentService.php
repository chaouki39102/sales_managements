<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * PaymentService — النسخة المُصلحة
 * ══════════════════════════════════════════════════════════════════
 *
 * جذر مشكلة 500:
 *   النسخة القديمة: beforeUpdate(): array  ← تعارض مع BaseService: void
 *   PHP يرفض تحميل الكلاس نهائياً → 500 حتى على GET /payments
 *
 * الإصلاح الصحيح (متوافق مع بنية BaseService):
 *   BaseService::update() يفصل المسؤوليات:
 *     beforeUpdate()        → void  (تحقق + رفع exception)
 *     prepareDataForUpdate()→ array (تعديل البيانات قبل الحفظ) ← هنا نضع direction
 *
 *   ✅ نحذف beforeUpdate() من PaymentService
 *   ✅ نُضيف prepareDataForUpdate() بدلاً منه
 *   ✅ beforeCreate() لا يوجد تعارض (يُعيد array في BaseService أيضاً)
 *
 * direction (in/out):
 *   يُحدَّد تلقائياً إن لم يُرسَل من الواجهة:
 *   - بدون party                → out (مصروف)
 *   - party + sale/unknown      → in  (عميل يدفع)
 *   - party + purchase          → out (نحن ندفع للمورد)
 *
 * current_balance على TreasuryAccount:
 *   cache مُحدَّث فورياً بعد كل عملية مؤكدة.
 *   المصدر الحقيقي: TreasuryBalanceService::getTreasuryBalanceAt()
 * ══════════════════════════════════════════════════════════════════
 */
class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model        = Payment::class;
    protected string $resourceName = 'payment';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: beforeCreate — يُعيد array (متوافق مع BaseService)
    // ═══════════════════════════════════════════════════════════════

    /**
     * تحديد direction تلقائياً قبل الإنشاء إن لم يُرسَل.
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection($data);
        }

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate — void (متوافق مع BaseService)
    // للتحقق فقط، لا تعديل بيانات
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ void — متطابق مع BaseService::beforeUpdate(): void
     * التحقق من القيود فقط (لا تعديل بيانات هنا).
     */
    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        // مثال: منع تعديل دفعة ملغاة
        // if ($item->status === 'cancelled') {
        //     throw new BusinessRuleException('لا يمكن تعديل دفعة ملغاة.', 409);
        // }
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: prepareDataForUpdate — array (هنا يتم تعديل البيانات)
    // BaseService::update() يستدعيه بعد beforeUpdate
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ هنا نُحدِّد direction عند التعديل — بدل beforeUpdate القديم.
     * BaseService::update() flow:
     *   1. beforeUpdate($item, $data) → void  (تحقق)
     *   2. prepareDataForUpdate($item, $data) → array  (تعديل)
     *   3. $item->update($prepared)
     *   4. afterUpdate($item, $data)
     */
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        $data = parent::prepareDataForUpdate($item, $data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection(
                array_merge($item->toArray(), $data)
            );
        }

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: afterCreate
    // ═══════════════════════════════════════════════════════════════

    /**
     * بعد إنشاء دفعة مؤكدة: زيادة/نقصان رصيد الخزينة.
     */
    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance(
            (int)   $item->treasury_account_id,
            (float) $item->amount,
            (string)$item->direction
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: afterUpdate
    // ═══════════════════════════════════════════════════════════════

    /**
     * بعد تعديل دفعة: تصحيح رصيد الخزينة بالفرق.
     *
     * المنطق:
     * - إذا تغيَّر الحساب: اعكس التأثير على القديم، طبِّق على الجديد.
     * - نفس الحساب: اعكس المبلغ القديم ثم طبِّق الجديد.
     */
    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        $oldStatus    = $item->getOriginal('status');
        $oldAmount    = (float)  $item->getOriginal('amount');
        $oldDirection = (string)($item->getOriginal('direction') ?? 'in');
        $oldAccountId = (int)    $item->getOriginal('treasury_account_id');
        $newAccountId = (int)    $item->treasury_account_id;

        // الحساب تغيَّر: عكس القديم + تطبيق الجديد
        if ($oldAccountId !== $newAccountId) {
            if ($oldStatus === 'confirmed') {
                $this->adjustTreasuryBalance(
                    $oldAccountId, $oldAmount,
                    $this->oppositeDirection($oldDirection)
                );
            }
            if ($item->status === 'confirmed') {
                $this->adjustTreasuryBalance(
                    $newAccountId, (float)$item->amount, $item->direction
                );
            }
            return;
        }

        // نفس الحساب: اعكس القديم ثم طبِّق الجديد
        if ($oldStatus === 'confirmed') {
            $this->adjustTreasuryBalance(
                $newAccountId, $oldAmount,
                $this->oppositeDirection($oldDirection)
            );
        }
        if ($item->status === 'confirmed') {
            $this->adjustTreasuryBalance(
                $newAccountId, (float)$item->amount, $item->direction
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: afterDelete
    // ═══════════════════════════════════════════════════════════════

    /**
     * بعد حذف دفعة مؤكدة: عكس التأثير على الخزينة.
     */
    protected function afterDelete(Model $item): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance(
            (int)   $item->treasury_account_id,
            (float) $item->amount,
            $this->oppositeDirection($item->direction)
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API — للـ Controller
    // ═══════════════════════════════════════════════════════════════

    public function getConfirmed()
    {
        return Payment::confirmed()->get();
    }

    public function getPending()
    {
        return Payment::pending()->get();
    }

    // ═══════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * تحديث current_balance كـ denormalized cache على TreasuryAccount.
     * المصدر الحقيقي: TreasuryBalanceService::getTreasuryBalanceAt()
     */
    private function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        if ($accountId <= 0 || $amount <= 0) return;

        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }

    /**
     * تحديد direction من بيانات الدفعة:
     *   بدون party               → out (مصروف)
     *   party + purchase          → out (ندفع للمورد)
     *   party + sale أو unknown  → in  (نقبض من العميل)
     */
    private function resolveDirection(array $data): string
    {
        if (empty($data['party_id'])) {
            return 'out';
        }

        if (($data['document_base_operation'] ?? null) === 'purchase') {
            return 'out';
        }

        return 'in';
    }

    private function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }
}
