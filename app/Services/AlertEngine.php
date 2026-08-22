<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\Check;
use App\Models\UserAlert;
use App\Models\DocumentStatus;
use Illuminate\Support\Facades\Log;

class AlertEngine
{
    public function runDailyChecks(): array
    {
        $companyId = app(CompanyContextService::class)->get();
        $alerts = [];

        $alerts = array_merge($alerts, $this->checkOverdueInvoices($companyId));
        $alerts = array_merge($alerts, $this->checkUpcomingChecks($companyId));
        $alerts = array_merge($alerts, $this->checkLowStock($companyId));

        return $alerts;
    }

    public function checkOverdueInvoices(int $companyId): array
    {
        $alerts = [];
        $overdueStatus = DocumentStatus::where('slug', 'overdue')->first();

        $overdueDocs = CommercialDocument::with('party')
            ->where('company_id', $companyId)
            ->where('due_date', '<', now())
            ->where('remaining_amount', '>', 0.01)
            ->whereNull('deleted_at')
            ->get();

        foreach ($overdueDocs as $doc) {
            $daysOverdue = now()->diffInDays($doc->due_date);

            if ($overdueStatus && $doc->document_status_id !== $overdueStatus->id) {
                $doc->update(['document_status_id' => $overdueStatus->id]);
            }

            $severity = $daysOverdue > 60 ? 'critical' : ($daysOverdue > 30 ? 'high' : 'medium');

            $alerts[] = [
                'type' => 'overdue_invoice',
                'title' => 'فاتورة متأخرة',
                'body' => "المستند {$doc->document_number} للزبون {$doc->party?->name} متأخر بـ {$daysOverdue} يوم، المبلغ المتبقي {$doc->remaining_amount} دج.",
                'document_id' => $doc->id,
                'party_id' => $doc->party_id,
                'severity' => $severity,
            ];

            $this->storeAlert($companyId, $alerts[count($alerts) - 1]);
        }

        return $alerts;
    }

    public function checkUpcomingChecks(int $companyId): array
    {
        $alerts = [];

        $upcomingChecks = Check::with('party')
            ->where('company_id', $companyId)
            ->where('status', 'pending')
            ->whereBetween('due_date', [now(), now()->addDays(7)])
            ->get();

        foreach ($upcomingChecks as $check) {
            $daysUntilDue = now()->diffInDays($check->due_date);

            $alerts[] = [
                'type' => 'upcoming_check',
                'title' => 'شيك يستحق',
                'body' => "الشيك رقم {$check->check_number} بمبلغ {$check->amount} دج للزبون {$check->party?->name} يستحق بعد {$daysUntilDue} يوم.",
                'check_id' => $check->id,
                'party_id' => $check->party_id,
                'severity' => $daysUntilDue <= 1 ? 'high' : 'medium',
            ];

            $this->storeAlert($companyId, $alerts[count($alerts) - 1]);
        }

        return $alerts;
    }

    public function checkLowStock(int $companyId): array
    {
        $alerts = [];

        // جدول products لا يحتوي عمود current_stock — المخزون يُحسب من حركات
        // المخزون عبر InventoryStockService (المصدر المرجعي، مخزَّن 60 ثانية).
        $rows = app(CompanyContextService::class)->runAs(
            $companyId,
            fn () => app(InventoryStockService::class)->getStockAt(now()->toDateString())
        );

        foreach ($rows as $row) {
            if ((float) $row['current_stock'] > (float) $row['min_stock_alert']) {
                continue;
            }

            $severity = (float) $row['current_stock'] <= 0 ? 'critical' : 'medium';

            $alerts[] = [
                'type' => 'low_stock',
                'title' => 'مخزون منخفض',
                'body' => "المنتج {$row['name']} (المخزون: {$row['current_stock']}, الحد الأدنى: {$row['min_stock_alert']}).",
                'product_id' => $row['id'],
                'severity' => $severity,
            ];

            $this->storeAlert($companyId, $alerts[count($alerts) - 1]);
        }

        return $alerts;
    }

    public function afterSaveChecks(CommercialDocument $document): array
    {
        $alerts = [];
        $creditSvc = app(CreditCheckService::class);
        $check = $creditSvc->checkPartyLimit($document->party_id, (float) $document->net_to_pay);

        if ($check['is_exceeded']) {
            $alert = [
                'type' => 'credit_exceeded',
                'title' => 'تجاوز حد الائتمان',
                'body' => "المستند {$document->document_number} يتجاوز حد الائتمان للزبون بمبلغ {$check['excess_amount']} دج.",
                'document_id' => $document->id,
                'severity' => 'high',
            ];

            $alerts[] = $alert;
            $this->storeAlert($document->company_id, $alert);
        }

        return $alerts;
    }

    private function storeAlert(int $companyId, array $data): void
    {
        try {
            UserAlert::create(array_merge($data, [
                'company_id' => $companyId,
                'is_read' => false,
            ]));
        } catch (\Exception $e) {
            Log::warning("Failed to store alert: {$e->getMessage()}");
        }
    }

    public function getUnreadAlerts(int $companyId, ?int $userId = null): array
    {
        $query = UserAlert::where('company_id', $companyId)->unread()->forUser($userId);
        return $query->orderBy('created_at', 'desc')->limit(50)->get()->toArray();
    }

    public function getAllAlerts(int $companyId, ?int $userId = null, int $limit = 50): array
    {
        $query = UserAlert::where('company_id', $companyId)->forUser($userId);
        return $query->orderBy('created_at', 'desc')->limit($limit)->get()->toArray();
    }

    public function markAlertAsRead(int $alertId): void
    {
        UserAlert::where('id', $alertId)->update(['is_read' => true, 'read_at' => now()]);
    }

    public function markAllAsRead(int $companyId, ?int $userId = null): void
    {
        $query = UserAlert::where('company_id', $companyId)->unread();
        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')->orWhere('user_id', $userId);
            });
        }
        $query->update(['is_read' => true, 'read_at' => now()]);
    }

    public function getUnreadCount(int $companyId, ?int $userId = null): int
    {
        $query = UserAlert::where('company_id', $companyId)->unread()->forUser($userId);
        return $query->count();
    }
}
