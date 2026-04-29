<?php

// دمج تلقائي لكل ملفات الـ Services



// ===== ملف: AttachmentService.php =====
namespace App\Services;

use App\Models\Attachment;
use Illuminate\Http\Request;

class AttachmentService extends \App\Core\Services\BaseService
{
    protected string $model = Attachment::class;
    protected string $resourceName = 'attachment';
    protected array $defaultWith = ['uploadedBy'];

    public function getFilePath(Attachment $attachment): string
    {
        return $attachment->file_path;
    }
}



// ===== ملف: AuditService.php =====
namespace App\Services;

use App\Models\Audit;
use Illuminate\Http\Request;

class AuditService extends \App\Core\Services\BaseService
{
    protected string $model = Audit::class;
    protected string $resourceName = 'audit';
    protected array $defaultWith = ['user'];

    public function getByUser(int $userId)
    {
        return $this->model::forUser($userId)->get();
    }

    public function getByEvent(string $event)
    {
        return $this->model::forEvent($event)->get();
    }
}



// ===== ملف: AuthService.php =====
namespace App\Services;

use App\Models\User;
use App\Models\LoginAttempt;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

/**
 * Authentication Service
 *
 * مسؤول عن جميع عمليات المصادقة والتفويض:
 * - تسجيل مستخدم جديد
 * - تسجيل الدخول
 * - إدارة كلمات المرور
 * - إنشاء التوكنات
 *
 * @package App\Services
 */
class AuthService extends \App\Core\Services\BaseService
{
    protected string $model = User::class;
    protected string $resourceName = 'user';

    protected int $maxLoginAttempts = 5;
    protected int $lockoutMinutes = 15;

    /**
     * تسجيل مستخدم جديد
     */
    public function register(array $data): User
    {
        if (User::where('email', $data['email'])->exists()) {
            throw new BusinessRuleException('هذا البريد الإلكتروني مسجل بالفعل', 422);
        }

        return $this->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
    }

    /**
     * تسجيل الدخول
     */
    public function login(string $email, string $password): User
    {
        if (LoginAttempt::isLockedOut($email, $this->maxLoginAttempts, $this->lockoutMinutes)) {
            throw new BusinessRuleException(
                'تم قفل الحساب مؤقتاً بسبب محاولات دخول فاشلة متعددة. يرجى المحاولة لاحقاً',
                423
            );
        }

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            LoginAttempt::record($email, false);
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }

        LoginAttempt::record($email, true);

        return $user;
    }

    /**
     * تغيير كلمة المرور
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
        }

        $user->update([
            'password' => $newPassword,
        ]);

        $user->tokens()->delete();
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: إرسال بريد ترحيب
    }
}




// ===== ملف: BrandService.php =====
namespace App\Services;

use App\Models\Brand;

/**
 * Brand Service
 *
 * @package App\Services
 */
class BrandService extends \App\Core\Services\BaseService
{
    protected string $model = Brand::class;
    protected string $resourceName = 'brand';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }
        return $data;
    }
}




// ===== ملف: CheckService.php =====
namespace App\Services;

use App\Models\Check;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CheckService extends \App\Core\Services\BaseService
{
    protected string $model = Check::class;
    protected string $resourceName = 'check';
    protected array $defaultWith = ['party', 'payments'];

    public function getPending()
    {
        return $this->model::pending()->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->get();
    }

    public function markAsCleared(Model $item): Model
    {
        $item->markAsCleared();
        return $item->fresh();
    }

    public function markAsBounced(Model $item, string $reason): Model
    {
        $item->markAsBounced($reason);
        return $item->fresh();
    }
}



// ===== ملف: CommercialDocumentLineService.php =====
namespace App\Services;

use App\Models\CommercialDocumentLine;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
}




// ===== ملف: CommercialDocumentService.php =====
namespace App\Services;

use App\Models\CommercialDocument;
use App\Core\Exceptions\BusinessRuleException;
use App\Services\Tax\FiscalStampCalculator;
use App\Core\Services\TAPCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Commercial Document Service
 *
 * إدارة الوثائق التجارية (فواتير، عروض أسعار، أوامر شراء، إلخ)
 * - حساب الضرائب (TVA, Timbre, TAP)
 * - إدارة المخزون
 * - التحقق من صحة البيانات
 *
 * @package App\Services
 */
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';
    protected array $defaultWith = [
        'documentType',
        'party',
        'warehouse',
        'currency',
        'documentStatus',
        'lines.product',
    ];

    protected function beforeCreate(array $data, $request): array
    {
        $data = $this->prepareDocumentData($data);

        if (!isset($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($data['document_type_id'] ?? null);
        }

        if (!isset($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId();
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        $this->calculateTotals($item);

        if ($item->documentStatus?->is_default) {
            $this->validateDocument($item, $request);
        }
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        if ($item->documentStatus?->triggers_stock_movement) {
            $this->createStockMovements($item);
        }

        if ($item->documentStatus?->sends_notification) {
            // Send notification
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot modify locked document', 409);
        }

        if ($item->validated_at && !$request->user()->can('force_edit_document')) {
            throw new BusinessRuleException('Validated documents cannot be modified', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Exported documents cannot be modified', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot delete locked document', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Cannot delete exported document', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('Cannot delete document with payments', 409);
        }
    }

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate($data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        return $data;
    }

    private function generateDocumentNumber(?int $documentTypeId): string
    {
        $prefix = match ($documentTypeId) {
            1 => 'INV',
            2 => 'QT',
            3 => 'ORD',
            4 => 'DN',
            5 => 'CN',
            default => 'DOC',
        };

        $year = date('Y');
        $sequence = $this->getNextSequence($prefix . $year);

        return sprintf('%s-%s-%06d', $prefix, $year, $sequence);
    }

    private function getNextSequence(string $prefix): int
    {
        $last = CommercialDocument::where('document_number', 'like', $prefix . '%')
            ->orderByDesc('document_number')
            ->first();

        if (!$last) {
            return 1;
        }

        $parts = explode('-', $last->document_number);
        return (int) end($parts) + 1;
    }

    private function getCurrentFiscalYearId(): ?int
    {
        $fiscalYear = \App\Models\FiscalYear::where('is_current', true)->first();
        return $fiscalYear?->id;
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->first();

        return $rate?->rate ?? 1.0;
    }

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $lineOrder = 1;

        foreach ($lines as $lineData) {
            $lineData['commercial_document_id'] = $document->id;
            $lineData['line_order'] = $lineOrder++;

            $this->calculateLineTotals($lineData);

            $document->lines()->create($lineData);
        }
    }

    private function calculateLineTotals(array &$lineData): void
    {
        $quantity = $lineData['quantity'] ?? 1;
        $unitPrice = $lineData['unit_price_ht'] ?? 0;

        $lineData['total_ht'] = $quantity * $unitPrice;

        if (!empty($lineData['discount_percentage'])) {
            $lineData['discount_amount'] = $lineData['total_ht'] * ($lineData['discount_percentage'] / 100);
        }

        $afterDiscount = $lineData['total_ht'] - ($lineData['discount_amount'] ?? 0);

        $tvaRate = $lineData['tva_rate'] ?? 0;
        $lineData['total_tva'] = $afterDiscount * ($tvaRate / 100);
        $lineData['total_ttc'] = $afterDiscount + $lineData['total_tva'];
    }

    private function calculateTotals(CommercialDocument $document): void
    {
        $lines = $document->lines;

        $totalHt = $lines->sum('total_ht');
        $totalTva = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc = $totalHt + $totalTva;

        $totalStamp = (new FiscalStampCalculator())->calculate($document);
        $netToPay = $totalTtc + $totalStamp;

        $document->update([
            'total_ht' => $totalHt,
            'total_tva' => $totalTva,
            'total_discount' => $totalDiscount,
            'total_stamp' => $totalStamp,
            'total_ttc' => $totalTtc,
            'net_to_pay' => $netToPay,
            'remaining_amount' => $netToPay,
        ]);
    }

    private function createStockMovements(CommercialDocument $document): void
    {
        foreach ($document->lines as $line) {
            if (!$line->product) {
                continue;
            }

            $movementType = match ($document->documentType?->code) {
                'invoice', 'delivery_note' => 'out',
                'purchase_invoice' => 'in',
                default => null,
            };

            if (!$movementType) {
                continue;
            }

            \App\Models\StockMovement::create([
                'warehouse_id' => $document->warehouse_id,
                'product_id' => $line->product_id,
                'stock_movement_type_id' => $this->getStockMovementTypeId($movementType),
                'commercial_document_id' => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity' => $line->quantity,
                'unit_price' => $line->unit_price_ht,
                'movement_date' => $document->document_date,
            ]);
        }
    }


    private function getStockMovementTypeId(string $type): int
    {
        return match ($type) {
            'in' => 1,
            'out' => 2,
            'adjustment' => 3,
            default => 1,
        };
    }

    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return;
        }

        $document->update([
            'validated_at' => now(),
            'validated_by' => $request->user()->id ?? null,
        ]);
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->payments()->exists()) {
            throw new BusinessRuleException('Cannot cancel document with payments', 409);
        }

        $document->update([
            'cancellation_reason' => $reason,
            'document_status_id' => $this->getCancelledStatusId(),
        ]);
    }

    private function getCancelledStatusId(): int
    {
        return \App\Models\DocumentStatus::where('is_cancelled', true)->value('id') ?? 6;
    }

    public function getUnpaid()
    {
        return $this->model::unpaid()->with(['party', 'documentType'])->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->with(['party', 'documentType'])->get();
    }
}




// ===== ملف: CommuneService.php =====
namespace App\Services;

use App\Models\Commune;

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = Commune::class;
    protected string $resourceName = 'commune';
    protected array $defaultWith = ['wilaya'];
}




// ===== ملف: CurrencyService.php =====
namespace App\Services;

use App\Models\Currency;

/**
 * Currency Service
 *
 * @package App\Services
 */
class CurrencyService extends \App\Core\Services\BaseService
{
    protected string $model = Currency::class;
    protected string $resourceName = 'currency';
}




// ===== ملف: DashboardService.php =====
namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getSummary(): array
    {
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        $salesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->sum('total_ttc');

        $purchasesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'))
            ->sum('total_ttc');

        $customersCount = Party::where('party_type_id', 1)->count();
        $suppliersCount = Party::where('party_type_id', 2)->count();
        $productsCount = Product::count();

        $unpaidInvoices = CommercialDocument::where('remaining_amount', '>', 0)
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->count();

        $overdueInvoices = CommercialDocument::where('due_date', '<', Carbon::now())
            ->where('remaining_amount', '>', 0)
            ->count();

        return [
            'sales_this_month' => round($salesTotal, 2),
            'purchases_this_month' => round($purchasesTotal, 2),
            'customers_count' => $customersCount,
            'suppliers_count' => $suppliersCount,
            'products_count' => $productsCount,
            'unpaid_invoices' => $unpaidInvoices,
            'overdue_invoices' => $overdueInvoices,
        ];
    }

    public function getSalesChart(string $period = 'month'): array
    {
        $data = [];
        
        if ($period === 'year') {
            for ($month = 1; $month <= 12; $month++) {
                $total = CommercialDocument::whereYear('document_date', Carbon::now()->year)
                    ->whereMonth('document_date', $month)
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc');
                $data[] = [
                    'month' => $month,
                    'label' => Carbon::create(null, $month)->format('M'),
                    'total' => round($total, 2),
                ];
            }
        } else {
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::now()->subDays($i);
                $total = CommercialDocument::whereDate('document_date', $date)
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc');
                $data[] = [
                    'date' => $date->format('Y-m-d'),
                    'label' => $date->format('d M'),
                    'total' => round($total, 2),
                ];
            }
        }

        return $data;
    }

    public function getTopProducts(int $limit = 10): array
    {
        return CommercialDocumentLine::select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total) as total_amount'))
            ->whereHas('commercialDocument', fn($q) => $q->whereHas('documentType', fn($q) => $q->where('code', 'invoice')))
            ->groupBy('product_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'total_quantity' => $item->total_qty,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getTopCustomers(int $limit = 10): array
    {
        return CommercialDocument::select('party_id', DB::raw('SUM(total_ttc) as total_amount'))
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
            ->whereYear('document_date', Carbon::now()->year)
            ->groupBy('party_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'party_id' => $item->party_id,
                'party_name' => $item->party?->name,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getRecentTransactions(int $limit = 10): array
    {
        return CommercialDocument::with(['documentType', 'party'])
            ->whereYear('document_date', Carbon::now()->year)
            ->orderByDesc('document_date')
            ->limit($limit)
            ->get()
            ->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'document_type' => $doc->documentType?->name,
                'party_name' => $doc->party?->name,
                'total' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
                'date' => $doc->document_date?->format('Y-m-d'),
            ])
            ->toArray();
    }

    public function getInventorySummary(): array
    {
        $totalProducts = Product::count();
        $lowStockProducts = Product::whereHas('variants', fn($q) => $q->whereRaw('quantity <= minimum_stock'))->count();
        
        $stockIn = StockMovement::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->where('movement_type_id', 1)
            ->sum('quantity');

        $stockOut = StockMovement::whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->where('movement_type_id', 2)
            ->sum('quantity');

        return [
            'total_products' => $totalProducts,
            'low_stock_count' => $lowStockProducts,
            'stock_in_this_month' => $stockIn ?? 0,
            'stock_out_this_month' => $stockOut ?? 0,
        ];
    }
}



// ===== ملف: DocumentBaseOperationService.php =====
namespace App\Services;

use App\Models\DocumentBaseOperation;

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
}




// ===== ملف: DocumentServices.php =====
namespace App\Services;

use App\Models\DocumentType;
use App\Models\CommercialDocumentLine;
use App\Models\Expense;
use App\Models\ProductLot;
use App\Models\FiscalYear;
use App\Models\Payment;
use App\Models\StockMovement;
use App\Models\Gender;
use App\Models\InventoryValuationMethod;
use App\Models\TreasuryAccountType;
use App\Models\FiscalStamp;
use App\Models\DocumentBaseOperation;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
    protected array $defaultWith = ['documentBaseOperation', 'numberingSeries'];
}

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected array $defaultWith = ['commercialDocument', 'product', 'stockLot']; // ✅ تم التعديل
}

// تم حذف ProductVariantService بالكامل (لأن ProductVariant لم يعد موجوداً)

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected array $defaultWith = ['expenseCategory', 'paymentMode', 'treasuryAccount'];

    public function getPaid() { return $this->model::paid()->get(); }
    public function getUnpaid() { return $this->model::unpaid()->get(); }
}

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected array $defaultWith = ['product', 'warehouse']; // ✅ تم التعديل

    public function getAvailable() { return $this->model::available()->get(); }
    public function getExpiringSoon(int $days = 30) { return $this->model::expiringSoon($days)->get(); }
}

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
    protected array $defaultWith = ['closedBy'];

    public function getCurrent() { return $this->model::current()->first(); }
    public function getOpen() { return $this->model::open()->get(); }
    public function close(\Illuminate\Database\Eloquent\Model $item, int $userId, ?string $notes = null) { $item->close($userId, $notes); return $item->fresh(); }
}

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected array $defaultWith = ['currency', 'paymentMode', 'treasuryAccount', 'party'];

    public function getConfirmed() { return $this->model::confirmed()->get(); }
    public function getPending() { return $this->model::pending()->get(); }
}

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected array $defaultWith = ['product', 'warehouse', 'stockMovementType']; // ✅ تم التعديل

    public function getIncoming() { return $this->model::incoming()->get(); }
    public function getOutgoing() { return $this->model::outgoing()->get(); }
}

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
}

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected array $defaultWith = ['products']; // ✅ تم التعديل (كان productVariants)
}

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected array $defaultWith = ['treasuryAccounts'];
}

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
}

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected array $defaultWith = ['documentTypes'];
}




// ===== ملف: DocumentStatusService.php =====
namespace App\Services;

use App\Models\DocumentStatus;
use Illuminate\Http\Request;

class DocumentStatusService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentStatus::class;
    protected string $resourceName = 'document_status';
}



// ===== ملف: DocumentTypeService.php =====
namespace App\Services;

use App\Models\DocumentType;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
}




// ===== ملف: EmployeeService.php =====
namespace App\Services;

use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeService extends \App\Core\Services\BaseService
{
    protected string $model = Employee::class;
    protected string $resourceName = 'employee';
    protected array $defaultWith = ['user', 'gender', 'contracts'];

    public function getActiveEmployees()
    {
        return $this->model::active()->get();
    }
}



// ===== ملف: EmploymentContractService.php =====
namespace App\Services;

use App\Models\EmploymentContract;
use Illuminate\Http\Request;

class EmploymentContractService extends \App\Core\Services\BaseService
{
    protected string $model = EmploymentContract::class;
    protected string $resourceName = 'employment_contract';
    protected array $defaultWith = ['employee'];

    public function getActiveContract(int $employeeId)
    {
        return $this->model::where('employee_id', $employeeId)->active()->first();
    }
}



// ===== ملف: ExchangeRateService.php =====
namespace App\Services;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class ExchangeRateService extends \App\Core\Services\BaseService
{
    protected string $model = ExchangeRate::class;
    protected string $resourceName = 'exchange_rate';
    protected array $defaultWith = ['fromCurrency', 'toCurrency'];

    public function getLatest()
    {
        return $this->model::latest()->get();
    }
}



// ===== ملف: ExpenseCategoryService.php =====
namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryService extends \App\Core\Services\BaseService
{
    protected string $model = ExpenseCategory::class;
    protected string $resourceName = 'expense_category';
    protected array $defaultWith = ['parent', 'children'];

    public function getRoots()
    {
        return $this->model::roots()->get();
    }
}



// ===== ملف: ExpenseService.php =====
namespace App\Services;

use App\Models\Expense;

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
}




// ===== ملف: FamilyService.php =====
namespace App\Services;

use App\Models\Family;

/**
 * Family Service
 *
 * @package App\Services
 */
class FamilyService extends \App\Core\Services\BaseService
{
    protected string $model = Family::class;
    protected string $resourceName = 'family';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['code'])) {
            $data['code'] = $this->generateFamilyCode();
        }
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        }
        return $data;
    }

    private function generateFamilyCode(): string
    {
        $prefix = 'FAM';
        $last = $this->model::orderByDesc('code')->first();
        
        if (!$last) {
            return $prefix . '001';
        }

        $num = (int) substr($last->code, 3) + 1;
        return $prefix . str_pad($num, 3, '0', STR_PAD_LEFT);
    }
}




// ===== ملف: FiscalStampService.php =====
// app/Services/FiscalStampService.php

namespace App\Services;

use App\Models\FiscalStamp;
use App\Models\CommercialDocument;
use Carbon\Carbon;

class FiscalStampService
{
    /**
     * حساب الطابع الجبائي المنطبق على مستند تجاري
     */
    public function calculateStamp(CommercialDocument $document): array
    {
        $baseAmount = $document->total_ttc; // الأساس هو المبلغ شامل الضريبة

        $stamp = FiscalStamp::where('active', true)
            ->where('valid_from', '<=', $document->document_date)
            ->where(function ($q) use ($document) {
                $q->whereNull('valid_to')->orWhere('valid_to', '>=', $document->document_date);
            })
            ->where('min_amount', '<=', $baseAmount)
            ->where(function ($q) use ($baseAmount) {
                $q->whereNull('max_amount')->orWhere('max_amount', '>=', $baseAmount);
            })
            ->first();

        if (!$stamp) {
            return ['amount' => 0.0, 'stamp_id' => null];
        }

        $amount = $stamp->type === 'percentage'
            ? round($baseAmount * ($stamp->stamp_value / 100), 4)
            : $stamp->stamp_value;

        return ['amount' => $amount, 'stamp_id' => $stamp->id];
    }

    /**
     * تطبيق الطابع على المستند وإعادة حساب net_to_pay
     */
    public function applyStampToDocument(CommercialDocument $document): CommercialDocument
    {
        $stampData = $this->calculateStamp($document);

        $document->stamp_amount = $stampData['amount'];
        $document->fiscal_stamp_id = $stampData['stamp_id'];
        $document->net_to_pay = $document->total_ttc + $document->stamp_amount - $document->paid_amount;

        return $document;
    }
}




// ===== ملف: FiscalYearService.php =====
namespace App\Services;

use App\Models\FiscalYear;
use App\Services\Accounting\FiscalYearClosureService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ✅ إصلاح نهائي لـ FiscalYearService
 *
 * المشاكل السابقة:
 * 1. FiscalYear::refreshClosedYearsCache() → method غير موجودة على Model
 * 2. الـ close() لا يستخدم FiscalYearClosureService مما يتسبب في 500
 */
class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model      = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';

    public function __construct(
        private FiscalYearClosureService $closureService
    ) {}

    public function getCurrent(): ?FiscalYear
    {
        return FiscalYear::where('is_current', true)->first();
    }

    public function getOpen()
    {
        return FiscalYear::where('is_closed', false)->get();
    }

    /**
     * ✅ إصلاح: استخدام FiscalYearClosureService بدل year->close() مباشرة
     *    FiscalYearClosureService يتولى:
     *      - التحقق من القيود غير المتوازنة
     *      - إنشاء السنة الجديدة
     *      - نقل الأرصدة
     *      - الإقفال الفعلي
     *
     * @throws \Exception إذا فشل التحقق
     */
    public function close(FiscalYear $year, int $userId, ?string $notes = null): FiscalYear
    {
        // ✅ تحديث closing_notes قبل استدعاء الـ Service
        if ($notes) {
            $year->update(['closing_notes' => $notes]);
            $year->refresh();
        }

        // ✅ استخدام الـ Closure Service الكامل الذي يتولى كل الخطوات
        $newYear = $this->closureService->closeYear($year, $userId);

        // ✅ مسح الكاش بأمان بدون استدعاء method غير موجودة
        $this->clearFiscalYearCache();

        return $newYear;
    }

    /**
     * مسح كاش السنوات المالية — آمن لجميع cache drivers
     */
    private function clearFiscalYearCache(): void
    {
        try {
            $driver = config('cache.default', 'file');

            if (in_array($driver, ['redis', 'memcached', 'dynamodb'])) {
                Cache::tags(['fiscal_years'])->flush();
            } else {
                // file / database cache لا تدعم tags
                foreach (['fiscal_years_closed', 'fiscal_years_current', 'fiscal_years_all', 'current_fiscal_year'] as $key) {
                    Cache::forget($key);
                }
            }
        } catch (\Throwable $e) {
            // لا تُفشل العملية بسبب مشكلة في الكاش
            Log::warning("فشل مسح كاش السنوات المالية: {$e->getMessage()}");
        }
    }
}




// ===== ملف: GenderService.php =====
namespace App\Services;

use App\Models\Gender;

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
}




// ===== ملف: InventoryReportService.php =====
// app/Services/InventoryReportService.php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class InventoryReportService
{
    /**
     * تقرير حركات المخزون مع Pivot حسب العائلات والعلامات التجارية
     */
    public function getMovementsPivotReport(string $fromDate, string $toDate, ?array $familyIds = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->leftJoin('brands as b', 'b.id', '=', 'p.brand_id')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'f.name as family_name',
                'b.name as brand_name',
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.quantity ELSE 0 END) as total_in_qty"),
                DB::raw("SUM(CASE WHEN smt.direction > 0 THEN sm.total_price ELSE 0 END) as total_in_value"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.quantity ELSE 0 END) as total_out_qty"),
                DB::raw("SUM(CASE WHEN smt.direction < 0 THEN sm.total_price ELSE 0 END) as total_out_value"),
                DB::raw('COUNT(DISTINCT sm.product_id) as unique_products')
            );

        if ($familyIds) {
            $query->whereIn('p.family_id', $familyIds);
        }

        return $query->groupBy('f.name', 'b.name')
            ->orderBy('family_name')
            ->orderBy('brand_name')
            ->get()
            ->map(function ($item) {
                $item->total_in_qty = (float) $item->total_in_qty;
                $item->total_out_qty = (float) $item->total_out_qty;
                $item->total_in_value = (float) $item->total_in_value;
                $item->total_out_value = (float) $item->total_out_value;
                return $item;
            });
    }

    /**
     * تقرير تفصيلي لحركات منتج معين
     */
    public function getProductMovementsDetail(int $productId, int $warehouseId, string $fromDate, string $toDate): Collection
    {
        return DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->leftJoin('commercial_document_lines as cdl', 'cdl.id', '=', 'sm.commercial_document_line_id')
            ->leftJoin('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->where('sm.product_id', $productId)
            ->where('sm.warehouse_id', $warehouseId)
            ->whereBetween('sm.movement_date', [$fromDate, $toDate])
            ->where('sm.is_validated', true)
            ->select(
                'sm.movement_date',
                'smt.label as movement_type',
                'smt.direction',
                'sm.quantity',
                'sm.unit_price',
                'sm.total_price',
                'sm.lot_number',
                'cd.document_number',
                'cd.document_date'
            )
            ->orderBy('sm.movement_date')
            ->get();
    }

    /**
     * تقرير المخزون الحالي مع Pivot حسب العائلات
     */
    public function getCurrentStockPivotReport(?int $warehouseId = null): Collection
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->where('sm.is_validated', true);

        if ($warehouseId) {
            $query->where('sm.warehouse_id', $warehouseId);
        }

        // الحصول على آخر رصيد لكل منتج
        $subQuery = DB::table('stock_movements as sm2')
            ->select('sm2.product_id', 'sm2.warehouse_id', 'sm2.stock_balance_after')
            ->whereIn('sm2.id', function ($q) {
                $q->select(DB::raw('MAX(id)'))
                    ->from('stock_movements')
                    ->groupBy('product_id', 'warehouse_id');
            });

        return DB::query()
            ->fromSub($subQuery, 'last_movements')
            ->join('products as p', 'p.id', '=', 'last_movements.product_id')
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->select(
                'f.name as family_name',
                DB::raw('COUNT(DISTINCT p.id) as products_count'),
                DB::raw('SUM(last_movements.stock_balance_after) as total_quantity'),
                DB::raw('SUM(last_movements.stock_balance_after * p.current_cost_price) as total_value')
            )
            ->groupBy('f.name')
            ->orderBy('family_name')
            ->get();
    }
}




// ===== ملف: InventoryValuationMethodService.php =====
namespace App\Services;

use App\Models\InventoryValuationMethod;

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
}




// ===== ملف: InventoryValuationService.php =====
// app/Services/InventoryValuationService.php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\ProductLot;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use App\Core\Exceptions\BusinessRuleException;

class InventoryValuationService
{
    /**
     * تحديث تكلفة المخزون بعد حركة شراء (إدخال)
     */
    public function updateCostAfterPurchase(StockMovement $movement): void
    {
        $product = $movement->product;

        if (!$product->valuationMethod) {
            return; // لا توجد طريقة تقييم محددة
        }

        if ($product->valuationMethod->method === 'weighted_average') {
            $this->updateWeightedAverage($product, $movement->warehouse_id);
        }
        // FIFO لا يحتاج تحديث تلقائي
    }

    /**
     * تحديث المتوسط المرجح (PMP) للمنتج في مستودع معين
     */
    private function updateWeightedAverage(Product $product, int $warehouseId): void
    {
        $result = DB::table('stock_movements')
            ->join('stock_movement_types', 'stock_movement_types.id', '=', 'stock_movements.stock_movement_type_id')
            ->where('stock_movements.product_id', $product->id)
            ->where('stock_movements.warehouse_id', $warehouseId)
            ->where('stock_movements.is_validated', true)
            ->selectRaw('
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity * unit_price ELSE 0 END) as total_value_in,
                SUM(CASE WHEN stock_movement_types.direction > 0 THEN quantity ELSE 0 END) as total_qty_in,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity * cost_price ELSE 0 END) as total_value_out,
                SUM(CASE WHEN stock_movement_types.direction < 0 THEN quantity ELSE 0 END) as total_qty_out
            ')
            ->first();

        if ($result && $result->total_qty_in > 0) {
            $currentStockQty = $result->total_qty_in - ($result->total_qty_out ?? 0);
            $currentStockValue = $result->total_value_in - ($result->total_value_out ?? 0);

            if ($currentStockQty > 0) {
                $pmp = $currentStockValue / $currentStockQty;
                $product->update(['current_cost_price' => round($pmp, 4)]);
            }
        }
    }

    /**
     * حساب تكلفة حركة خروج (مبيعات) بناءً على طريقة التقييم
     */
    public function getCostPriceForSale(Product $product, int $warehouseId, float $quantity): float
    {
        if (!$product->valuationMethod) {
            return (float) $product->purchase_price_ht;
        }

        switch ($product->valuationMethod->method) {
            case 'weighted_average':
                return $product->current_cost_price ?? (float) $product->purchase_price_ht;

            case 'fifo':
                return $this->getFIFOCost($product, $warehouseId, $quantity);

            case 'lifo':
                return $this->getLIFOCost($product, $warehouseId, $quantity);

            default:
                return (float) $product->purchase_price_ht;
        }
    }

    /**
     * حساب تكلفة FIFO (First In, First Out)
     */
    private function getFIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;
        $usedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;

            $usedLots[] = [
                'lot' => $lot,
                'quantity' => $qtyFromLot
            ];
        }

        if ($remainingQty > 0) {
            // الكمية المطلوبة أكبر من المخزون المتاح
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * حساب تكلفة LIFO (Last In, First Out)
     */
    private function getLIFOCost(Product $product, int $warehouseId, float $quantity): float
    {
        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        if ($lots->isEmpty()) {
            return (float) $product->purchase_price_ht;
        }

        $remainingQty = $quantity;
        $totalCost = 0.0;

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $totalCost += $qtyFromLot * $lot->purchase_price;
            $remainingQty -= $qtyFromLot;
        }

        if ($remainingQty > 0) {
            throw new BusinessRuleException(
                "الكمية المطلوبة ({$quantity}) تتجاوز المخزون المتاح للمنتج {$product->name}",
                422
            );
        }

        return round($totalCost / $quantity, 4);
    }

    /**
     * تحديث أرصدة الدفعات بعد حركة خروج (FIFO/LIFO)
     */
    public function updateLotBalancesAfterSale(Product $product, int $warehouseId, float $quantity, string $method = 'fifo'): array
    {
        $orderDirection = $method === 'fifo' ? 'asc' : 'desc';

        $lots = ProductLot::where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->where('remaining_quantity', '>', 0)
            ->where('active', true)
            ->orderBy('purchase_date', $orderDirection)
            ->orderBy('id', $orderDirection)
            ->get();

        $remainingQty = $quantity;
        $updatedLots = [];

        foreach ($lots as $lot) {
            if ($remainingQty <= 0) break;

            $qtyFromLot = min($lot->remaining_quantity, $remainingQty);
            $newRemaining = $lot->remaining_quantity - $qtyFromLot;

            $lot->update([
                'remaining_quantity' => $newRemaining,
                'is_depleted' => $newRemaining <= 0
            ]);

            $updatedLots[] = [
                'lot_id' => $lot->id,
                'quantity_used' => $qtyFromLot,
                'remaining' => $newRemaining
            ];

            $remainingQty -= $qtyFromLot;
        }

        return $updatedLots;
    }
}




// ===== ملف: LegalFormService.php =====
namespace App\Services;

use App\Models\LegalForm;

class LegalFormService extends \App\Core\Services\BaseService
{
    protected string $model = LegalForm::class;
    protected string $resourceName = 'legal_form';
}




// ===== ملف: LookupServices.php =====
namespace App\Services;

use App\Models\Wilaya;
use Illuminate\Http\Request;

class WilayaService extends \App\Core\Services\BaseService
{
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
}

class CommuneService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\Commune::class;
    protected string $resourceName = 'commune';
    protected array $defaultWith = ['wilaya'];
}

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
    protected array $defaultWith = ['stockMovements'];
}

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\ProductType::class;
    protected string $resourceName = 'product_type';
    protected array $defaultWith = ['products'];
}

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = \App\Models\PartyType::class;
    protected string $resourceName = 'party_type';
    protected array $defaultWith = ['parties'];
}



// ===== ملف: NotificationService.php =====
namespace App\Services;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class NotificationService extends \App\Core\Services\BaseService
{
    protected string $model = Notification::class;
    protected string $resourceName = 'notification';

    public function getUnread()
    {
        return $this->model::unread()->get();
    }

    public function markAsRead(Model $notification): bool
    {
        return $notification->markAsRead();
    }

    public function markAllAsRead(): void
    {
        $this->model::unread()->update(['read_at' => now()]);
    }
}



// ===== ملف: NumberingSeriesService.php =====
namespace App\Services;

use App\Models\NumberingSeries;
use App\Models\CommercialDocument;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NumberingSeriesService extends \App\Core\Services\BaseService
{
    protected string $model = NumberingSeries::class;
    protected string $resourceName = 'numbering_series';
    protected array $defaultWith = ['documentType', 'warehouse'];

    public function unlock(Model $item): Model
    {
        $item->update(['is_locked' => false]);
        return $item->fresh();
    }

    public function lock(Model $item): Model
    {
        $item->update(['is_locked' => true]);
        return $item->fresh();
    }

    /**
     * الحصول على الرقم التالي مع قفل الصف لمنع Race Condition
     */
    public function getNextNumberWithLock(int $seriesId): array
    {
        return DB::transaction(function () use ($seriesId) {
            $series = NumberingSeries::where('id', $seriesId)
                        ->lockForUpdate()
                        ->first();

            if (!$series) {
                abort(404, 'سلسلة الترقيم غير موجودة');
            }

            $nextNumber = $series->getNextNumber();
            $series->incrementNumber();

            return [
                'series_id' => $series->id,
                'next_number' => $nextNumber,
            ];
        });
    }

    /**
     * مزامنة الرقم الحالي مع أعلى رقم موجود فعلياً في المستندات من هذا النوع
     */
    public function syncWithActualDocuments(int $seriesId): Model
    {
        $series = $this->findById($seriesId);

        // استخراج أعلى رقم من المستندات الفعلية
        $maxLastNumber = CommercialDocument::where('document_type_id', $series->document_type_id)
            ->when($series->warehouse_id, function ($q) use ($series) {
                $q->where('warehouse_id', $series->warehouse_id);
            })
            ->whereNotNull('document_number')
            ->get()
            ->map(function ($doc) use ($series) {
                // استخراج الجزء الرقمي من الرقم المُنسَّق
                return $this->extractNumericPart($doc->document_number, $series);
            })
            ->max();

        $newLastNumber = max($maxLastNumber ?? ($series->start_number - 1), $series->start_number - 1);

        $series->update(['last_number' => $newLastNumber]);

        return $series->fresh();
    }

    /**
     * استخراج الجزء الرقمي من رقم مستند بناءً على صيغة السلسلة
     * (تحليل ذكي: يفترض أن آخر جزء متغير هو الرقم)
     */
    private function extractNumericPart(string $documentNumber, NumberingSeries $series): ?int
    {
        // استراتيجية بسيطة: استبدال جميع الأجزاء الثابتة من الصيغة بفراغ
        $pattern = $series->format;

        // إزالة البادئة واللاحقة
        $pattern = str_replace('{PREFIX}', $series->prefix ?? '', $pattern);
        $pattern = str_replace('{SUFFIX}', $series->suffix ?? '', $pattern);

        // استبدال المتغيرات بعبارة (.*) لاستخراجها
        $regex = $pattern;
        $regex = str_replace(
            ['{YY}', '{YYYY}', '{MM}', '{MONTH}', '{NUMBER}', '{NUMBER:\d+}'],
            ['\d{2}', '\d{4}', '\d{2}', '\d{2}', '(\d+)', '(\d+)'],
            $regex
        );
        $regex = '#^' . $regex . '$#u';

        if (preg_match($regex, $documentNumber, $matches)) {
            // المطابقة الأخيرة ((\d+)) = الرقم
            $numberMatch = end($matches);
            if (is_numeric($numberMatch)) {
                return (int) $numberMatch;
            }
        }

        // إذا فشل التحليل الذكي، جرب استخراج أي رقم متسلسل
        if (preg_match('/\d+/', $documentNumber, $m)) {
            $parts = explode($m[0], $documentNumber);
            // لنأخذ الجزء الأخير المطابق كرقم
            $matches = [];
            preg_match_all('/\d+/', $documentNumber, $matches);
            $lastMatch = end($matches[0]);
            return (int) $lastMatch;
        }

        return null;
    }
}




// ===== ملف: OpeningBalancePartyService.php =====
namespace App\Services;

use App\Models\OpeningBalanceParty;
use Illuminate\Http\Request;

class OpeningBalancePartyService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceParty::class;
    protected string $resourceName = 'opening_balance_party';
    protected array $defaultWith = ['fiscalYear', 'party'];
}



// ===== ملف: OpeningBalanceStockService.php =====
namespace App\Services;

use App\Models\OpeningBalanceStock;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\FiscalYear;
use App\Models\StockMovement;
use App\Models\StockMovementType;
use Illuminate\Support\Facades\DB;

class OpeningBalanceStockService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceStock::class;
    protected string $resourceName = 'opening_balance_stock';
    protected array $defaultWith = ['fiscalYear', 'product', 'warehouse'];

      /**
     * إنشاء رصيد افتتاحي لمنتج (بدون دفعة)
     */
    public function createOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        float $quantity,
        float $unitPrice
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $quantity, $unitPrice) {
            // حفظ الرصيد الافتتاحي
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => null,
                'manufacturing_date' => null,
                'expiration_date' => null,
            ]);

            // إنشاء حركة مخزون افتتاحية
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }

    /**
     * إنشاء رصيد افتتاحي لدفعة محددة
     */
    public function createLotOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        array $lotData
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $lotData) {
            $quantity = $lotData['quantity'];
            $unitPrice = $lotData['unit_price'];

            // حفظ الرصيد الافتتاحي للدفعة
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => $lotData['lot_number'],
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
            ]);

            // إنشاء دفعة جديدة
            $lot = $product->lots()->create([
                'lot_number' => $lotData['lot_number'],
                'warehouse_id' => $warehouse->id,
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
                'purchase_date' => $fiscalYear->start_date,
                'purchase_price' => $unitPrice,
                'legal_selling_price' => $lotData['selling_price'] ?? 0,
                'original_quantity' => $quantity,
                'remaining_quantity' => $quantity,
                'active' => true,
            ]);

            // إنشاء حركة مخزون افتتاحية للدفعة
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'lot_number' => $lotData['lot_number'],
                'stock_lot_id' => $lot->id,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }
}




// ===== ملف: PartyService.php =====
namespace App\Services;

use App\Models\Party;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Party Service
 *
 * إدارة الأطراف (العملاء والموردين) مع المتطلبات الجزائرية:
 * - RC, NIF, NIS, AI
 * - التحقق من صحة البيانات
 * - إدارة الأرصدة والحدود الائتمانية
 *
 * @package App\Services
 */
class PartyService extends \App\Core\Services\BaseService
{
    protected string $model = Party::class;
    protected string $resourceName = 'party';
    protected array $defaultWith = ['partyType', 'legalForm', 'commune', 'wilaya'];

    /**
     * Before creating - data preparation and validation
     */
    protected function beforeCreate(array $data, $request): array
    {
        // Generate unique code if not provided
        if (empty($data['code'])) {
            $data['code'] = $this->generatePartyCode($data['party_type_id']);
        }

        // Generate slug from name
        if (!isset($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateSlug($data['name']);
        }

        // Algerian-specific validations
        $this->validateAlgerianFields($data);

        return $data;
    }

    /**
     * After create - within transaction
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        // Any post-creation logic within transaction
        // e.g., create opening balance if needed
    }

    /**
     * After database commit - external operations
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send welcome notification if needed
        // Mail::send(new PartyCreatedNotification($item));
    }

    /**
     * Before update - business rules validation
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // Check if party is active before critical changes
        if ($item->active && isset($data['active']) && !$data['active']) {
            // Check if party has active commercial documents
            if ($item->commercialDocuments()->where('status', 'confirmed')->exists()) {
                throw new BusinessRuleException('لا يمكن إلغاء تفعيل متعامل لديه وثائق تجارية نشطة', 409);
            }
        }

        // Validate Algerian fields if changed
        $this->validateAlgerianFields($data, $item);
    }

    /**
     * After update committed
     */
    protected function afterUpdateCommitted(Model $item, array $data, $request): void
    {
        // Clear related caches if critical data changed
        if (isset($data['active']) || isset($data['credit_limit'])) {
            // Additional cache clearing if needed
        }
    }

    /**
     * Before delete - business rules
     */
    protected function beforeDelete(Model $item): void
    {
        // Check if party can be deleted
        if ($item->commercialDocuments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه وثائق تجارية', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه دفعات', 409);
        }
    }

    /**
     * Generate unique party code
     */
    private function generatePartyCode(int $partyTypeId): string
    {
        $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP'; // Assuming 1=customer, 2=supplier

        do {
            $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Party::where('code', $code)->exists());

        return $code;
    }

    /**
     * Generate slug from name
     */
    private function generateSlug(string $name): string
    {
        $slug = strtolower(str_replace([' ', '.', ','], '-', $name));
        $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
        $originalSlug = $slug;
        $counter = 1;

        while (Party::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Validate Algerian-specific fields
     */
    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
    {
        // NIF validation (Algerian tax number - 15-16 digits usually)
        if (isset($data['nif']) && !empty($data['nif'])) {
            if (!preg_match('/^\d{15,16}$/', $data['nif'])) {
                throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-16 رقم', 422);
            }

            // Check uniqueness except for current party
            $query = Party::where('nif', $data['nif']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
            }
        }

        // RC validation (Commercial Register)
        if (isset($data['rc']) && !empty($data['rc'])) {
            if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
                throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
            }
        }

        // NIS validation (Statistical number)
        if (isset($data['nis']) && !empty($data['nis'])) {
            if (!preg_match('/^\d{10,15}$/', $data['nis'])) {
                throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 10-15 رقم', 422);
            }
        }

        // Email uniqueness
        if (isset($data['email']) && !empty($data['email'])) {
            $query = Party::where('email', $data['email']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
            }
        }

        // Credit limit validation
        if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
            throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
        }
    }

    /**
     * Get customers only
     */
    public function getCustomers()
    {
        return $this->model::customers()->active()->get();
    }

    /**
     * Get suppliers only
     */
    public function getSuppliers()
    {
        return $this->model::suppliers()->active()->get();
    }
}




// ===== ملف: PartyTypeService.php =====
namespace App\Services;

use App\Models\PartyType;

class PartyTypeService extends \App\Core\Services\BaseService
{
    protected string $model = PartyType::class;
    protected string $resourceName = 'party_type';
}




// ===== ملف: PaymentModeService.php =====
namespace App\Services;

use App\Models\PaymentMode;
use Illuminate\Http\Request;

class PaymentModeService extends \App\Core\Services\BaseService
{
    protected string $model = PaymentMode::class;
    protected string $resourceName = 'payment_mode';
    protected array $defaultWith = ['treasuryAccount'];

    public function getActive()
    {
        return $this->model::where('active', true)->get();
    }
}



// ===== ملف: PaymentService.php =====
namespace App\Services;

use App\Models\Payment;

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
}




// ===== ملف: PermissionService.php =====
namespace App\Services;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PermissionService extends \App\Core\Services\BaseService
{
    protected string $model = Permission::class;
    protected string $resourceName = 'permission';
    protected array $defaultWith = ['roles'];

    public function getByGroup(?string $group = null)
    {
        if ($group) {
            return $this->model::byGroup($group)->get();
        }
        return $this->model::all();
    }
}



// ===== ملف: PriceLevelService.php =====
namespace App\Services;

use App\Models\PriceLevel;

class PriceLevelService extends \App\Core\Services\BaseService
{
    protected string $model = PriceLevel::class;
    protected string $resourceName = 'priceLevel';
}




// ===== ملف: ProductLotService.php =====
namespace App\Services;

use App\Models\ProductLot;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
}




// ===== ملف: ProductService.php =====
namespace App\Services;

use App\Models\Product;
use App\Models\ProductPackaging;
use App\Models\ProductPrice;
use App\Models\QuantityDiscount;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ProductService extends \App\Core\Services\BaseService
{
    protected string $model        = Product::class;
    protected string $resourceName = 'product';

    protected array $defaultWith = [
        'family', 'brand', 'productType', 'tva', 'unit',
    ];

    protected array $showWith = [
        'family', 'brand', 'productType', 'tva', 'unit', 'valuationMethod',
        'packagings',
        'prices.priceLevel',
        'quantityDiscounts.priceLevel',
    ];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name']);
        }
        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['packagings'])) {
            $this->syncPackagings($item, $data['packagings']);
        }
        if (!empty($data['prices'])) {
            $this->syncPrices($item, $data['prices'], (float)($data['purchase_price_ht'] ?? 0));
        }
        if (isset($data['quantity_discounts'])) {
            $this->syncDiscounts($item, $data['quantity_discounts'], (bool)($data['manages_quantity_discounts'] ?? false));
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // التخفيف: لا نمنع تعطيل المنتج، فقط نسجل تحذيراً
        if (isset($data['active']) && !(bool)$data['active']) {
            if ($item->stockMovements()->where('is_validated', true)->exists()) {
                Log::warning('محاولة تعطيل منتج له حركات مخزون مؤكدة', [
                    'product_id' => $item->id,
                    'user_id' => auth()->id(),
                ]);
                // يمكنك اختيارياً إضافة رسالة إعلامية للمستخدم عبر session أو استثناء مخصص
                // throw new BusinessRuleException('لا يمكن تعطيل منتج له حركات مخزون مؤكدة', 409);
                // لكننا سنسمح بذلك مع تسجيل التحذير فقط.
            }
        }

        if (isset($data['name']) && $data['name'] !== $item->name && empty($data['slug'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, $request): array
    {
        unset($data['packagings'], $data['prices'], $data['quantity_discounts']);
        return $data;
    }

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $packagings = $request?->input('packagings');
        $prices     = $request?->input('prices');
        $discounts  = $request?->input('quantity_discounts');

        if (!is_null($packagings)) {
            $this->syncPackagings($item, $packagings);
        }

        if (!is_null($prices)) {
            $purchasePrice = (float)($request->input('purchase_price_ht') ?? $item->fresh()->purchase_price_ht);
            $this->syncPrices($item, $prices, $purchasePrice);
        }

        if (!is_null($discounts)) {
            $managesDiscounts = (bool)($request->input('manages_quantity_discounts') ?? $item->manages_quantity_discounts);
            $this->syncDiscounts($item, $discounts, $managesDiscounts);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // الحذف الفعلي ممنوع إذا كانت هناك سجلات مرتبطة (يبقى كما هو)
        if ($item->stockMovements()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له حركات مخزون', 409);
        }
        if ($item->lots()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له دفعات مخزون', 409);
        }
        if ($item->documentLines()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج مرتبط بوثائق تجارية', 409);
        }
        if ($item->openingBalances()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف منتج له أرصدة افتتاحية', 409);
        }
    }

    // =========================================================
    // Packagings Sync
    // =========================================================

    private function syncPackagings(Product $product, array $data): void
    {
        if (empty($data)) return;

        $incomingIds = collect($data)->pluck('id')->filter()->toArray();

        // حذف التعبئات الغائبة (هذا السلوك قد يكون مقصوداً، لكن يمكن تعديله لتعطيلها بدلاً من الحذف)
        $product->packagings()->whereNotIn('id', $incomingIds)->delete();

        $hasDefault = collect($data)->contains(fn($p) => !empty($p['is_default']));

        foreach ($data as $idx => $pData) {
            $attrs = [
                'code'          => strtoupper(trim($pData['code'])),
                'label'         => trim($pData['label']),
                'quantity'      => isset($pData['quantity']) ? max(0.0001, (float)$pData['quantity']) : 1,
                'barcode'       => $pData['barcode'] ?? null,
                'is_default'    => (bool)($pData['is_default'] ?? false),
                'active'        => (bool)($pData['active'] ?? true),
                'display_order' => (int)($pData['display_order'] ?? $idx),
            ];

            if (!empty($pData['id'])) {
                $product->packagings()->where('id', $pData['id'])->update($attrs);
            } else {
                $product->packagings()->create($attrs);
            }
        }

        if (!$hasDefault) {
            $smallest = $product->packagings()->orderBy('quantity')->first();
            $smallest?->update(['is_default' => true]);
        }
    }

    // =========================================================
    // Prices Sync
    // =========================================================

    private function syncPrices(Product $product, array $data, float $purchasePriceHt): void
    {
        if (empty($data)) return;

        foreach ($data as $pData) {
            if (empty($pData['price_level_id'])) continue;

            $method = $pData['pricing_method'] ?? 'fixed';

            $price  = $method === 'fixed'  ? ((float)($pData['price']  ?? 0)) : null;
            $rate   = $method === 'rate'   ? ((float)($pData['rate']   ?? 0)) : null;
            $margin = $method === 'margin' ? ((float)($pData['margin'] ?? 0)) : null;

            $product->prices()->updateOrCreate(
                ['price_level_id' => (int)$pData['price_level_id']],
                [
                    'pricing_method' => $method,
                    'price'          => $price,
                    'rate'           => $rate,
                    'margin'         => $margin,
                    'active'         => (bool)($pData['active'] ?? true),
                ]
            );
        }
    }

    // =========================================================
    // Discounts Sync — تعديل: لا نحذف، نعطل فقط
    // =========================================================

    private function syncDiscounts(Product $product, array $data, bool $managesDiscounts): void
    {
        if (!$managesDiscounts) {
            // بدلاً من delete()، نعطل الخصومات الحالية
            $product->quantityDiscounts()->update(['active' => false]);
            return;
        }

        // إذا كانت الخصومات مفعلة، نقوم بمزامنتها (ما زلنا نستخدم حذف وإعادة إنشاء للتبسيط)
        // لكن يمكن تحسينها لاحقاً.
        $product->quantityDiscounts()->delete();

        foreach ($data as $idx => $dData) {
            if (empty($dData['price_level_id'])) continue;
            if (!isset($dData['min_qty']) || $dData['min_qty'] === '') continue;
            if (empty($dData['discount_amount']) && empty($dData['discount_percentage'])) continue;

            $product->quantityDiscounts()->create([
                'price_level_id'      => (int)$dData['price_level_id'],
                'min_qty'             => (float)$dData['min_qty'],
                'max_qty'             => isset($dData['max_qty']) && $dData['max_qty'] !== '' ? (float)$dData['max_qty'] : null,
                'discount_amount'     => isset($dData['discount_amount']) && $dData['discount_amount'] !== '' ? (float)$dData['discount_amount'] : null,
                'discount_percentage' => isset($dData['discount_percentage']) && $dData['discount_percentage'] !== '' ? (float)$dData['discount_percentage'] : null,
                'tier_order'          => (int)($dData['tier_order'] ?? $idx + 1),
                'is_blocked'          => (bool)($dData['is_blocked'] ?? false),
                'active'              => (bool)($dData['active'] ?? true),
            ]);
        }
    }

    // =========================================================
    // Public Helpers
    // =========================================================

    public function findById($id, array $with = null): Model
    {
        return $this->model::with($with ?? $this->showWith)->findOrFail($id);
    }

    public function getActiveProducts()
    {
        return $this->model::where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByFamily(int $familyId)
    {
        return $this->model::where('family_id', $familyId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    public function getByBrand(int $brandId)
    {
        return $this->model::where('brand_id', $brandId)
            ->where('active', true)
            ->with($this->defaultWith)
            ->orderBy('name')
            ->get();
    }

    // =========================================================
    // Slug Helper
    // =========================================================

    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug     = Str::slug($name);
        $query    = Product::where('slug', 'like', $slug . '%');
        if ($excludeId) $query->where('id', '!=', $excludeId);
        $existing = $query->pluck('slug');

        if (!$existing->contains($slug)) return $slug;

        $i = 1;
        while ($existing->contains("{$slug}-{$i}")) $i++;
        return "{$slug}-{$i}";
    }
}



// ===== ملف: ProductTypeService.php =====
namespace App\Services;

use App\Models\ProductType;

class ProductTypeService extends \App\Core\Services\BaseService
{
    protected string $model = ProductType::class;
    protected string $resourceName = 'product_type';
}




// ===== ملف: QRCodeService.php =====
namespace App\Services;

use App\Models\CommercialDocument;

class QRCodeService
{
    public function generateForDocument(CommercialDocument $document): string
    {
        $data = $this->buildQRData($document);
        
        $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(200)
            ->errorCorrection('M')
            ->generate($data);

        return base64_encode($qrCode);
    }

    public function getQRDataString(CommercialDocument $document): string
    {
        return $this->buildQRData($document);
    }

    private function buildQRData(CommercialDocument $document): string
    {
        $supplier = $document->party;
        
        $qrData = [
            'supplier' => [
                'name' => config('app.company_name', 'Company Name'),
                'address' => config('app.company_address', ''),
                'nif' => config('app.company_nif', ''),
                'nis' => config('app.company_nis', ''),
                'ai' => config('app.company_ai', ''),
            ],
            'invoice' => [
                'number' => $document->document_number,
                'date' => $document->document_date?->format('Y-m-d'),
                'type' => $document->documentType?->code,
            ],
            'customer' => [
                'name' => $supplier?->name ?? '',
                'nif' => $supplier?->nif ?? '',
            ],
            'amounts' => [
                'ht' => round($document->total_ht ?? 0, 2),
                'tva' => round($document->total_tva ?? 0, 2),
                'ttc' => round($document->total_ttc ?? 0, 2),
                'stamp' => round($document->total_stamp ?? 0, 2),
            ],
            'hash' => $this->generateHash($document),
        ];

        return json_encode($qrData, JSON_UNESCAPED_UNICODE);
    }

    private function generateHash(CommercialDocument $document): string
    {
        $data = 
            ($document->document_number ?? '') .
            ($document->document_date?->format('Ymd') ?? '') .
            round($document->total_ttc ?? 0, 2) .
            round($document->total_tva ?? 0, 2);

        return hash('sha256', $data);
    }

    public static function validateQRData(array $qrData): bool
    {
        return isset($qrData['invoice']['number'], $qrData['invoice']['date']);
    }
}



// ===== ملف: QuantityDiscountService.php =====
namespace App\Services;

use App\Models\QuantityDiscount;
use Illuminate\Http\Request;

class QuantityDiscountService extends \App\Core\Services\BaseService
{
    protected string $model = QuantityDiscount::class;
    protected string $resourceName = 'quantity_discount';
    protected array $defaultWith = ['product', 'priceLevel'];
    
}




// ===== ملف: ReportService.php =====
namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function salesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'paid_amount' => round($doc->paid_amount, 2),
                'remaining_amount' => round($doc->remaining_amount, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'total_paid' => round($documents->sum('paid_amount'), 2),
                'total_remaining' => round($documents->sum('remaining_amount'), 2),
                'count' => $documents->count(),
            ],
        ];
    }

    public function purchasesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'count' => $documents->count(),
            ],
        ];
    }

    public function customersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 1)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        return [
            'customers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'created_at' => $party->created_at?->format('Y-m-d'),
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_customers' => $parties->count(),
            ],
        ];
    }

    public function suppliersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 2)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        return [
            'suppliers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'nif' => $party->nif,
                'nis' => $party->nis,
                'ai' => $party->ai,
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_suppliers' => $parties->count(),
            ],
        ];
    }

    public function productsReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand', 'unit', 'tva']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        $products = $query->orderBy('name')->get();

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'unit' => $product->unit?->name,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'current_cost_price' => round($product->current_cost_price, 2),
                'tva_rate' => $product->tva?->rate,
                'stock_quantity' => $product->current_stock, // ✅ استخدام attribute المحسوب
                'min_stock_alert' => $product->min_stock_alert,
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_stock_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
            ],
        ];
    }

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand']);

        $products = $query->get();

        $lowStock = $products->filter(fn($p) => $p->current_stock <= $p->min_stock_alert);
        $outOfStock = $products->filter(fn($p) => $p->current_stock == 0);

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'stock_quantity' => $product->current_stock,
                'min_stock_alert' => $product->min_stock_alert,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'stock_value' => round($product->current_stock * $product->current_cost_price, 2),
                'status' => $product->current_stock == 0 ? 'out_of_stock' : ($product->current_stock <= $product->min_stock_alert ? 'low_stock' : 'in_stock'),
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_quantity' => $products->sum('current_stock'),
                'total_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
                'low_stock_count' => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
            ],
        ];
    }

    public function paymentsReport(array $filters = []): array
    {
        $query = Payment::with(['commercialDocument', 'paymentMode', 'treasuryAccount']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('payment_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('payment_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['payment_mode_id'])) {
            $query->where('payment_mode_id', $filters['payment_mode_id']);
        }

        $payments = $query->orderBy('payment_date', 'desc')->get();

        return [
            'payments' => $payments->map(fn($payment) => [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'amount' => round($payment->amount, 2),
                'document_number' => $payment->commercialDocument?->document_number,
                'payment_mode' => $payment->paymentMode?->name,
                'treasury_account' => $payment->treasuryAccount?->name,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
            ])->toArray(),
            'summary' => [
                'total_amount' => round($payments->sum('amount'), 2),
                'count' => $payments->count(),
            ],
        ];
    }

    public function taxesReport(array $filters = []): array
    {
        $query = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', ['invoice', 'purchase_invoice']));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $documents = $query->get();

        $salesInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'invoice');
        $purchaseInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'purchase_invoice');

        return [
            'sales' => [
                'total_ht' => round($salesInvoices->sum('total_ht'), 2),
                'total_tva' => round($salesInvoices->sum('total_tva'), 2),
                'total_stamp' => round($salesInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($salesInvoices->sum('total_ttc'), 2),
                'count' => $salesInvoices->count(),
            ],
            'purchases' => [
                'total_ht' => round($purchaseInvoices->sum('total_ht'), 2),
                'total_tva' => round($purchaseInvoices->sum('total_tva'), 2),
                'total_stamp' => round($purchaseInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($purchaseInvoices->sum('total_ttc'), 2),
                'count' => $purchaseInvoices->count(),
            ],
            'summary' => [
                'tva_collected' => round($salesInvoices->sum('total_tva'), 2),
                'tva_deductible' => round($purchaseInvoices->sum('total_tva'), 2),
                'tva_balance' => round($salesInvoices->sum('total_tva') - $purchaseInvoices->sum('total_tva'), 2),
            ],
        ];
    }
}




// ===== ملف: RoleService.php =====
namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RoleService extends \App\Core\Services\BaseService
{
    protected string $model = Role::class;
    protected string $resourceName = 'role';
    protected array $defaultWith = ['permissions'];
}



// ===== ملف: SettingService.php =====
namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingService extends \App\Core\Services\BaseService
{
    protected string $model = Setting::class;
    protected string $resourceName = 'setting';

    public function getByGroup(string $group)
    {
        return $this->model::byGroup($group)->get();
    }

    public function getValue(string $key, $default = null)
    {
        return $this->model::get($key, $default);
    }
}



// ===== ملف: StockMovementService.php =====
namespace App\Services;

use App\Models\StockMovement;

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
}




// ===== ملف: StockMovementTypeService.php =====
namespace App\Services;

use App\Models\StockMovementType;

class StockMovementTypeService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovementType::class;
    protected string $resourceName = 'stock_movement_type';
}




// ===== ملف: TreasuryAccountService.php =====
namespace App\Services;

use App\Models\TreasuryAccount;
use Illuminate\Http\Request;

class TreasuryAccountService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccount::class;
    protected string $resourceName = 'treasury_account';
    protected array $defaultWith = ['treasuryAccountType'];

    public function getBankAccounts() { return $this->model::bankAccounts()->get(); }
    public function getCashAccounts() { return $this->model::cashAccounts()->get(); }
    public function getDefault() { return $this->model::default()->first(); }
}



// ===== ملف: TreasuryAccountTypeService.php =====
namespace App\Services;

use App\Models\TreasuryAccountType;

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
}




// ===== ملف: TvaService.php =====
namespace App\Services;

use App\Models\Tva;

class TvaService extends \App\Core\Services\BaseService
{
    protected string $model = Tva::class;
    protected string $resourceName = 'tva';
}




// ===== ملف: UnitService.php =====
namespace App\Services;

use App\Models\Unit;

class UnitService extends \App\Core\Services\BaseService
{
    protected string $model = Unit::class;
    protected string $resourceName = 'unit';
}




// ===== ملف: WarehouseService.php =====
namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;

/**
 * Warehouse Service
 *
 * @package App\Services
 */
class WarehouseService extends \App\Core\Services\BaseService
{
    protected string $model = Warehouse::class;
    protected string $resourceName = 'warehouse';

    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['code'])) {
            $data['code'] = $this->generateWarehouseCode();
        }
        return $data;
    }

    private function generateWarehouseCode(): string
    {
        $prefix = 'WH';
        $last = $this->model::orderByDesc('code')->first();
        
        if (!$last) {
            return $prefix . '001';
        }

        $num = (int) substr($last->code, 2) + 1;
        return $prefix . str_pad($num, 3, '0', STR_PAD_LEFT);
    }
}




// ===== ملف: WilayaService.php =====
namespace App\Services;

use App\Models\Wilaya;

class WilayaService extends \App\Core\Services\BaseService
{
    protected string $model = Wilaya::class;
    protected string $resourceName = 'wilaya';
    protected array $defaultWith = ['communes'];
}


