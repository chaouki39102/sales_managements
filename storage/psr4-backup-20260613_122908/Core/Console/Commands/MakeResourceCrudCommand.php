<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class MakeResourceCrudCommand extends Command
{
    // تم تغيير --version إلى --api-version لتجنب التعارض
    protected $signature = 'make:crud {name} {--api-version=v1} {--simple} {--force} {--discover}';
    protected $description = 'Generate versioned CRUD files with AutoDiscovery support';

    protected string $modelName;
    protected string $modelNamePlural;
    protected string $modelNameLower;
    protected string $modelNameSnake;
    protected string $version;
    protected string $versionUpper;

    public function handle(): int
    {
        $this->info("=== CRUD Generator Started ===");

        $this->modelName = Str::studly($this->argument('name'));
        $this->modelNamePlural = Str::plural($this->modelName);
        $this->modelNameLower = Str::lower($this->modelName);
        $this->modelNameSnake = Str::snake($this->modelName);
        $this->version = strtolower($this->option('api-version'));
        $this->versionUpper = strtoupper($this->version);

        $this->info("Model: {$this->modelName}");
        $this->info("Version: {$this->versionUpper}");
        $this->newLine();

        if (!$this->validateVersion()) {
            return Command::FAILURE;
        }

        try {
            $this->generateController();

            if (!$this->option('simple')) {
                $this->generateService();
            }

            $this->generateRequests();
            $this->generateResource();

            $this->newLine();
            $this->info("✓ SUCCESS: {$this->versionUpper} CRUD files generated!");

            if ($this->option('discover')) {
                $this->newLine();
                $this->info("Running AutoDiscovery...");
                $this->call('route:auto-discover', ['--fresh' => true]);
            }

            $this->showNextSteps();

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("✗ ERROR: " . $e->getMessage());
            $this->newLine();
            $this->error("File: " . $e->getFile());
            $this->error("Line: " . $e->getLine());
            if ($this->option('verbose')) {
                $this->newLine();
                $this->error($e->getTraceAsString());
            }
            return Command::FAILURE;
        }
    }

    protected function validateVersion(): bool
    {
        if (!preg_match('/^v\d+$/', $this->version)) {
            $this->error("Invalid version format: {$this->version}");
            $this->info("Expected format: v1, v2, v3, etc.");
            return false;
        }

        $this->info("✓ Version format OK: {$this->version}");
        return true;
    }

    protected function generateController(): void
    {
        $this->info("→ Generating Controller...");

        $stub = $this->option('simple')
            ? $this->getStub('controller-simple')
            : $this->getStub('controller');

        $content = $this->replaceVariables($stub);
        $path = app_path("Http/Controllers/Api/{$this->versionUpper}/{$this->modelName}Controller.php");

        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("  Controller already exists. Overwrite?", false)) {
                $this->warn("  ⊗ Skipped Controller");
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);
        $this->info("  ✓ Created: {$path}");
    }

    protected function generateService(): void
    {
        $this->info("→ Generating Service...");

        $stub = $this->getStub('service');
        $content = $this->replaceVariables($stub);
        $path = app_path("Services/{$this->modelName}Service.php");

        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("  Service already exists. Overwrite?", false)) {
                $this->warn("  ⊗ Skipped Service");
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);
        $this->info("  ✓ Created: {$path}");
    }

    protected function generateRequests(): void
    {
        $this->info("→ Generating Requests...");

        // Store Request
        $storeStub = $this->getStub('store-request');
        $storeContent = $this->replaceVariables($storeStub);
        $storePath = app_path("Http/Requests/Store{$this->modelName}Request.php");

        if (!File::exists($storePath) || $this->option('force')) {
            File::ensureDirectoryExists(dirname($storePath));
            File::put($storePath, $storeContent);
            $this->info("  ✓ Created: Store{$this->modelName}Request.php");
        } else {
            $this->warn("  ⊗ Skipped: Store{$this->modelName}Request.php (exists)");
        }

        // Update Request
        $updateStub = $this->getStub('update-request');
        $updateContent = $this->replaceVariables($updateStub);
        $updatePath = app_path("Http/Requests/Update{$this->modelName}Request.php");

        if (!File::exists($updatePath) || $this->option('force')) {
            File::put($updatePath, $updateContent);
            $this->info("  ✓ Created: Update{$this->modelName}Request.php");
        } else {
            $this->warn("  ⊗ Skipped: Update{$this->modelName}Request.php (exists)");
        }
    }

    protected function generateResource(): void
    {
        $this->info("→ Generating Resource...");

        $stub = $this->getStub('resource');
        $content = $this->replaceVariables($stub);
        $path = app_path("Http/Resources/{$this->modelName}Resource.php");

        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("  Resource already exists. Overwrite?", false)) {
                $this->warn("  ⊗ Skipped Resource");
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);
        $this->info("  ✓ Created: {$path}");
    }

    protected function getStub(string $type): string
    {
        $stubPath = resource_path("stubs/{$type}.stub");

        if (File::exists($stubPath)) {
            return File::get($stubPath);
        }

        return $this->getDefaultStub($type);
    }

    protected function getDefaultStub(string $type): string
    {
        return match ($type) {
            'controller' => $this->getDefaultControllerStub(),
            'controller-simple' => $this->getDefaultSimpleControllerStub(),
            'service' => $this->getDefaultServiceStub(),
            'store-request' => $this->getDefaultStoreRequestStub(),
            'update-request' => $this->getDefaultUpdateRequestStub(),
            'resource' => $this->getDefaultResourceStub(),
            default => throw new \Exception("Unknown stub type: {$type}"),
        };
    }

    protected function replaceVariables(string $stub): string
    {
        return str_replace(
            [
                '{{ModelName}}',
                '{{ModelNamePlural}}',
                '{{modelName}}',
                '{{modelNameLower}}',
                '{{modelNameSnake}}',
                '{{version}}',
                '{{VersionUpper}}',
                '{{namespace}}',
            ],
            [
                $this->modelName,
                $this->modelNamePlural,
                Str::camel($this->modelName),
                $this->modelNameLower,
                $this->modelNameSnake,
                $this->version,
                $this->versionUpper,
                "App\\Http\\Controllers\\Api\\{$this->versionUpper}",
            ],
            $stub
        );
    }

    protected function showNextSteps(): void
    {
        $this->newLine();
        $this->comment("═══════════════════════════════════════════════════");
        $this->info("Next Steps:");
        $this->comment("═══════════════════════════════════════════════════");
        $this->line("1. Update Model: app/Models/{$this->modelName}.php");
        $this->line("2. Update validation: app/Http/Requests/Store{$this->modelName}Request.php");

        if (!$this->option('simple')) {
            $this->line("3. Customize logic: app/Services/{$this->modelName}Service.php");
        }

        $this->line("4. Run: php artisan route:auto-discover --fresh");

        $this->newLine();
        $this->comment("API Endpoints:");
        $this->line("  GET    /api/{$this->version}/{$this->modelNameSnake}s");
        $this->line("  POST   /api/{$this->version}/{$this->modelNameSnake}s");
        $this->line("  GET    /api/{$this->version}/{$this->modelNameSnake}s/{id}");
        $this->line("  PUT    /api/{$this->version}/{$this->modelNameSnake}s/{id}");
        $this->line("  DELETE /api/{$this->version}/{$this->modelNameSnake}s/{id}");
        $this->newLine();
    }

    protected function getDefaultControllerStub(): string
    {
        return <<<'STUB'
<?php

namespace {{namespace}};

use App\Core\Http\Controllers\BaseApiController;
use App\Models\{{ModelName}};
use App\Services\{{ModelName}}Service;
use App\Http\Resources\{{ModelName}}Resource;
use App\Http\Requests\Store{{ModelName}}Request;
use App\Http\Requests\Update{{ModelName}}Request;

class {{ModelName}}Controller extends BaseApiController
{
    protected string $resourceName = '{{modelNameLower}}';
    protected ?string $resourceClass = {{ModelName}}Resource::class;

    public function __construct(protected {{ModelName}}Service $service)
    {
        parent::__construct();
    }

    protected function getService(): {{ModelName}}Service
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return {{ModelName}}::class;
    }
}

STUB;
    }

    protected function getDefaultSimpleControllerStub(): string
    {
        return <<<'STUB'
<?php

namespace {{namespace}};

use App\Core\Http\Controllers\BaseApiController;
use App\Models\{{ModelName}};
use App\Http\Resources\{{ModelName}}Resource;
use App\Http\Requests\Store{{ModelName}}Request;
use App\Http\Requests\Update{{ModelName}}Request;

class {{ModelName}}Controller extends BaseApiController
{
    protected string $resourceName = '{{modelNameLower}}';
    protected ?string $resourceClass = {{ModelName}}Resource::class;
    protected string $model = {{ModelName}}::class;

    protected function getService()
    {
        throw new \RuntimeException('Service layer not used');
    }

    protected function getModelClass(): string
    {
        return {{ModelName}}::class;
    }
}

STUB;
    }

    protected function getDefaultServiceStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Services;

use App\Core\Services\BaseService;
use App\Models\{{ModelName}};
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;

class {{ModelName}}Service extends BaseService
{
    protected string $model = {{ModelName}}::class;
    protected string $resourceName = '{{modelNameLower}}';
    protected array $defaultWith = [];
    protected array $showWith = [];

    protected function beforeCreate(array $data, Request $request): array
    {
        return $data;
    }

    protected function afterCreate(Model $item, array $data, Request $request): void
    {
        //
    }

    protected function afterCreateCommitted(Model $item, array $data, Request $request): void
    {
        //
    }

    protected function beforeUpdate(Model $item, array $data, Request $request): void
    {
        //
    }

    protected function afterUpdate(Model $item, array $data, Request $request): void
    {
        //
    }

    protected function beforeDelete(Model $item): void
    {
        //
    }
}

STUB;
    }

    protected function getDefaultStoreRequestStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class Store{{ModelName}}Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Name is required',
        ];
    }
}

STUB;
    }

    protected function getDefaultUpdateRequestStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class Update{{ModelName}}Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Name is required',
        ];
    }
}

STUB;
    }

    protected function getDefaultResourceStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class {{ModelName}}Resource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

STUB;
    }
}
