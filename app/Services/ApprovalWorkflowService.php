<?php

namespace App\Services;

use App\Models\ApprovalThreshold;
use App\Models\CommercialDocument;
use App\Models\Notification;
use App\Models\DocumentStatus;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApprovalWorkflowService
{
    public function __construct(
        private CompanyContextService $companyContext,
    ) {}

    public function requiresApproval(CommercialDocument $document): bool
    {
        $threshold = $this->findThreshold($document);
        if (!$threshold) return false;

        $netToPay = (float) $document->net_to_pay;
        return $netToPay >= (float) $threshold->min_amount
            && ($threshold->max_amount === null || $netToPay <= (float) $threshold->max_amount);
    }

    public function findThreshold(CommercialDocument $document): ?ApprovalThreshold
    {
        return ApprovalThreshold::active()
            ->forDocumentType($document->document_type_id)
            ->where('min_amount', '<=', $document->net_to_pay)
            ->where(function ($q) use ($document) {
                $q->whereNull('max_amount')
                  ->orWhere('max_amount', '>=', $document->net_to_pay);
            })
            ->orderBy('min_amount', 'desc')
            ->first();
    }

    public function submitForApproval(CommercialDocument $document): CommercialDocument
    {
        $pendingStatus = DocumentStatus::where('slug', 'pending_approval')->first();
        if (!$pendingStatus) {
            throw new BusinessRuleException('حالة "قيد الموافقة" غير موجودة.', 500);
        }

        $document->update([
            'document_status_id' => $pendingStatus->id,
        ]);

        $threshold = $this->findThreshold($document);
        if ($threshold && $threshold->role_id) {
            Notification::create([
                'company_id' => $this->companyContext->get(),
                'type' => 'approval_required',
                'title' => 'موافقة مطلوبة',
                'body' => "المستند {$document->document_number} بقيمة {$document->net_to_pay} دج يحتاج موافقتك.",
                'role_id' => $threshold->role_id,
                'document_id' => $document->id,
                'is_read' => false,
            ]);
        }

        Log::info("Document {$document->id} submitted for approval", [
            'net_to_pay' => $document->net_to_pay,
            'threshold' => $threshold?->id,
        ]);

        return $document->fresh();
    }

    public function approve(CommercialDocument $document, int $userId, ?string $reason = null): CommercialDocument
    {
        $validatedStatus = DocumentStatus::where('slug', 'validated')->first();
        if (!$validatedStatus) {
            throw new BusinessRuleException('حالة "موثّق" غير موجودة.', 500);
        }

        $document->update([
            'document_status_id' => $validatedStatus->id,
            'validated_at' => now(),
            'validated_by' => $userId,
        ]);

        if ($reason) {
            $existing = $document->internal_notes ?? '';
            $document->update(['internal_notes' => $existing . "\n[موافقة] $reason"]);
        }

        Log::info("Document {$document->id} approved by user {$userId}");

        return $document->fresh();
    }

    public function reject(CommercialDocument $document, int $userId, string $reason): CommercialDocument
    {
        $rejectedStatus = DocumentStatus::where('slug', 'rejected')->first();
        if (!$rejectedStatus) {
            throw new BusinessRuleException('حالة "مرفوض" غير موجودة.', 500);
        }

        $document->update([
            'document_status_id' => $rejectedStatus->id,
            'cancellation_reason' => $reason,
        ]);

        $existing = $document->internal_notes ?? '';
        $document->update(['internal_notes' => $existing . "\n[رفض] $reason"]);

        Log::info("Document {$document->id} rejected by user {$userId}: {$reason}");

        return $document->fresh();
    }
}
