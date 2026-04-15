# Sales Management Project Structure

## Project Overview
Sales Management System - A professional Laravel 13 API with best practices and enterprise patterns.

## Directory Structure

```
sales-management/
│
├── app/
│   ├── Constants/                    # Application constants
│   │   ├── Messages.php               # Response messages
│   │   └── ResponseStatusCode.php     # HTTP status codes
│   │
│   ├── DTOs/                          # Data Transfer Objects
│   │   └── UserDTO.php
│   │
│   ├── Exceptions/                    # Custom exceptions
│   │   ├── ApiException.php
│   │   ├── NotFoundException.php
│   │   ├── UnauthorizedException.php
│   │   ├── ValidationException.php
│   │   └── BusinessRuleException.php  # ⭐ Business rule violations
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── BaseApiController.php  # ⭐ Enhanced - Error handling + Authorization
│   │   │   │   └── V1/
│   │   │   │       └── AuthController.php
│   │   │   ├── Traits/                    # ⭐ New - Reusable controller logic
│   │   │   │   ├── ApiResponders.php     # Unified response methods
│   │   │   │   └── HasApiList.php        # List pagination helper
│   │   │   └── Controller.php
│   │   │
│   │   ├── Middleware/
│   │   │   ├── HandleCors.php
│   │   │   └── ApiAuthenticate.php
│   │   │
│   │   ├── Requests/
│   │   │   └── Auth/
│   │   │       ├── RegisterRequest.php
│   │   │       ├── LoginRequest.php
│   │   │       └── ChangePasswordRequest.php
│   │   │
│   │   └── Resources/
│   │       ├── ApiResponse.php
│   │       ├── UserResource.php
│   │       └── AuthResource.php
│   │
│   ├── Models/
│   │   ├── User.php
│   │   └── CommercialDocument.php
│   │
│   ├── Observers/
│   │   ├── CommercialDocumentObserver.php
│   │   └── ...
│   │
│   ├── Repositories/
│   │   ├── BaseRepository.php
│   │   └── UserRepository.php
│   │
│   ├── Services/
│   │   ├── BaseService.php            # ⭐ Enhanced - Post-commit operations + Hooks
│   │   ├── AuthService.php
│   │   └── Tax/
│   │       ├── FiscalStampCalculator.php
│   │       └── TAPCalculator.php
│   │
│   ├── Traits/
│   │   ├── HasUuid.php
│   │   ├── HasTimestamps.php
│   │   └── ApiResponse.php
│   │
│   ├── Core/                         # ⭐ Advanced utilities (optional)
│   │   ├── Services/
│   │   ├── Traits/
│   │   ├── Exceptions/
│   │   └── Console/
│   │
│   └── Providers/
│       └── AppServiceProvider.php
│
├── config/
│   └── api.php                        # API configuration
│
├── database/
│   ├── migrations/
│   └── seeders/
│
├── routes/
│   ├── api.php                        # API routes (v1)
│   ├── web.php
│   └── console.php
│
├── tests/
│   ├── Feature/
│   └── Unit/
│
├── API_DOCUMENTATION.md               # API docs
├── CLAUDE.md                          # Development guidelines
└── ...
```

## Architecture Patterns

### 1. Repository Pattern
- **Location**: `app/Repositories/`
- **Purpose**: Abstraction layer for database operations
- **Usage**: Centralize database queries, make testing easier

### 2. Service Layer (Enhanced) ⭐
- **Location**: `app/Services/`
- **Purpose**: Business logic, validation, orchestration
- **Key Features**:
  - Post-commit operations (عمليات بعد Database Commit)
  - Transaction management
  - Lifecycle hooks: `beforeCreate`, `afterCreate`, `afterCreateCommitted`
  - Automatic cache clearing
- **Usage**: Complex operations, calculations, external APIs

**مثال:**
```php
class InvoiceService extends BaseService
{
    protected string $model = Invoice::class;

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // ✅ هنا بعد Database commit - آمن لـ:
        // - إرسال emails
        // - API calls خارجية
        // - تحديث أنظمة خارجية
        Mail::send(new InvoiceCreated($item));
    }
}
```

### 3. API Resources
- **Location**: `app/Http/Resources/`
- **Purpose**: Transform models for API responses
- **Usage**: Consistent data formatting

### 4. Form Requests
- **Location**: `app/Http/Requests/`
- **Purpose**: Centralized request validation
- **Usage**: Automatic validation before controller execution

### 5. Data Transfer Objects (DTOs)
- **Location**: `app/DTOs/`
- **Purpose**: Type-safe data transfer between layers
- **Usage**: Data validation and transformation

### 6. Controller Traits (New) ⭐
- **Location**: `app/Http/Controllers/Traits/`
- **Components**:
  - `ApiResponders`: Unified response formatting
  - `HasApiList`: Pagination and list helpers

## Development Guidelines

### 1. Creating a New Feature - Step by Step

```
Step 1: Create Migration
  → database/migrations/2024_xx_xx_create_xxx_table.php

Step 2: Create Model
  → app/Models/Xxx.php
  → Add relationships and accessors

Step 3: Create Repository (Optional for simple CRUD)
  → app/Repositories/XxxRepository.php
  → Extend BaseRepository

Step 4: Create Service ⭐ (Business Logic Here)
  → app/Services/XxxService.php
  → Extend BaseService
  → Implement hooks: beforeCreate, afterCreateCommitted, etc.

Step 5: Create Form Requests
  → app/Http/Requests/Xxx/StoreXxxRequest.php
  → app/Http/Requests/Xxx/UpdateXxxRequest.php

Step 6: Create Resources
  → app/Http/Resources/XxxResource.php
  → Define data transformation

Step 7: Create Controller ⭐ (Thin Layer)
  → app/Http/Controllers/Api/V1/XxxController.php
  → Extend BaseApiController
  → Implement: getService(), getModelClass()

Step 8: Register Routes
  → routes/api.php
  → Use resource routing when possible

Step 9: Write Tests
  → tests/Feature/XxxTest.php
  → tests/Unit/XxxTest.php
```

### 2. BaseApiController Example ⭐

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends BaseApiController
{
    protected string $resourceName = 'invoice';
    protected ?string $resourceClass = InvoiceResource::class;

    public function __construct(private InvoiceService $invoiceService)
    {
        parent::__construct();
    }

    // ✅ فقط تنفيذ الدوال المجردة
    protected function getService(): InvoiceService
    {
        return $this->invoiceService;
    }

    protected function getModelClass(): string
    {
        return Invoice::class;
    }

    // ⭐ جميع CRUD operations موجودة في BaseApiController:
    // - index(), show(), store(), update(), destroy(), restore()
    // - معالجة أخطاء موحدة
    // - تحويل Resources تلقائي
    // - logging محسّن
}
```

### 3. BaseService Example ⭐

```php
namespace App\Services;

use App\Models\Invoice;
use App\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class InvoiceService extends BaseService
{
    protected string $model = Invoice::class;
    protected string $resourceName = 'invoice';
    protected array $defaultWith = ['items', 'customer'];

    /**
     * Before creating - data preparation
     * ✅ محسّن: خارج Transaction
     */
    protected function beforeCreate(array $data, $request): array
    {
        // تحضير البيانات، حسابات، إلخ
        $data['total'] = collect($data['items'])->sum('amount');
        return $data;
    }

    /**
     * After database commit - external operations
     * ✅ محسّن: بعد Database Commit
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // ✅ آمن للعمليات الخارجية:
        // - إرسال emails
        // - API calls
        // - إشعارات SMS
        
        Mail::send(new InvoiceCreated($item));
        // Notification::send($item->customer, new InvoiceNotification($item));
    }

    /**
     * Business rule validation
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->status === 'paid') {
            throw new BusinessRuleException('لا يمكن تعديل فاتورة مدفوعة', 409);
        }
    }
}
```

### 4. Error Handling - Automatic ⭐

BaseApiController معالجة الأخطاء تلقائياً:

```php
// ❌ الطريقة القديمة:
public function store(Request $request): JsonResponse
{
    try {
        $user = $this->service->create($request->validated());
        return $this->successResponse($user, 'تم الإنشاء', 201);
    } catch (\Exception $e) {
        return $this->errorResponse($e->getMessage(), 500);
    }
}

// ✅ الطريقة الجديدة:
public function store(Request $request): JsonResponse
{
    try {
        $user = $this->getService()->create($request->validated());
        return $this->successResponse($user, 'تم الإنشاء', 201);
    } catch (\Throwable $e) {
        return $this->handleError($e, 'store'); // ✅ معالجة موحدة!
    }
}
```

**ماذا يفعل `handleError()`:**
- 🔍 يكتشف نوع الخطأ (404, 422, 403, 500)
- 📝 يسجل الخطأ بـ log level مناسب
- 🎯 يرد رد موحد بـ HTTP status صحيح
- 🔒 يخفي تفاصيل الأخطاء في production

## Exception Handling - Best Practices

### Exception Types:

```php
// ❌ Resource not found
throw new ModelNotFoundException('Invoice not found');

// ❌ User lacks permission
throw new AuthorizationException('You cannot edit this invoice');

// ❌ Validation failed
throw new ValidationException(['email' => ['Email is invalid']]);

// ⭐ Business rule violated
throw new BusinessRuleException('Cannot delete customer with active invoices', 409);
```

### Response Format

All API responses follow this format:
```json
{
  "status": "success|error",
  "message": "Human-readable message",
  "data": {},
  "timestamp": "2024-04-14T12:00:00Z",
  "meta": {
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7
  }
}
```

### Error Response Format
```json
{
  "status": "error",
  "code": "NOT_FOUND|VALIDATION_ERROR|BUSINESS_RULE_VIOLATION",
  "message": "ما هو الخطأ",
  "timestamp": "2024-04-14T12:00:00Z",
  "errors": {
    "field": ["validation message"]
  }
}
```

## Testing

### Unit Tests
```bash
php artisan test --filter=UserRepositoryTest
```

### Feature Tests
```bash
php artisan test --filter=AuthenticationTest
```

### Run all tests
```bash
composer test
```

## Useful Commands

```bash
# Create Controller
php artisan make:controller Api/V1/XxxController

# Create Model with migration
php artisan make:model Xxx -m

# Create Request
php artisan make:request Auth/RegisterRequest

# Create Resource
php artisan make:resource XxxResource

# Create Repository
php artisan make:class Repositories/XxxRepository

# Create Service
php artisan make:class Services/XxxService

# Create Exception
php artisan make:exception XxxException

# Create Middleware
php artisan make:middleware XxxMiddleware

# Run migrations
php artisan migrate

# Create seeder
php artisan make:seeder UserSeeder

# Run seeder
php artisan db:seed

# Generate API documentation
php artisan scribe:generate
```

## Coding Standards - Enhanced ⭐

### Naming Conventions
- **Classes**: PascalCase (InvoiceController, OrderService)
- **Methods**: camelCase (getUserData, createInvoice)
- **Constants**: UPPER_SNAKE_CASE (API_VERSION, MAX_ITEMS_PER_PAGE)
- **Variables**: snake_case ($invoice_total, $customer_email)
- **Database Tables**: snake_case, plural (users, invoices, order_items)
- **Database Columns**: snake_case (first_name, created_at)

### Type Hints (Always!) ⭐
```php
// ✅ صحيح
public function store(StoreInvoiceRequest $request): JsonResponse
{
    $invoice = $this->getService()->create($request->validated());
    return $this->successResponse($invoice, 'تم الإنشاء', 201);
}

// ❌ خطأ - بدون type hints
public function store($request) { }
```

### Service Layer Responsibilities ⭐

**يجب تكون في Service:**
- ✅ Business logic
- ✅ Validation
- ✅ Database transactions
- ✅ Calculations
- ✅ External API calls (بعد commit)
- ✅ Email sending (بعد commit)

**لا يجب تكون في Service:**
- ❌ HTTP request handling
- ❌ Response formatting
- ❌ Direct controller logic

### Transaction Safety ⭐

```php
// ✅ الطريقة الصحيحة - فصل واضح
public function create(array $data, $request = null): Model
{
    // 1. Pre-processing (خارج Transaction)
    $data = $this->beforeCreate($data, $request);

    // 2. Database operations (داخل Transaction فقط)
    $item = DB::transaction(function () use ($data, $request) {
        $item = $this->model::create($data);
        $this->afterCreate($item, $data, $request); // DB-only operations
        return $item->load($this->defaultWith);
    });

    // 3. Post-commit (خارج Transaction تماماً)
    $this->performPostCommitOperations($item, $data, $request, 'create');

    return $item;
}
```

### Comments - Quality Over Quantity

```php
// ✅ معنيف وواضح
protected function beforeCreate(array $data, $request): array
{
    // Calculate total amount from line items before saving
    $data['total'] = collect($data['items'])->sum('amount');
    return $data;
}

// ❌ تعليق غير ضروري
public function getName(): string
{
    return $this->name; // الكود نفسه واضح!
}
```

## Security Best Practices

✅ **Always**:
- Validate user input
- Hash passwords with Hash::make()
- Use CSRF tokens
- Use Laravel Sanctum for API auth
- Rate limit endpoints
- Log important actions
- Use HTTPS in production

❌ **Never**:
- Store passwords in plain text
- Trust user input
- Expose sensitive data in responses
- Log sensitive information
- Use SELECT *
- Hardcode credentials

## Performance Tips

1. **Use eager loading**: `with('relationship')`
2. **Cache frequently accessed data**: `cache()`
3. **Use pagination**: `paginate()`
4. **Add database indexes**: on foreign keys
5. **Use query builder**: `select()` specific columns
6. **Use workers for long tasks**: queue jobs

## Deployment Checklist

- [ ] Set `.env` variables correctly
- [ ] Run `php artisan migrate` on production
- [ ] Run `php artisan config:cache`
- [ ] Run `php artisan route:cache`
- [ ] Set up CORS if needed
- [ ] Enable HTTPS
- [ ] Set up logging
- [ ] Test all endpoints
- [ ] Set up monitoring

---

**Last Updated**: 2026-04-14
**Version**: 2.0 - Enterprise Architecture

## What's New in v2.0:

✅ **Enhanced BaseApiController**
- Smart error handling (`handleError()`)
- Automatic resource transformation
- Built-in authorization checks
- Unified logging

✅ **Enhanced BaseService**
- Post-commit operations (Transaction safety!)
- Lifecycle hooks: `beforeCreate` → `afterCreate` → `afterCreateCommitted`
- Automatic cache management
- Event dispatching

✅ **New Traits**
- `ApiResponders`: Unified response formatting
- `HasApiList`: Pagination helpers

✅ **Better Exception Handling**
- `BusinessRuleException`: For business logic violations
- Proper HTTP status codes
- Consistent error responses

✅ **Production-Ready**
- Proper transaction boundaries
- Email/SMS safety (post-commit)
- Comprehensive logging
- Error message sanitization
