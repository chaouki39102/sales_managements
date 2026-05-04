<?php

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
    protected function getResourceName(): string { return $this->resourceName; }

}

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected array $defaultWith = ['commercialDocument', 'product', 'stockLot']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
}

// تم حذف ProductVariantService بالكامل (لأن ProductVariant لم يعد موجوداً)

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected array $defaultWith = ['expenseCategory', 'paymentMode', 'treasuryAccount'];

    public function getPaid() { return $this->model::paid()->get(); }
    public function getUnpaid() { return $this->model::unpaid()->get(); }
    protected function getResourceName(): string { return $this->resourceName; }

}

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected array $defaultWith = ['product', 'warehouse']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }

    public function getAvailable() { return $this->model::available()->get(); }
    public function getExpiringSoon(int $days = 30) { return $this->model::expiringSoon($days)->get(); }
}

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
    protected array $defaultWith = ['closedBy'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getCurrent() { return $this->model::current()->first(); }
    public function getOpen() { return $this->model::open()->get(); }
    public function close(\Illuminate\Database\Eloquent\Model $item, int $userId, ?string $notes = null) { $item->close($userId, $notes); return $item->fresh(); }
}

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected array $defaultWith = ['currency', 'paymentMode', 'treasuryAccount', 'party'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getConfirmed() { return $this->model::confirmed()->get(); }
    public function getPending() { return $this->model::pending()->get(); }
}

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected array $defaultWith = ['product', 'warehouse', 'stockMovementType']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
    public function getIncoming() { return $this->model::incoming()->get(); }
    public function getOutgoing() { return $this->model::outgoing()->get(); }
}

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
    protected function getResourceName(): string { return $this->resourceName; }

}

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected array $defaultWith = ['products']; // ✅ تم التعديل (كان productVariants)
    protected function getResourceName(): string { return $this->resourceName; }
}

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected array $defaultWith = ['treasuryAccounts'];
    protected function getResourceName(): string { return $this->resourceName; }
}

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
    protected function getResourceName(): string { return $this->resourceName; }
}

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected array $defaultWith = ['documentTypes'];
    protected function getResourceName(): string { return $this->resourceName; }
}
