<?php

namespace App\Providers;

use App\Models\Attachment;
use App\Models\Audit;
use App\Models\Brand;
use App\Models\Check;
use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Commune;
use App\Models\Currency;
use App\Models\DocumentBaseOperation;
use App\Models\DocumentPayment;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\Employee;
use App\Models\EmploymentContract;
use App\Models\ExchangeRate;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Family;
use App\Models\FiscalStamp;
use App\Models\FiscalYear;
use App\Models\Gender;
use App\Models\InventoryValuationMethod;
use App\Models\LegalForm;
use App\Models\Notification;
use App\Models\NumberingSeries;
use App\Models\OpeningBalanceParty;
use App\Models\OpeningBalanceStock;
use App\Models\OpeningBalanceTreasury;
use App\Models\Party;
use App\Models\PartyType;
use App\Models\Payment;
use App\Models\PaymentMode;
use App\Models\Permission;
use App\Models\PriceLevel;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\ProductType;
use App\Models\ProductVariant;
use App\Models\ProductVariantPrice;
use App\Models\QuantityDiscount;
use App\Models\Role;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\StockMovementType;
use App\Models\TreasuryAccount;
use App\Models\TreasuryAccountType;
use App\Models\Tva;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Wilaya;
use App\Policies\AttachmentPolicy;
use App\Policies\AuditPolicy;
use App\Policies\BrandPolicy;
use App\Policies\CheckPolicy;
use App\Policies\CommercialDocumentLinePolicy;
use App\Policies\CommercialDocumentPolicy;
use App\Policies\CommunePolicy;
use App\Policies\CurrencyPolicy;
use App\Policies\DocumentBaseOperationPolicy;
use App\Policies\DocumentPaymentPolicy;
use App\Policies\DocumentStatusPolicy;
use App\Policies\DocumentTypePolicy;
use App\Policies\EmployeePolicy;
use App\Policies\EmploymentContractPolicy;
use App\Policies\ExchangeRatePolicy;
use App\Policies\ExpenseCategoryPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\FamilyPolicy;
use App\Policies\FiscalStampPolicy;
use App\Policies\FiscalYearPolicy;
use App\Policies\GenderPolicy;
use App\Policies\InventoryValuationMethodPolicy;
use App\Policies\LegalFormPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\NumberingSeriesPolicy;
use App\Policies\OpeningBalancePartyPolicy;
use App\Policies\OpeningBalanceStockPolicy;
use App\Policies\OpeningBalanceTreasuryPolicy;
use App\Policies\PartyPolicy;
use App\Policies\PartyTypePolicy;
use App\Policies\PaymentModePolicy;
use App\Policies\PaymentPolicy;
use App\Policies\PermissionPolicy;
use App\Policies\PriceLevelPolicy;
use App\Policies\ProductLotPolicy;
use App\Policies\ProductPolicy;
use App\Policies\ProductTypePolicy;
use App\Policies\ProductVariantPolicy;
use App\Policies\ProductVariantPricePolicy;
use App\Policies\QuantityDiscountPolicy;
use App\Policies\RolePolicy;
use App\Policies\SettingPolicy;
use App\Policies\StockMovementPolicy;
use App\Policies\StockMovementTypePolicy;
use App\Policies\TreasuryAccountPolicy;
use App\Policies\TreasuryAccountTypePolicy;
use App\Policies\TvaPolicy;
use App\Policies\UnitPolicy;
use App\Policies\UserPolicy;
use App\Policies\WarehousePolicy;
use App\Policies\WilayaPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class PolicyServiceProvider extends ServiceProvider
{
    protected $policies = [
        User::class => UserPolicy::class,
        Party::class => PartyPolicy::class,
        Product::class => ProductPolicy::class,
        CommercialDocument::class => CommercialDocumentPolicy::class,
        Warehouse::class => WarehousePolicy::class,
        Currency::class => CurrencyPolicy::class,
        Family::class => FamilyPolicy::class,
        Brand::class => BrandPolicy::class,
        Role::class => RolePolicy::class,
        Permission::class => PermissionPolicy::class,
        NumberingSeries::class => NumberingSeriesPolicy::class,
        Audit::class => AuditPolicy::class,
        Attachment::class => AttachmentPolicy::class,
        EmploymentContract::class => EmploymentContractPolicy::class,
        Employee::class => EmployeePolicy::class,
        Notification::class => NotificationPolicy::class,
        Setting::class => SettingPolicy::class,
        OpeningBalanceStock::class => OpeningBalanceStockPolicy::class,
        OpeningBalanceParty::class => OpeningBalancePartyPolicy::class,
        OpeningBalanceTreasury::class => OpeningBalanceTreasuryPolicy::class,
        ExchangeRate::class => ExchangeRatePolicy::class,
        DocumentPayment::class => DocumentPaymentPolicy::class,
        DocumentStatus::class => DocumentStatusPolicy::class,
        ExpenseCategory::class => ExpenseCategoryPolicy::class,
        Check::class => CheckPolicy::class,
        PaymentMode::class => PaymentModePolicy::class,
        TreasuryAccount::class => TreasuryAccountPolicy::class,
        QuantityDiscount::class => QuantityDiscountPolicy::class,
        ProductVariantPrice::class => ProductVariantPricePolicy::class,
        PriceLevel::class => PriceLevelPolicy::class,
        LegalForm::class => LegalFormPolicy::class,
        Tva::class => TvaPolicy::class,
        Unit::class => UnitPolicy::class,
        Commune::class => CommunePolicy::class,
        Wilaya::class => WilayaPolicy::class,
        StockMovementType::class => StockMovementTypePolicy::class,
        ProductType::class => ProductTypePolicy::class,
        PartyType::class => PartyTypePolicy::class,
        DocumentType::class => DocumentTypePolicy::class,
        CommercialDocumentLine::class => CommercialDocumentLinePolicy::class,
        ProductVariant::class => ProductVariantPolicy::class,
        Expense::class => ExpensePolicy::class,
        ProductLot::class => ProductLotPolicy::class,
        FiscalYear::class => FiscalYearPolicy::class,
        Payment::class => PaymentPolicy::class,
        StockMovement::class => StockMovementPolicy::class,
        Gender::class => GenderPolicy::class,
        InventoryValuationMethod::class => InventoryValuationMethodPolicy::class,
        TreasuryAccountType::class => TreasuryAccountTypePolicy::class,
        FiscalStamp::class => FiscalStampPolicy::class,
        DocumentBaseOperation::class => DocumentBaseOperationPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}