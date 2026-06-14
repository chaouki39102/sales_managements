<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Artisan;

/**
 * Complete CRUD Generator - Advanced Version
 *
 * يولد CRUD كامل متوافق مع نظام AutoDiscovery والـ BaseApiController
 *
 * Features:
 * ✅ توليد Model من Migration
 * ✅ توليد Controller مع Attributes للـ AutoDiscovery
 * ✅ توليد Service Layer
 * ✅ توليد Form Requests (Store & Update)
 * ✅ توليد API Resource
 * ✅ توليد Factory & Seeder (اختياري)
 * ✅ دعم الإصدارات المتعددة (v1, v2, ...)
 * ✅ تكامل كامل مع BaseApiController
 * ✅ استدعاء تلقائي لـ route:auto-discover
 *
 * Usage:
 * php artisan make:complete-crud {migration} {--name=} {--api-version=v1} {--with-factory} {--with-seeder} {--force}
 *
 * Examples:
 * php artisan make:complete-crud create_products_table
 * php artisan make:complete-crud create_products_table --name=Product --api-version=v1
 * php artisan make:complete-crud create_products_table --with-factory --with-seeder
 */
class MakeCompleteCrudCommand extends Command
{
    protected $signature = 'make:complete-crud
                            {migration : اسم ملف الـ Migration}
                            {--name= : اسم الـ Model (اختياري، يتم استنتاجه من اسم الجدول)}
                            {--api-version=v1 : إصدار الـ API (v1, v2, ...)}
                            {--with-factory : توليد Factory}
                            {--with-seeder : توليد Seeder}
                            {--with-policy : توليد Policy للصلاحيات}
                            {--with-test : توليد Test Files}
                            {--with-bulk : إضافة عمليات Bulk}
                            {--force : استبدال الملفات الموجودة}
                            {--no-discover : عدم تشغيل AutoDiscovery تلقائياً}
                            {--skip-validation : تخطي التحقق من البيانات}';

    protected $description = 'Generate complete CRUD (Model, Controller, Service, Requests, Resource) from Migration';

    // ===============================================
    // Properties
    // ===============================================

    protected string $migrationName;
    protected string $modelName;
    protected string $tableName;
    protected string $version;
    protected string $versionUpper;
    protected string $migrationPath;

    protected array $columns = [];
    protected array $foreignKeys = [];
    protected bool $hasSoftDeletes = false;

    // ===============================================
    // Main Handler
    // ===============================================

    public function handle(): int
    {
        try {
            $this->info("╔═══════════════════════════════════════════════════════════╗");
            $this->info("║          🚀 Complete CRUD Generator Started              ║");
            $this->info("╚═══════════════════════════════════════════════════════════╝");
            $this->newLine();

            // 1. Initialize
            if (!$this->initializeCommand()) {
                return Command::FAILURE;
            }

            // 2. Display Info
            $this->displayInfo();

            // 3. Confirm
            if (!$this->option('force') && !$this->confirm('هل تريد المتابعة؟', true)) {
                $this->warn('⊗ تم الإلغاء');
                return Command::SUCCESS;
            }

            $this->newLine();

            // 4. Generate Files
            $this->generateModel();
            $this->generateController();
            $this->generateService();
            $this->generateRequests();
            $this->generateResource();

            if ($this->option('with-factory')) {
                $this->generateFactory();
            }

            if ($this->option('with-seeder')) {
                $this->generateSeeder();
            }

            // 6. Generate Policy (optional)
            if ($this->option('with-policy')) {
                $this->generatePolicy();
            }

            // 7. Generate Tests (optional)
            if ($this->option('with-test')) {
                $this->generateTests();
            }

            // 8. Run AutoDiscovery
            if (!$this->option('no-discover')) {
                $this->runAutoDiscovery();
            }

            // 6. Display Summary
            $this->displaySuccessSummary();

            return Command::SUCCESS;

        } catch (\Throwable $e) {
            $this->error("✗ حدث خطأ: " . $e->getMessage());

            if ($this->option('verbose')) {
                $this->newLine();
                $this->error("File: " . $e->getFile());
                $this->error("Line: " . $e->getLine());
                $this->newLine();
                $this->error($e->getTraceAsString());
            }

            return Command::FAILURE;
        }
    }

    // ===============================================
    // Initialization
    // ===============================================

    protected function initializeCommand(): bool
    {
        // Get migration name
        $this->migrationName = $this->argument('migration');

        // Find migration file
        $this->migrationPath = $this->findMigration($this->migrationName);

        if (!$this->migrationPath) {
            $this->error("✗ لم يتم العثور على Migration: {$this->migrationName}");
            return false;
        }

        // Parse migration
        $migrationContent = File::get($this->migrationPath);
        $this->tableName = $this->extractTableName($migrationContent);

        // Determine model name
        $this->modelName = $this->option('name')
            ?? Str::studly(Str::singular($this->tableName));

        // Set version (تغيير هنا)
        $this->version = strtolower($this->option('api-version'));
        $this->versionUpper = strtoupper($this->version);

        // Validate version format
        if (!preg_match('/^v\d+$/', $this->version)) {
            $this->error("✗ صيغة الإصدار غير صحيحة: {$this->version}");
            $this->info("الصيغة المطلوبة: v1, v2, v3, ...");
            return false;
        }

        // Analyze migration
        $this->analyzeMigration($migrationContent);

        return true;
    }

    protected function findMigration(string $name): ?string
    {
        $paths = [
            database_path('migrations'),
            database_path('migrations/tenant'),
        ];

        foreach ($paths as $path) {
            if (!File::isDirectory($path)) {
                continue;
            }

            $files = File::files($path);
            foreach ($files as $file) {
                if (Str::contains($file->getFilename(), $name)) {
                    return $file->getPathname();
                }
            }
        }

        return null;
    }

    protected function extractTableName(string $content): string
    {
        if (preg_match('/Schema::create\([\'"](\w+)[\'"]/', $content, $match)) {
            return $match[1];
        }
        return 'unknown';
    }

    protected function analyzeMigration(string $content): void
    {
        // Detect SoftDeletes
        $this->hasSoftDeletes = preg_match('/\$table->softDeletes\(\)/', $content) > 0;

        // Parse columns (basic detection)
        preg_match_all('/\$table->(\w+)\([\'"](\w+)[\'"]/', $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $this->columns[$match[2]] = $match[1];
        }

        // Parse foreign keys
        preg_match_all('/\$table->foreignId\([\'"](\w+)[\'"]\)/', $content, $fkMatches);
        foreach ($fkMatches[1] as $fkColumn) {
            $this->foreignKeys[] = [
                'column' => $fkColumn,
                'model' => Str::studly(str_replace('_id', '', $fkColumn)),
            ];
        }
    }

    // ===============================================
    // Display Methods
    // ===============================================

    protected function displayInfo(): void
    {
        $this->table(
            ['Property', 'Value'],
            [
                ['Migration File', basename($this->migrationPath)],
                ['Table Name', $this->tableName],
                ['Model Name', $this->modelName],
                ['API Version', $this->versionUpper],
                ['Columns', count($this->columns)],
                ['Foreign Keys', count($this->foreignKeys)],
                ['SoftDeletes', $this->hasSoftDeletes ? '✓' : '✗'],
                ['Factory', $this->option('with-factory') ? '✓' : '✗'],
                ['Seeder', $this->option('with-seeder') ? '✓' : '✗'],
            ]
        );
    }

    protected function displaySuccessSummary(): void
    {
        $this->newLine();
        $this->info("╔═══════════════════════════════════════════════════════════╗");
        $this->info("║              ✨ CRUD Generated Successfully!              ║");
        $this->info("╚═══════════════════════════════════════════════════════════╝");
        $this->newLine();

        $files = [
            "✓ Model: app/Models/{$this->modelName}.php",
            "✓ Controller: app/Http/Controllers/Api/{$this->versionUpper}/{$this->modelName}Controller.php",
            "✓ Service: app/Services/{$this->modelName}Service.php",
            "✓ Requests: app/Http/Requests/Store{$this->modelName}Request.php",
            "           app/Http/Requests/Update{$this->modelName}Request.php",
            "✓ Resource: app/Http/Resources/{$this->modelName}Resource.php",
        ];

        if ($this->option('with-factory')) {
            $files[] = "✓ Factory: database/factories/{$this->modelName}Factory.php";
        }

        if ($this->option('with-seeder')) {
            $files[] = "✓ Seeder: database/seeders/{$this->modelName}Seeder.php";
        }

        foreach ($files as $file) {
            $this->line("  {$file}");
        }

        $this->newLine();
        $this->comment("Next Steps:");
        $this->line("  1. Review generated files");
        $this->line("  2. Update validation rules in Requests");
        $this->line("  3. Customize business logic in Service");
        $this->line("  4. Test API endpoints");

        $this->newLine();
        $this->comment("API Endpoints (AutoDiscovered):");
        $modelSnake = Str::snake($this->modelName);
        $this->line("  GET    /api/{$this->version}/{$modelSnake}s");
        $this->line("  POST   /api/{$this->version}/{$modelSnake}s");
        $this->line("  GET    /api/{$this->version}/{$modelSnake}s/{id}");
        $this->line("  PUT    /api/{$this->version}/{$modelSnake}s/{id}");
        $this->line("  DELETE /api/{$this->version}/{$modelSnake}s/{id}");
        $this->newLine();
    }

    // ===============================================
    // Generation Methods
    // ===============================================

    protected function generateModel(): void
    {
        $this->info("→ Generating Model...");

        // Use existing command to generate standardized model
        Artisan::call('make:model-advanced', [
            'migration' => $this->migrationName,
            '--name' => $this->modelName,
            '--force' => $this->option('force'),
        ]);

        $this->line("  ✓ Model generated");
    }

    protected function generateController(): void
    {
        $this->info("→ Generating Controller...");

        $content = $this->getControllerStub();
        $path = app_path("Http/Controllers/Api/{$this->versionUpper}/{$this->modelName}Controller.php");

        $this->saveFile($path, $content, 'Controller');
    }

    protected function generateService(): void
    {
        $this->info("→ Generating Service...");

        $content = $this->getServiceStub();
        $path = app_path("Services/{$this->modelName}Service.php");

        $this->saveFile($path, $content, 'Service');
    }

    protected function generateRequests(): void
    {
        $this->info("→ Generating Requests...");

        // Use existing command to generate requests
        Artisan::call('make:requests', [
            'model' => $this->modelName,
            '--force' => $this->option('force'),
            '--with-messages' => true,
        ]);

        $this->line("  ✓ Requests generated");
    }

    protected function generateResource(): void
    {
        $this->info("→ Generating Resource...");

        $content = $this->getResourceStub();
        $path = app_path("Http/Resources/{$this->modelName}Resource.php");

        $this->saveFile($path, $content, 'Resource');
    }

    protected function generateFactory(): void
    {
        $this->info("→ Generating Factory...");

        Artisan::call('make:model-advanced', [
            'migration' => $this->migrationName,
            '--name' => $this->modelName,
            '--with-factory' => true,
            '--force' => $this->option('force'),
        ]);

        $this->line("  ✓ Factory generated");
    }

    protected function generateSeeder(): void
    {
        $this->info("→ Generating Seeder...");

        Artisan::call('make:model-advanced', [
            'migration' => $this->migrationName,
            '--name' => $this->modelName,
            '--with-seeder' => true,
            '--force' => $this->option('force'),
        ]);

        $this->line("  ✓ Seeder generated");
    }

    protected function generatePolicy(): void
    {
        $this->info("→ Generating Policy...");

        $content = $this->getPolicyStub();
        $path = app_path("Policies/{$this->modelName}Policy.php");

        $this->saveFile($path, $content, 'Policy');
    }

    protected function generateTests(): void
    {
        $this->info("→ Generating Tests...");

        // Feature Test
        $featureContent = $this->getFeatureTestStub();
        $featurePath = base_path("tests/Feature/{$this->modelName}ApiTest.php");
        $this->saveFile($featurePath, $featureContent, 'Feature Test');

        // Unit Test
        $unitContent = $this->getUnitTestStub();
        $unitPath = base_path("tests/Unit/{$this->modelName}ServiceTest.php");
        $this->saveFile($unitPath, $unitContent, 'Unit Test');
    }

    protected function runAutoDiscovery(): void
    {
        $this->newLine();
        $this->info("→ Running AutoDiscovery...");

        Artisan::call('route:auto-discover', [
            '--fresh' => true,
        ]);

        $this->line("  ✓ Routes discovered and registered");
    }

    // ===============================================
    // Stubs
    // ===============================================

   protected function getControllerStub(): string
    {
        $modelNameLower = Str::lower($this->modelName);
        $modelNameSnake = Str::snake($this->modelName);
        $modelNamePlural = Str::plural($modelNameSnake);

        $restoreMethod = $this->hasSoftDeletes ? $this->generateRestoreMethod($modelNameSnake) : '';
        $bulkMethods = $this->shouldIncludeBulkOperations() ? $this->generateBulkMethods($modelNameSnake) : '';


        return <<<PHP
<?php

namespace App\Http\Controllers\Api\\{$this->versionUpper};

use App\Core\Http\Controllers\BaseApiController;
use App\Core\Attributes\Group;
use App\Core\Attributes\Get;
use App\Core\Attributes\Post;
use App\Core\Attributes\Put;
use App\Core\Attributes\Delete;
use App\Models\\{$this->modelName};
use App\Services\\{$this->modelName}Service;
use App\Http\Resources\\{$this->modelName}Resource;
use App\Http\Requests\Store{$this->modelName}Request;
use App\Http\Requests\Update{$this->modelName}Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * {$this->modelName} API Controller
 *
 * Manages {$modelNameLower} resources with full CRUD operations.
 * All routes are auto-discovered via Attributes.
 *
 * Features:
 * - Standard CRUD operations (index, store, show, update, destroy)
 * - Search, Filter, Sort capabilities via ApiListService
 * - Pagination with configurable limits
 * - Relationship loading via ?include=relation
 * - Field selection via ?fields=field1,field2
 * - Caching support (if enabled in model)
 *
 * @package App\Http\Controllers\Api\\{$this->versionUpper}
 */
#[Group(
    prefix: '/{$modelNamePlural}',
    middleware: ['auth:sanctum'],
    name: '{$modelNameSnake}.'
)]
class {$this->modelName}Controller extends BaseApiController
{
    // ==================== Configuration ====================

    protected string \$resourceName = '{$modelNameLower}';
    protected ?string \$resourceClass = {$this->modelName}Resource::class;

    // ==================== Constructor ====================

    public function __construct(protected {$this->modelName}Service \$service)
    {
        parent::__construct();
    }

    // ==================== Required Methods ====================

    protected function getService(): {$this->modelName}Service
    {
        return \$this->service;
    }

    protected function getModelClass(): string
    {
        return {$this->modelName}::class;
    }

    // ==================== CRUD Operations ====================

    /**
     * Display a listing of {$modelNameLower}s
     *
     * Query Parameters:
     * - search: Global search term
     * - filter[field]: Filter by specific field
     * - sort: Sort by field (prefix with - for descending)
     * - per_page: Items per page (default: 15, max: 100)
     * - include: Relationships to load (comma-separated)
     * - fields: Specific fields to select (comma-separated)
     *
     * @param Request \$request
     * @return JsonResponse
     */
    #[Get('/', name: 'index')]
    public function index(Request \$request): JsonResponse
    {
        return parent::index(\$request);
    }

    /**
     * Store a newly created {$modelNameLower}
     *
     * @param Store{$this->modelName}Request \$request
     * @return JsonResponse
     */
    #[Post('/', name: 'store')]
    public function store(Store{$this->modelName}Request \$request): JsonResponse
    {
        return parent::store(\$request);
    }

    /**
     * Display the specified {$modelNameLower}
     *
     * Query Parameters:
     * - include: Relationships to load (comma-separated)
     *
     * @param string \$id
     * @return JsonResponse
     */
    #[Get('/{id}', name: 'show')]
    public function show(\$id): JsonResponse
    {
        return parent::show(\$id);
    }

    /**
     * Update the specified {$modelNameLower}
     *
     * @param Update{$this->modelName}Request \$request
     * @param string \$id
     * @return JsonResponse
     */
    #[Put('/{id}', name: 'update')]
    public function update(Update{$this->modelName}Request \$request, \$id): JsonResponse
    {
        return parent::update(\$request, \$id);
    }

    /**
     * Remove the specified {$modelNameLower}
     *
     * @param string \$id
     * @return JsonResponse
     */
    #[Delete('/{id}', name: 'destroy')]
    public function destroy(\$id): JsonResponse
    {
        return parent::destroy(\$id);
    }
{$restoreMethod}{$bulkMethods}
    // ==================== Custom Endpoints ====================

    // TODO: Add custom endpoints here
    // Example 1: Toggle active status
    // #[Post('/{id}/toggle-active', name: 'toggle-active')]
    // public function toggleActive(\$id): JsonResponse
    // {
    //     try {
    //         \$item = \$this->getService()->findById(\$id);
    //         \$this->authorizeAction('update', \$item);
    //
    //         \$item->toggleActive();
    //
    //         return \$this->successResponse(
    //             \$this->transformItem(\$item),
    //             'Status toggled successfully'
    //         );
    //     } catch (\Throwable \$e) {
    //         return \$this->handleError(\$e, 'toggleActive');
    //     }
    // }

    // Example 2: Export to Excel
    // #[Get('/export', name: 'export')]
    // public function export(Request \$request): JsonResponse
    // {
    //     try {
    //         \$this->authorizeAction('viewAny', \$this->getModelClass());
    //
    //         // Use HandlesApiExports trait method
    //         return \$this->exportToExcel(\$request, {$this->modelName}::class);
    //     } catch (\Throwable \$e) {
    //         return \$this->handleError(\$e, 'export');
    //     }
    // }
}

PHP;
    }

    protected function generateRestoreMethod(string $modelNameSnake): string
    {
        return <<<METHOD


    // ==================== SoftDelete Operations ====================

    /**
     * Restore a soft-deleted {$modelNameSnake}
     *
     * @param string \$id
     * @return JsonResponse
     */
    #[Post('/{id}/restore', name: 'restore')]
    public function restore(\$id): JsonResponse
    {
        return parent::restore(\$id);
    }

    /**
     * Get trashed {$modelNameSnake}s
     *
     * @param Request \$request
     * @return JsonResponse
     */
    #[Get('/trashed', name: 'trashed')]
    public function trashed(Request \$request): JsonResponse
    {
        try {
            \$this->authorizeAction('viewAny', \$this->getModelClass());

            \$data = \$this->getService()->getTrashed(\$request);

            return \$this->successResponse(\$data);
        } catch (\Throwable \$e) {
            return \$this->handleError(\$e, 'trashed');
        }
    }
METHOD;
    }

    protected function generateBulkMethods(string $modelNameSnake): string
    {
        return <<<BULK


    // ==================== Bulk Operations ====================

    /**
     * Bulk delete {$modelNameSnake}s
     *
     * Request body: { "ids": [1, 2, 3] }
     *
     * @param Request \$request
     * @return JsonResponse
     */
    #[Post('/bulk-delete', name: 'bulk-delete')]
    public function bulkDelete(Request \$request): JsonResponse
    {
        try {
            \$request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer|exists:{$this->tableName},id',
            ]);

            \$this->authorizeAction('delete', \$this->getModelClass());

            \$count = \$this->getService()->bulkDelete(\$request->ids);

            return \$this->successResponse(
                ['deleted_count' => \$count],
                "Successfully deleted {\$count} {$modelNameSnake}(s)"
            );
        } catch (\Throwable \$e) {
            return \$this->handleError(\$e, 'bulkDelete');
        }
    }

    /**
     * Bulk update {$modelNameSnake}s
     *
     * Request body: { "ids": [1, 2, 3], "data": {...} }
     *
     * @param Request \$request
     * @return JsonResponse
     */
    #[Post('/bulk-update', name: 'bulk-update')]
    public function bulkUpdate(Request \$request): JsonResponse
    {
        try {
            \$request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer|exists:{$this->tableName},id',
                'data' => 'required|array',
            ]);

            \$this->authorizeAction('update', \$this->getModelClass());

            \$count = \$this->getService()->bulkUpdate(\$request->ids, \$request->data);

            return \$this->successResponse(
                ['updated_count' => \$count],
                "Successfully updated {\$count} {$modelNameSnake}(s)"
            );
        } catch (\Throwable \$e) {
            return \$this->handleError(\$e, 'bulkUpdate');
        }
    }
BULK;
    }

    protected function shouldIncludeBulkOperations(): bool
    {
        // Include bulk operations if model doesn't have complex relations
        return count($this->foreignKeys) < 3;
    }

    protected function getServiceStub(): string
    {
        $modelNameLower = Str::lower($this->modelName);
        $relations = $this->buildRelationsArray();
        $relationMethods = $this->buildServiceRelationMethods();

        return <<<PHP
<?php

namespace App\Services;

use App\Core\Services\BaseService;
use App\Models\\{$this->modelName};
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * {$this->modelName} Service Layer
 *
 * Handles business logic for {$modelNameLower} operations.
 *
 * Features:
 * - Transactional operations (create, update, delete)
 * - Lifecycle hooks (before/after operations)
 * - Relationship management
 * - Business rule validation
 * - Event dispatching
 *
 * @package App\Services
 */
class {$this->modelName}Service extends BaseService
{
    // ==================== Configuration ====================

    protected string \$model = {$this->modelName}::class;
    protected string \$resourceName = '{$modelNameLower}';

    /** @var array Default relationships to load in list */
    protected array \$defaultWith = {$relations};

    /** @var array Relationships to load when showing single item */
    protected array \$showWith = {$relations};

    // ==================== Lifecycle Hooks ====================

    /**
     * Prepare data before creating
     *
     * @param array \$data
     * @param Request \$request
     * @return array
     */
    protected function beforeCreate(array \$data, Request \$request): array
    {
        // TODO: Add custom logic before creating

        // Example: Generate slug
        // if (isset(\$data['name']) && !isset(\$data['slug'])) {
        //     \$data['slug'] = Str::slug(\$data['name']);
        // }

        // Example: Set default values
        // \$data['status'] = \$data['status'] ?? 'draft';
        // \$data['user_id'] = \$data['user_id'] ?? auth()->id();

        return \$data;
    }

    /**
     * Handle actions after creating (within transaction)
     *
     * @param Model \$item
     * @param array \$data
     * @param Request \$request
     * @return void
     */
    protected function afterCreate(Model \$item, array \$data, Request \$request): void
    {
        // TODO: Add custom logic after creating (within transaction)

        // Example: Attach relationships
        // if (isset(\$data['tags'])) {
        //     \$item->tags()->attach(\$data['tags']);
        // }

        // Example: Create related records
        // if (isset(\$data['details'])) {
        //     \$item->details()->createMany(\$data['details']);
        // }

        // Example: Update related models
        // if (isset(\$data['category_id'])) {
        //     Category::find(\$data['category_id'])->increment('items_count');
        // }
    }

    /**
     * Handle actions after create transaction committed
     *
     * @param Model \$item
     * @param array \$data
     * @param Request \$request
     * @return void
     */
    protected function afterCreateCommitted(Model \$item, array \$data, Request \$request): void
    {
        // TODO: Add custom logic after transaction committed
        // Use this for actions that should happen even if later operations fail

        // Example: Send notifications
        // Notification::send(\$users, new {$this->modelName}Created(\$item));

        // Example: Dispatch jobs
        // ProcessNewItem::dispatch(\$item);

        // Example: Fire events
        // event(new {$this->modelName}Created(\$item));

        // Example: Clear cache
        // Cache::tags(['{$this->tableName}'])->flush();
    }

    /**
     * Prepare data before updating
     *
     * @param Model \$item
     * @param array \$data
     * @param Request \$request
     * @return void
     */
    protected function beforeUpdate(Model \$item, array \$data, Request \$request): void
    {
        // TODO: Add custom logic before updating

        // Example: Validate business rules
        // if (isset(\$data['status']) && \$data['status'] === 'published' && !\$item->is_complete) {
        //     throw new BusinessRuleException('Cannot publish incomplete item');
        // }

        // Example: Track changes
        // if (\$item->isDirty('important_field')) {
        //     Log::info('{$this->modelName} important_field changed', [
        //         'id' => \$item->id,
        //         'old' => \$item->getOriginal('important_field'),
        //         'new' => \$data['important_field'],
        //     ]);
        // }
    }

    /**
     * Handle actions after updating (within transaction)
     *
     * @param Model \$item
     * @param array \$data
     * @param Request \$request
     * @return void
     */
    protected function afterUpdate(Model \$item, array \$data, Request \$request): void
    {
        // TODO: Add custom logic after updating

        // Example: Sync relationships
        // if (isset(\$data['tags'])) {
        //     \$item->tags()->sync(\$data['tags']);
        // }

        // Example: Handle status changes
        // if (\$item->wasChanged('status')) {
        //     \$this->handleStatusChange(\$item, \$item->getOriginal('status'), \$item->status);
        // }
    }

    /**
     * Handle actions before deleting
     *
     * @param Model \$item
     * @return void
     */
    protected function beforeDelete(Model \$item): void
    {
        // TODO: Add custom logic before deleting

        // Example: Check if item can be deleted
        // if (\$item->orders()->exists()) {
        //     throw new BusinessRuleException('Cannot delete {$modelNameLower} with existing orders');
        // }

        // Example: Archive related data
        // \$item->archiveRelatedData();
    }

    // ==================== Custom Methods ====================
{$relationMethods}
    /**
     * Get trashed items
     *
     * @param Request \$request
     * @return mixed
     */
    public function getTrashed(Request \$request)
    {
        \$query = \$this->model::onlyTrashed();

        // Apply filters, search, etc.
        return \$this->applyListQuery(\$query, \$request)->paginate(
            \$request->get('per_page', 15)
        );
    }

    /**
     * Bulk delete items
     *
     * @param array \$ids
     * @return int
     */
    public function bulkDelete(array \$ids): int
    {
        return DB::transaction(function () use (\$ids) {
            return \$this->model::whereIn('id', \$ids)->delete();
        });
    }

    /**
     * Bulk update items
     *
     * @param array \$ids
     * @param array \$data
     * @return int
     */
    public function bulkUpdate(array \$ids, array \$data): int
    {
        return DB::transaction(function () use (\$ids, \$data) {
            return \$this->model::whereIn('id', \$ids)->update(\$data);
        });
    }

    // TODO: Add more custom service methods here
    // Example:
    // public function customAction(\$id): Model
    // {
    //     \$item = \$this->findById(\$id);
    //
    //     // Custom logic
    //     \$item->custom_field = 'new value';
    //     \$item->save();
    //
    //     return \$item;
    // }
}

PHP;
    }

    protected function buildServiceRelationMethods(): string
    {
        if (empty($this->foreignKeys)) {
            return '';
        }

        $methods = [];
        foreach ($this->foreignKeys as $fk) {
            $relationName = Str::camel(str_replace('_id', '', $fk['column']));
            $relationClass = $fk['model'];

            $methods[] = <<<METHOD

    /**
     * Validate {$relationName} relationship
     *
     * @param int \$id
     * @return bool
     */
    protected function validate{$relationClass}(\$id): bool
    {
        return {$relationClass}::where('id', \$id)
            ->where('active', true)
            ->exists();
    }
METHOD;
        }

        return implode("\n", $methods);
    }

    protected function getResourceStub(): string
    {
        $fields = $this->buildResourceFields();

        return <<<PHP
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * {$this->modelName} API Resource
 *
 * Transforms {$this->modelName} model into JSON response.
 *
 * @package App\Http\Resources
 */
class {$this->modelName}Resource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request \$request
     * @return array
     */
    public function toArray(Request \$request): array
    {
        return [
{$fields}

            // TODO: Add custom fields or computed properties
            // 'custom_field' => \$this->custom_field,

            // Relationships (loaded when requested via ?include=)
            // 'relation' => \$this->whenLoaded('relation', fn() => new RelationResource(\$this->relation)),
        ];
    }
}

PHP;
    }

    // ===============================================
    // Helper Methods
    // ===============================================

    protected function buildRelationsArray(): string
    {
        if (empty($this->foreignKeys)) {
            return '[]';
        }

        $relations = array_map(
            fn($fk) => "'" . Str::camel(str_replace('_id', '', $fk['column'])) . "'",
            $this->foreignKeys
        );

        return '[' . implode(', ', $relations) . ']';
    }

    protected function buildResourceFields(): string
    {
        $fields = [];

        // Always include id
        $fields[] = "            'id' => \$this->id";

        // Add columns (exclude system fields)
        $excluded = ['id', 'created_by', 'updated_by', 'deleted_by', 'deleted_at'];

        foreach ($this->columns as $column => $type) {
            if (in_array($column, $excluded)) {
                continue;
            }

            if ($column === 'created_at' || $column === 'updated_at') {
                $fields[] = "            '{$column}' => \$this->{$column}?->toISOString()";
            } else {
                $fields[] = "            '{$column}' => \$this->{$column}";
            }
        }

        return implode(",\n", $fields) . ',';
    }

    protected function getPolicyStub(): string
    {
        return <<<PHP
<?php

namespace App\Policies;

use App\Models\\{$this->modelName};
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * {$this->modelName} Policy
 *
 * Manages authorization for {$this->modelName} operations.
 */
class {$this->modelName}Policy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any {$this->modelName}s.
     */
    public function viewAny(User \$user): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('view-any-{$this->tableName}');
    }

    /**
     * Determine whether the user can view the {$this->modelName}.
     */
    public function view(User \$user, {$this->modelName} \$model): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('view-{$this->tableName}');
    }

    /**
     * Determine whether the user can create {$this->modelName}s.
     */
    public function create(User \$user): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('create-{$this->tableName}');
    }

    /**
     * Determine whether the user can update the {$this->modelName}.
     */
    public function update(User \$user, {$this->modelName} \$model): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('update-{$this->tableName}');
    }

    /**
     * Determine whether the user can delete the {$this->modelName}.
     */
    public function delete(User \$user, {$this->modelName} \$model): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('delete-{$this->tableName}');
    }

    /**
     * Determine whether the user can restore the {$this->modelName}.
     */
    public function restore(User \$user, {$this->modelName} \$model): bool
    {
        // TODO: Implement permission check
        return true;
        // return \$user->can('restore-{$this->tableName}');
    }

    /**
     * Determine whether the user can permanently delete the {$this->modelName}.
     */
    public function forceDelete(User \$user, {$this->modelName} \$model): bool
    {
        // TODO: Implement permission check
        return false;
        // return \$user->can('force-delete-{$this->tableName}');
    }
}

PHP;
    }

    protected function getFeatureTestStub(): string
    {
        $modelNameSnake = Str::snake($this->modelName);
        $modelNamePlural = Str::plural($modelNameSnake);

        return <<<PHP
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\\{$this->modelName};
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

/**
 * {$this->modelName} API Feature Tests
 *
 * Tests all API endpoints for {$this->modelName} resource.
 */
class {$this->modelName}ApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User \$user;
    protected string \$baseUrl = '/api/{$this->version}/{$modelNamePlural}';

    protected function setUp(): void
    {
        parent::setUp();

        \$this->user = User::factory()->create();
        \$this->actingAs(\$this->user, 'sanctum');
    }

    /** @test */
    public function it_can_list_{$modelNamePlural}()
    {
        {$this->modelName}::factory()->count(3)->create();

        \$response = \$this->getJson(\$this->baseUrl);

        \$response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'data' => [
                        '*' => ['id', 'created_at', 'updated_at']
                    ],
                    'meta',
                    'links'
                ]
            ]);
    }

    /** @test */
    public function it_can_create_{$modelNameSnake}()
    {
        \$data = {$this->modelName}::factory()->make()->toArray();

        \$response = \$this->postJson(\$this->baseUrl, \$data);

        \$response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['id']
            ]);

        \$this->assertDatabaseHas('{$this->tableName}', [
            'id' => \$response->json('data.id')
        ]);
    }

    /** @test */
    public function it_can_show_{$modelNameSnake}()
    {
        \$model = {$this->modelName}::factory()->create();

        \$response = \$this->getJson("\$this->baseUrl/{\$model->id}");

        \$response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['id']
            ])
            ->assertJson([
                'data' => ['id' => \$model->id]
            ]);
    }

    /** @test */
    public function it_can_update_{$modelNameSnake}()
    {
        \$model = {$this->modelName}::factory()->create();
        \$data = {$this->modelName}::factory()->make()->toArray();

        \$response = \$this->putJson("\$this->baseUrl/{\$model->id}", \$data);

        \$response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['id']
            ]);

        \$this->assertDatabaseHas('{$this->tableName}', [
            'id' => \$model->id
        ]);
    }

    /** @test */
    public function it_can_delete_{$modelNameSnake}()
    {
        \$model = {$this->modelName}::factory()->create();

        \$response = \$this->deleteJson("\$this->baseUrl/{\$model->id}");

        \$response->assertStatus(200)
            ->assertJson([
                'success' => true
            ]);

        \$this->assertSoftDeleted('{$this->tableName}', [
            'id' => \$model->id
        ]);
    }

    /** @test */
    public function it_validates_required_fields_on_create()
    {
        \$response = \$this->postJson(\$this->baseUrl, []);

        \$response->assertStatus(422)
            ->assertJsonStructure([
                'success',
                'message',
                'errors'
            ]);
    }

    /** @test */
    public function it_can_search_{$modelNamePlural}()
    {
        {$this->modelName}::factory()->count(5)->create();

        \$response = \$this->getJson("\$this->baseUrl?search=test");

        \$response->assertStatus(200);
    }

    /** @test */
    public function it_can_filter_{$modelNamePlural}()
    {
        {$this->modelName}::factory()->count(5)->create();

        \$response = \$this->getJson("\$this->baseUrl?filter[active]=1");

        \$response->assertStatus(200);
    }

    /** @test */
    public function it_can_sort_{$modelNamePlural}()
    {
        {$this->modelName}::factory()->count(3)->create();

        \$response = \$this->getJson("\$this->baseUrl?sort=-created_at");

        \$response->assertStatus(200);
    }

    /** @test */
    public function it_returns_404_for_nonexistent_{$modelNameSnake}()
    {
        \$response = \$this->getJson("\$this->baseUrl/99999");

        \$response->assertStatus(404);
    }
}

PHP;
    }

    protected function getUnitTestStub(): string
    {
        return <<<PHP
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\\{$this->modelName}Service;
use App\Models\\{$this->modelName};
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * {$this->modelName} Service Unit Tests
 *
 * Tests business logic in {$this->modelName}Service.
 */
class {$this->modelName}ServiceTest extends TestCase
{
    use RefreshDatabase;

    protected {$this->modelName}Service \$service;

    protected function setUp(): void
    {
        parent::setUp();

        \$this->service = app({$this->modelName}Service::class);

        // Create authenticated user
        \$user = User::factory()->create();
        \$this->actingAs(\$user);
    }

    /** @test */
    public function it_can_create_{$this->modelName}()
    {
        \$data = {$this->modelName}::factory()->make()->toArray();

        \$result = \$this->service->create(\$data, request());

        \$this->assertInstanceOf({$this->modelName}::class, \$result);
        \$this->assertDatabaseHas('{$this->tableName}', [
            'id' => \$result->id
        ]);
    }

    /** @test */
    public function it_can_update_{$this->modelName}()
    {
        \$model = {$this->modelName}::factory()->create();
        \$newData = {$this->modelName}::factory()->make()->toArray();

        \$result = \$this->service->update(\$model, \$newData, request());

        \$this->assertInstanceOf({$this->modelName}::class, \$result);
        \$this->assertDatabaseHas('{$this->tableName}', [
            'id' => \$model->id
        ]);
    }

    /** @test */
    public function it_can_delete_{$this->modelName}()
    {
        \$model = {$this->modelName}::factory()->create();

        \$result = \$this->service->delete(\$model);

        \$this->assertTrue(\$result);
        \$this->assertSoftDeleted('{$this->tableName}', [
            'id' => \$model->id
        ]);
    }

    /** @test */
    public function it_can_restore_{$this->modelName}()
    {
        \$model = {$this->modelName}::factory()->create();
        \$model->delete();

        \$result = \$this->service->restore(\$model);

        \$this->assertInstanceOf({$this->modelName}::class, \$result);
        \$this->assertDatabaseHas('{$this->tableName}', [
            'id' => \$model->id,
            'deleted_at' => null
        ]);
    }

    /** @test */
    public function it_can_find_by_id()
    {
        \$model = {$this->modelName}::factory()->create();

        \$result = \$this->service->findById(\$model->id);

        \$this->assertInstanceOf({$this->modelName}::class, \$result);
        \$this->assertEquals(\$model->id, \$result->id);
    }

    /** @test */
    public function it_throws_exception_when_not_found()
    {
        \$this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        \$this->service->findById(99999);
    }
}

PHP;
    }
    
    protected function saveFile(string $path, string $content, string $type): void
    {
        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("  {$type} already exists. Overwrite?", false)) {
                $this->line("  ⊗ Skipped {$type}");
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);

        $this->line("  ✓ {$type} created: " . str_replace(base_path() . '/', '', $path));
    }
}
