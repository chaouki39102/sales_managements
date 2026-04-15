<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\CommercialDocumentLine;
use App\Models\ProductVariant;
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
use Illuminate\Http\Request;

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
    protected array $defaultWith = ['commercialDocument', 'productVariant', 'stockLot'];
}

class ProductVariantService extends \App\Core\Services\BaseService
{
    protected string $model = ProductVariant::class;
    protected string $resourceName = 'product_variant';
    protected array $defaultWith = ['product', 'unit', 'tva'];

    public function getLowStock() { return $this->model::lowStock()->get(); }
}

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
    protected array $defaultWith = ['productVariant', 'warehouse'];

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
    protected array $defaultWith = ['productVariant', 'warehouse', 'stockMovementType'];

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
    protected array $defaultWith = ['productVariants'];
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