// ════════════════════════════════════════════════════════════════════════════
// patch: app/Services/PaymentService.php
// ════════════════════════════════════════════════════════════════════════════

// ── 1) أضف use للـ trait الجديد، بجانب باقي use ──

// ابحث عن:
use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

// استبدل بـ:
use App\Core\Services\Concerns\ResolvesPaymentDirection;
use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;


// ── 2) استخدم الـ trait في الكلاس ──

// ابحث عن:
class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model        = Payment::class;
    protected string $resourceName = 'payment';

// استبدل بـ:
class PaymentService extends \App\Core\Services\BaseService
{
    use ResolvesPaymentDirection;

    protected string $model        = Payment::class;
    protected string $resourceName = 'payment';


// ── 3) استبدل كل نداء resolveDirection($x) بـ resolveDirectionFromData($x) ──
// (3 مواضع: beforeCreate, prepareDataForUpdate)

// ابحث عن:
        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection($data);
        }

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate — void (متوافق مع BaseService)

// استبدل بـ:
        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirectionFromData($data);
        }

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate — void (متوافق مع BaseService)

// ابحث عن:
        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection(
                array_merge($item->toArray(), $data)
            );
        }

// استبدل بـ:
        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirectionFromData(
                array_merge($item->toArray(), $data)
            );
        }


// ── 4) احذف الدوال الخاصة المكرَّرة بالكامل من نهاية الكلاس ──
// (أصبحت في الـtrait الآن — تركها هنا يُسبب تعارض تعريف method)

// ابحث عن واحذف بالكامل هذا الجزء:
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
     *   party + sale أو unknown  → in  (نقبض من الزبون)
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

// استبدل بـ:
}
// (فقط قوس إغلاق الكلاس — كل الدوال الثلاث حُذفت لأنها الآن في ResolvesPaymentDirection)


// ملاحظة: الدوال العامة (afterCreate/afterUpdate/afterDelete) التي تستدعي
// adjustTreasuryBalance و oppositeDirection لا تحتاج أي تعديل — التوقيع
// (signature) مطابق تماماً لما كان، فقط انتقل التنفيذ للـtrait.
