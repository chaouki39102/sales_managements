# Getting Started Guide

## Video Overview ⏺️

This guide walks you through the professional setup of the Sales Management API.

---

## Prerequisites

- PHP 8.3 or higher
- Composer
- SQLite or MySQL
- Node.js (for frontend, if needed later)

---

## Installation

### 1. Clone & Install

```bash
cd d:\xampp\htdocs\sales-management

# Install dependencies (already done)
composer install
```

### 2. Generate Application Key

```bash
php artisan key:generate
```

### 3. Run Migrations

```bash
php artisan migrate
```

### 4. Start Development Server

```bash
php artisan serve
```

The API will be available at: `http://localhost:8000/api/v1`

---

## Quick Test

### Register a User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Current User (authenticated)

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Run Tests

```bash
# Run all tests
composer test

# Run specific test
php artisan test --filter=AuthenticationTest

# Run with coverage
php artisan test --coverage
```

---

## Project Structure Overview

### Controllers
- **Location**: `app/Http/Controllers/Api/V1/`
- **Pattern**: Extend `BaseApiController`
- **responsibility**: Handle HTTP requests and responses

### Services
- **Location**: `app/Services/`
- **Pattern**: Extend `BaseService`
- **Responsibility**: Business logic, validations, orchestration

### Repositories
- **Location**: `app/Repositories/`
- **Pattern**: Extend `BaseRepository`
- **Responsibility**: Database queries and data access

### Models
- **Location**: `app/Models/`
- **Responsibility**: Database representation, relationships

### Requests
- **Location**: `app/Http/Requests/`
- **Responsibility**: Input validation

### Resources
- **Location**: `app/Http/Resources/`
- **Responsibility**: Data transformation for API responses

---

## Creating New Features

### Example: Add Products Controller

#### 1. Create Model and Migration

```bash
php artisan make:model Product -m
```

#### 2. Create Repository

```bash
php artisan make:class Repositories/ProductRepository
```

Edit `app/Repositories/ProductRepository.php`:
```php
<?php

namespace App\Repositories;

use App\Models\Product;

class ProductRepository extends BaseRepository
{
    public function __construct(Product $model)
    {
        parent::__construct($model);
    }

    public function getActive()
    {
        return $this->model->where('active', true)->get();
    }
}
```

#### 3. Create Service

```bash
php artisan make:class Services/ProductService
```

Edit `app/Services/ProductService.php`:
```php
<?php

namespace App\Services;

use App\Repositories\ProductRepository;

class ProductService extends BaseService
{
    protected $productRepository;

    public function __construct(ProductRepository $productRepository)
    {
        parent::__construct($productRepository);
        $this->productRepository = $productRepository;
    }

    public function getActive()
    {
        return $this->productRepository->getActive();
    }
}
```

#### 4. Create Requests

```bash
php artisan make:request Products/StoreProductRequest
php artisan make:request Products/UpdateProductRequest
```

#### 5. Create Resource

```bash
php artisan make:resource ProductResource
```

#### 6. Create Controller

```bash
php artisan make:controller Api/V1/ProductController
```

Edit `app/Http/Controllers/Api/V1/ProductController.php`:
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\Products\StoreProductRequest;
use App\Http\Requests\Products\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;

class ProductController extends BaseApiController
{
    protected $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(): JsonResponse
    {
        $products = $this->productService->getPaginated(15);
        return $this->paginatedResponse(
            $products,
            'Products retrieved successfully'
        );
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        try {
            $product = $this->productService->create($request->validated());
            return $this->createdResponse(
                new ProductResource($product),
                'Product created successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $product = $this->productService->getById($id);
            return $this->successResponse(
                new ProductResource($product),
                'Product retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    public function update(UpdateProductRequest $request, $id): JsonResponse
    {
        try {
            $product = $this->productService->update($id, $request->validated());
            return $this->successResponse(
                new ProductResource($product),
                'Product updated successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $this->productService->delete($id);
            return $this->noContentResponse();
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}
```

#### 7. Register Routes

Edit `routes/api.php`:
```php
Route::prefix('v1')->group(function () {
    // ... other routes ...
    
    Route::apiResource('products', \App\Http\Controllers\Api\V1\ProductController::class)
        ->middleware('auth:sanctum');
});
```

#### 8. Write Tests

```bash
php artisan make:test Feature/ProductTest
```

---

## Useful Artisan Commands

```bash
# Create a new controller
php artisan make:controller Api/V1/NameController

# Create a model with migration
php artisan make:model Name -m

# Create a form request
php artisan make:request NameRequest

# Create a resource
php artisan make:resource NameResource

# Create a test
php artisan make:test NameTest

# Run migration
php artisan migrate

# Rollback migration
php artisan migrate:rollback

# View all routes
php artisan route:list

# Clear all caches
php artisan cache:clear && php artisan config:clear

# Run tests
php artisan test

# Tinker (REPL)
php artisan tinker
```

---

## Configuration Files

### API Configuration
- **File**: `config/api.php`
- **Purpose**: Centralized API settings
- **Usage**: `config('api.pagination.per_page')`

### Application Configuration
- **File**: `config/app.php`  
- **Purpose**: App name, locale, providers
- **Settings**: Already configured

### Database Configuration
- **File**: `config/database.php`
- **Use**: SQLite by default, change DB_CONNECTION in `.env`

---

## Environment Variables

Key environment variables in `.env`:

```env
APP_NAME="Sales Management"        # Application name
APP_ENV=local                      # Environment (local/staging/production)
APP_DEBUG=true                     # Debug mode
APP_URL=http://localhost:8000      # Application URL

APP_LOCALE=ar                      # Default locale
TELESCOPE_ENABLED=true             # Enable Telescope
API_PAGINATION=15                  # Default pagination size

DB_CONNECTION=sqlite               # Database type
```

---

## Monitoring & Debugging

### 1. Telescope Dashboard

```
http://localhost:8000/telescope
```

Features:
- Monitor all requests
- View database queries
- Check exceptions
- Review logs
- Inspect commands

### 2. Real-time Logs

```bash
php artisan pail
```

### 3. Tinker (Interactive Shell)

```bash
php artisan tinker

# Example queries
>>> User::all()
>>> User::find(1)
>>> Role::create(['name' => 'admin'])
>>> auth()->user()->givePermissionTo('edit-users')
```

### 4. Code Formatting

```bash
./vendor/bin/pint
```

---

## Performance Tips

### 1. Enable Caching

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 2. Database Optimization

- Always use indexes on frequently queried columns
- Use eager loading with `with()`
- Avoid N+1 queries

```php
// ❌ Bad - N+1 query
$users = User::all();
foreach ($users as $user) {
    echo $user->posts; // Extra query for each user
}

// ✅ Good - Eager loading
$users = User::with('posts')->get();
```

### 3. Pagination

Always paginate large result sets:

```php
$users = User::paginate(15); // Not all()
```

---

## Deployment Checklist

- [ ] Set up production database
- [ ] Update `.env` with production values
- [ ] Set `APP_DEBUG=false`
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Cache config: `php artisan config:cache`
- [ ] Cache routes: `php artisan route:cache`
- [ ] Set up monitoring (Telescope, Sentry)
- [ ] Configure CORS if needed
- [ ] Set up SSL/HTTPS
- [ ] Test all endpoints thoroughly
- [ ] Set up backup strategy
- [ ] Configure logging

---

## Troubleshooting

### "Class not found" Error

```bash
# Clear autoloader
composer dump-autoload
```

### Database Connection Error

```bash
# Check .env database settings
# Verify database exists
# Run migrations: php artisan migrate
```

### Port Already in Use

```bash
# Use different port
php artisan serve --port=8001
```

### Cache Issues

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

---

## Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Spatie Packages](https://spatie.be/open-source)
- [API Best Practices](https://restfulapi.net/)
- [TypeScript for Laravel Developers](https://laravelts.dev/)

---

## Support

For questions or issues:
1. Check API_DOCUMENTATION.md
2. Check CLAUDE.md for guidelines
3. Review PACKAGES.md for package details
4. Check test examples in tests/

---

**Last Updated**: 2026-04-14
**Status**: ✅ Ready for Development
