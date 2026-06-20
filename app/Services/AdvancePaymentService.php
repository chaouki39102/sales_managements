<?php

namespace App\Services;

use App\Models\Payment;

class AdvancePaymentService
{
    public function getAvailableAdvances(int $partyId): array
    {
        $payments = Payment::with('paymentMode')
            ->where('party_id', $partyId)
            ->where('status', 'confirmed')
            ->orderBy('payment_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $advances = [];
        foreach ($payments as $payment) {
            $unapplied = $payment->getUnappliedAmount();
            if ($unapplied > 0.01) {
                $advances[] = [
                    'id'                => $payment->id,
                    'payment_number'    => $payment->payment_number,
                    'payment_date'      => $payment->payment_date->toDateString(),
                    'amount'            => (float) $payment->amount,
                    'unapplied_amount'  => $unapplied,
                    'payment_mode_id'   => $payment->payment_mode_id,
                    'payment_mode_name' => $payment->paymentMode?->name,
                    'reference'         => $payment->reference,
                ];
            }
        }

        return $advances;
    }
}
