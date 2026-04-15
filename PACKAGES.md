# Installed Packages & Libraries

## Production Dependencies

### 1. Laravel Framework (^13.0)
- **Purpose**: Web framework
- **Usage**: Core framework for API and application logic
- **Docs**: https://laravel.com/docs

### 2. Laravel Sanctum (^4.0)
- **Purpose**: API token authentication
- **Usage**: Secure API endpoints with token-based authentication
- **Features**: Token generation, revocation, expiration
- **Docs**: https://laravel.com/docs/sanctum

### 3. Laravel Tinker (^3.0)
- **Purpose**: Interactive shell for Laravel
- **Usage**: Testing code, debugging, exploring database
- **Command**: `php artisan tinker`

### 4. Maatwebsite Excel (^3.1)
- **Purpose**: Import/Export Excel files
- **Usage**: Import/export commercial documents, reports
- **Features**: Multiple formats, chunking, queuing
- **Docs**: https://docs.laravel-excel.com

### 5. Spatie Query Builder (^7.2)
- **Purpose**: Dynamic query building for APIs
- **Usage**: Filter, sort, include relationships automatically
- **Features**: Filtering, sorting, pagination
- **Installation**: Already integrated

```php
QueryBuilder::for(User::class)
    ->allowedFilters('name', 'email')
    ->allowedSorts('created_at')
    ->paginate();
```

### 6. Vinkla Hashids (^14.0)
- **Purpose**: Hide auto-incrementing IDs in URLs
- **Usage**: Encode/decode IDs for public APIs
- **Features**: Short, unique, obfuscated IDs

```php
hashids('user')->encode($user->id);  // → abc123
hashids('user')->decode('abc123');   // → 1
```

### 7. Spatie Laravel Permission (^7.3)
- **Purpose**: Role & permission management
- **Usage**: Control user access and abilities
- **Features**: Roles, permissions, middleware
- **Installation**: Just completed

**Basic Usage:**
```php
// Create role
$admin = Role::create(['name' => 'admin']);

// Assign permission
$admin->givePermissionTo('edit-users');

// Check permission
auth()->user()->can('edit-users');
```

### 8. Spatie Laravel Media Library (^11.21)
- **Purpose**: File/media management
- **Usage**: Upload, store, manage documents and images
- **Features**: Image optimization, responsive images
- **Installation**: Just completed

**Basic Usage:**
```php
$user->addMedia($file)->toMediaCollection('avatars');
$user->getMedia('avatars');
```

### 9. Spatie Image Optimizer (^1.8.1)
- **Purpose**: Image optimization
- **Usage**: Automatically optimize uploaded images
- **Features**: Compression, format conversion

### 10. Laravel Telescope (^5.20)
- **Purpose**: Debugging & monitoring tool
- **Usage**: Monitor requests, queries, logs, exceptions
- **Installation**: Just completed
- **Access**: `http://localhost:8000/telescope`

**Features:**
- Request/Response inspection
- Database query monitoring
- Command monitoring
- Scheduled job monitoring
- Exception tracking
- Log viewer

---

## Development Dependencies

### 1. FakerPHP Faker (^1.23)
- **Purpose**: Generate fake data
- **Usage**: Seeding database with test data
- **Docs**: https://github.com/FakerPHP/Faker

```php
$factory->define(User::class, function (Faker $faker) {
    return [
        'name' => $faker->name,
        'email' => $faker->email,
    ];
});
```

### 2. Laravel Pail (^1.2.5)
- **Purpose**: Real-time log viewer
- **Usage**: Monitor application logs in real-time
- **Command**: `php artisan pail`

### 3. Laravel Pint (^1.27)
- **Purpose**: Code linting & formatting
- **Usage**: Enforce PSR-12 coding standards
- **Command**: `./vendor/bin/pint`

### 4. Mockery (^1.6)
- **Purpose**: Mocking library for testing
- **Usage**: Create mock objects for unit tests

```php
$mock = Mockery::mock(UserService::class);
$mock->shouldReceive('find')->andReturn($user);
```

### 5. Nunomaduro Collision (^8.6)
- **Purpose**: Beautiful error display
- **Usage**: Better error messages in console
- **Shown In**: Laravel Artisan output

### 6. PHPUnit (^12.5.12)
- **Purpose**: Unit testing framework
- **Usage**: Write and run feature/unit tests
- **Config**: `phpunit.xml`

**Basic Test:**
```php
public function test_user_can_login()
{
    $response = $this->post('/api/v1/auth/login', [
        'email' => 'user@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200);
}
```

### 7. Symfony Var Dumper (^7.0)
- **Purpose**: Enhanced debugging output
- **Usage**: Better dd() and dump() display
- **Usage**: `dd($variable)` or `dump($variable)`

---

## Recommended Packages to Add Later

### 1. spatie/laravel-fractal
```bash
composer require spatie/laravel-fractal
```
- Purpose: Transform/serialize models for APIs
- Use Case: Complex nested data transformation

### 2. spatie/laravel-activity-log
```bash
composer require spatie/laravel-activity-log
```
- Purpose: Log user activities and changes
- Use Case: Audit trail, track changes

### 3. spatie/laravel-enum
```bash
composer require spatie/laravel-enum
```
- Purpose: Database enums
- Use Case: Type-safe enum values

### 4. laravel/horizon
```bash
composer require laravel/horizon
```
- Purpose: Queue monitoring dashboard
- Use Case: Monitor background jobs

### 5. predis/predis
```bash
composer require predis/predis
```
- Purpose: Redis client
- Use Case: Caching, sessions, queues

### 6. laravel/scout
```bash
composer require laravel/scout
```
- Purpose: Full-text search
- Use Case: Fast searching of documents

### 7. openai/openai
```bash
composer require openai/openai
```
- Purpose: OpenAI API integration
- Use Case: AI features, automations

---

## Setup Instructions

### 1. Publish Package Configurations

```bash
# Laravel Telescope
php artisan telescope:install

# Laravel Permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# Laravel Media Library
php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider"
```

### 2. Run Migrations

```bash
php artisan migrate
```

### 3. Environment Variables

Add to `.env`:
```env
TELESCOPE_ENABLED=true
MEDIA_DISK=public
```

### 4. Verify Installation

```bash
# Test Laravel
php artisan tinker

# Test Query Builder
php artisan make:test UserQueryTest

# Test Permissions
php artisan tinker
>>> Role::create(['name' => 'admin'])
```

---

## Performance Optimization

### Enable Caching
```bash
php artisan config:cache
php artisan route:cache
```

### Monitor with Telescope
```
http://localhost:8000/telescope → Click "Requests"
```

### Check Database Queries
```bash
php artisan pail --filter=query
```

---

## Useful Commands

```bash
# List all installed packages
composer show

# Check for updates
composer outdated

# Update a specific package
composer update spatie/laravel-permission

# Clear all caches
php artisan cache:clear && php artisan config:clear

# View routes
php artisan route:list

# Run tests
composer test

# Format code
./vendor/bin/pint
```

---

## Documentation Links

- [Laravel Documentation](https://laravel.com/docs)
- [Spatie Packages](https://spatie.be/open-source)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)
- [PHPUnit](https://phpunit.de)
- [Composer](https://getcomposer.org)

---

**Last Updated**: 2026-04-14
**Total Packages**: 16 (6 Dev)
