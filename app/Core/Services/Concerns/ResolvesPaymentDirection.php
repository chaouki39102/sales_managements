<?php

namespace App\Core\Services\Concerns;

use App\Models\CommercialDocument;
use App\Models\TreasuryAccount;

trait ResolvesPaymentDirection
{
    protected function resolveDirectionFromData(array $data): string
    {
        if (empty($data['party_id'])) {
            return 'out';
        }

        if (($data['document_base_operation'] ?? null) === 'purchase') {
            return 'out';
        }

        return 'in';
    }

    protected function resolveDirectionFromDocument(CommercialDocument $document): string
    {
        $baseOp = $document->documentType?->documentBaseOperation?->name;
        return $baseOp === 'purchase' ? 'out' : 'in';
    }

    protected function oppositeDirection(string $direction): string
    {
        return $direction === 'in' ? 'out' : 'in';
    }

    protected function adjustTreasuryBalance(int $accountId, float $amount, string $direction): void
    {
        if ($accountId <= 0 || $amount <= 0) return;

        $delta = $direction === 'in' ? $amount : -$amount;

        TreasuryAccount::withoutGlobalScopes()
            ->where('id', $accountId)
            ->increment('current_balance', $delta);
    }
}
