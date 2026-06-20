<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\TreasuryAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BankReconciliationService
{
    public function __construct(
        private CompanyContextService $companyContext,
    ) {}

    public function getUnreconciledPayments(): array
    {
        $companyId = $this->companyContext->get();

        $payments = Payment::with(['paymentMode', 'party', 'treasuryAccount'])
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('is_reconciled')
                  ->orWhere('is_reconciled', false);
            })
            ->where('status', 'confirmed')
            ->orderBy('payment_date', 'desc')
            ->get();

        return $payments->map(fn($p) => [
            'id' => $p->id,
            'payment_number' => $p->payment_number,
            'payment_date' => $p->payment_date->toDateString(),
            'amount' => (float) $p->amount,
            'party_name' => $p->party?->name,
            'payment_mode' => $p->paymentMode?->name,
            'treasury_account' => $p->treasuryAccount?->name,
            'reference' => $p->reference,
            'bank_reference' => $p->bank_reference,
        ])->toArray();
    }

    public function getReconciled(): array
    {
        $companyId = $this->companyContext->get();

        $payments = Payment::with(['paymentMode', 'party'])
            ->where('company_id', $companyId)
            ->where('is_reconciled', true)
            ->orderBy('reconciliation_date', 'desc')
            ->limit(50)
            ->get();

        return $payments->map(fn($p) => [
            'id' => $p->id,
            'payment_number' => $p->payment_number,
            'payment_date' => $p->payment_date->toDateString(),
            'amount' => (float) $p->amount,
            'party_name' => $p->party?->name,
            'reference' => $p->reference,
            'bank_reference' => $p->bank_reference,
            'reconciliation_date' => $p->reconciliation_date?->toDateString(),
        ])->toArray();
    }

    public function reconcile(int $paymentId, string $bankReference, ?string $notes = null): Payment
    {
        $payment = Payment::findOrFail($paymentId);

        $payment->update([
            'is_reconciled' => true,
            'reconciliation_date' => now(),
            'bank_reference' => $bankReference,
        ]);

        if ($notes) {
            $existing = $payment->notes ?? '';
            $payment->update(['notes' => $existing . "\n[مطابقة] $notes"]);
        }

        Log::info("Payment {$paymentId} reconciled with bank reference: {$bankReference}");

        return $payment->fresh();
    }

    public function bulkReconcile(array $matches): array
    {
        $results = [];
        DB::transaction(function () use ($matches, &$results) {
            foreach ($matches as $match) {
                $paymentId = (int) ($match['payment_id'] ?? 0);
                $bankRef = $match['bank_reference'] ?? '';
                $notes = $match['notes'] ?? null;

                if ($paymentId && $bankRef) {
                    $results[] = $this->reconcile($paymentId, $bankRef, $notes);
                }
            }
        });
        return $results;
    }

    public function unreconcile(int $paymentId): Payment
    {
        $payment = Payment::findOrFail($paymentId);

        $payment->update([
            'is_reconciled' => false,
            'reconciliation_date' => null,
        ]);

        Log::info("Payment {$paymentId} unreconciled");

        return $payment->fresh();
    }

    public function suggestMatches(array $bankStatements): array
    {
        $companyId = $this->companyContext->get();
        $suggestions = [];

        $unreconciled = Payment::where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereNull('is_reconciled')
                  ->orWhere('is_reconciled', false);
            })
            ->where('status', 'confirmed')
            ->get();

        foreach ($bankStatements as $stmt) {
            $stmtAmount = (float) ($stmt['amount'] ?? 0);
            $stmtDate = $stmt['date'] ?? null;

            $bestMatch = null;
            $bestScore = 0;

            foreach ($unreconciled as $payment) {
                $score = 0;
                $payAmount = (float) $payment->amount;

                if (abs($payAmount - $stmtAmount) < 0.01) {
                    $score += 50;
                }

                if ($stmtDate && $payment->payment_date) {
                    $diffDays = abs(now()->parse($stmtDate)->diffInDays($payment->payment_date));
                    if ($diffDays <= 3) $score += 30;
                    elseif ($diffDays <= 7) $score += 15;
                }

                if ($payment->bank_reference && isset($stmt['reference'])
                    && $payment->bank_reference === $stmt['reference']) {
                    $score += 100;
                }

                if ($score > 0 && $score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = [
                        'payment_id' => $payment->id,
                        'payment_number' => $payment->payment_number,
                        'payment_amount' => (float) $payment->amount,
                        'payment_date' => $payment->payment_date->toDateString(),
                        'party_name' => $payment->party?->name,
                        'score' => $score,
                    ];
                }
            }

            if ($bestMatch) {
                $suggestions[] = [
                    'bank_entry' => $stmt,
                    'match' => $bestMatch,
                    'confidence' => $bestScore >= 100 ? 'high' : ($bestScore >= 50 ? 'medium' : 'low'),
                ];
            }
        }

        return $suggestions;
    }
}
