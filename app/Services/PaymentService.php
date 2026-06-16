<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;

/**
 * PaymentService
 * ══════════════════════════════════════════════════════════════════
 * afterCreate / afterUpdate / afterDelete:
 *   يُحدِّث current_balance على TreasuryAccount كـ denormalized cache
 *   للعرض السريع في الواجهة (بدل استدعاء getTreasuryBalanceAt() في كل مرة).
 *
 * direction (in/out):
 *   يُحدَّد تلقائياً من party_id + document_base_operation:
 *   - دفعة من عميل (sale)   → in  (يزيد الخزينة)
 *   - دفعة لمورد (purchase) → out (ينقص الخزينة)
 *   - إذا لم يكن هناك party (مصروف مثلاً) → out افتراضياً
 *
 * ملاحظة: current_balance هو cache فقط — المصدر الحقيقي هو
 * TreasuryBalanceService::getTreasuryBalanceAt().
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

    /**
     * تحديد direction تلقائياً قبل الإنشاء إن لم يُرسَل من الواجهة.
     */
    protected function beforeCreate(array $data, $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection($data);
        }

        return $data;
    }

    protected function beforeUpdate(Model $item, array $data, $request): array
    {
        $data = parent::beforeUpdate($item, $data, $request);

        if (empty($data['direction'])) {
            $data['direction'] = $this->resolveDirection(
                array_merge($item->toArray(), $data)
            );
        }

        return $data;
    }

    /**
     * بعد إنشاء دفعة مؤكدة: زيادة/نقصان رصيد الخزينة.
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
    }

    /**
     * بعد تحديث دفعة: تصحيح رصيد الخزينة بالفرق.
     */
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $oldStatus    = $item->getOriginal('status');
        $oldAmount    = (float) $item->getOriginal('amount');
        $oldDirection = $item->getOriginal('direction');
        $oldAccountId = $item->getOriginal('treasury_account_id');

        // إذا تغيّر الحساب البنكي: نعكس التأثير على القديم ونطبّق على الجديد
        if ($oldAccountId !== $item->treasury_account_id) {
            if ($oldStatus === 'confirmed') {
                $this->adjustTreasuryBalance($oldAccountId, $oldAmount, $this->oppositeDirection($oldDirection));
            }
            if ($item->status === 'confirmed') {
                $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
            }
            return;
        }

        // نفس الحساب: احسب الفرق فقط
        $wasConfirmed = $oldStatus === 'confirmed';
        $isConfirmed  = $item->status === 'confirmed';

        if ($wasConfirmed) {
            $this->adjustTreasuryBalance($item->treasury_account_id, $oldAmount, $this->oppositeDirection($oldDirection));
        }

        if ($isConfirmed) {
            $this->adjustTreasuryBalance($item->treasury_account_id, $item->amount, $item->direction);
        }
    }

    /**
     * بعد حذف دفعة مؤكدة: عكس التأثير على الخزينة.
     */
    protected function afterDelete(Model $item): void
    {
        if ($item->status !== 'confirmed') return;

        $this->adjustTreasuryBalance(
            $item->treasury_account_id,
            $item->amount,
            $this->oppositeDirection($item->direction)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * تحديث current_balance كـ cache.
     */
    private function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }

    /**
     * تحديد direction من نوع العملية:
     *   - دفعة من عميل (sale)   → in
     *   - دفعة لمورد (purchase) → out
     *   - بدون party            → out (مصروف)
     */
    private function resolveDirection(array $data): string
    {
        if (empty($data['party_id'])) {
            return 'out';
        }

        // نتحقق من نوع المتعامل عبر partyType
        $partyTypeName = \Illuminate\Support\Facades\DB::table('parties as p')
            ->join('party_types as pt', 'p.party_type_id', '=', 'pt.id')
            ->where('p.id', $data['party_id'])
            ->value('pt.name');

        return match ($partyTypeName) {
            'client' => 'in',
            'supplier' => 'out',
            'both'   => $data['direction'] ?? 'in', // يتركه للواجهة تختار
            default  => 'out',
        };
    }

    private function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }
}
