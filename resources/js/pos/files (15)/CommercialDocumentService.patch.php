// ════════════════════════════════════════════════════════════════════════════
// patch: app/Services/CommercialDocumentService.php
// ════════════════════════════════════════════════════════════════════════════

// ── 1) أضف use للـ trait ──

// ابحث عن:
use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;

// استبدل بـ:
use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ResolvesPaymentDirection;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;


// ── 2) استخدم الـ trait بجانب ValidatesTenantRelations ──

// ابحث عن:
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

// استبدل بـ:
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;
    use ResolvesPaymentDirection;


// ── 3) استبدل كل نداءات resolvePaymentDirection($document) بـ
//      resolveDirectionFromDocument($document) — 3 مواضع داخل syncPayments

// ابحث عن (موضع 1 — عند الحذف):
            $payment = Payment::find($paymentId);
            if ($payment && $payment->status === 'confirmed' && $payment->treasury_account_id) {
                $this->adjustTreasuryBalance(
                    (int) $payment->treasury_account_id,
                    (float) $payment->amount,
                    $this->oppositeDirection($this->resolvePaymentDirection($document)),
                );
            }

// استبدل بـ:
            $payment = Payment::find($paymentId);
            if ($payment && $payment->status === 'confirmed' && $payment->treasury_account_id) {
                $this->adjustTreasuryBalance(
                    (int) $payment->treasury_account_id,
                    (float) $payment->amount,
                    $this->oppositeDirection($this->resolveDirectionFromDocument($document)),
                );
            }

// ─────────────────────────────────────────────────────────────────────────

// ابحث عن (موضع 2 — عند تحديث دفعة موجودة):
                $oldAmount = (float) $payment->amount;
                $oldAccountId = (int) $payment->treasury_account_id;
                $oldDirection = $this->resolvePaymentDirection($document);

// استبدل بـ:
                $oldAmount = (float) $payment->amount;
                $oldAccountId = (int) $payment->treasury_account_id;
                $oldDirection = $this->resolveDirectionFromDocument($document);

// ─────────────────────────────────────────────────────────────────────────

// ابحث عن (موضع 3 — عند إنشاء دفعة جديدة):
                // ── INSERT جديد ──────────────────────────────────────────
                $direction = $this->resolvePaymentDirection($document);

// استبدل بـ:
                // ── INSERT جديد ──────────────────────────────────────────
                $direction = $this->resolveDirectionFromDocument($document);


// ── 4) احذف الدوال الخاصة المكرَّرة (أصبحت في الـtrait) ──

// ابحث عن واحذف بالكامل:
    // PRIVATE: تحديد اتجاه الدفعة للخزينة

    private function resolvePaymentDirection(CommercialDocument $document): string
    {
        $baseOp = $document->documentType?->documentBaseOperation?->name;
        if ($baseOp === 'purchase') return 'out';
        return 'in';
    }

    private function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: تعديل رصيد الخزينة (denormalized cache)
    // ═══════════════════════════════════════════════════════════════════════

    private function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        if ($accountId <= 0 || $amount <= 0) return;

        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }

// استبدل بـ:
    // (حُذفت الدوال الثلاث — أصبحت في App\Core\Services\Concerns\ResolvesPaymentDirection)

// ملاحظة: باقي استدعاءات adjustTreasuryBalance() في نفس الملف (داخل syncPayments
// للحالات INSERT/UPDATE) لا تحتاج أي تعديل — التوقيع مطابق، فقط التنفيذ انتقل
// للـtrait.
