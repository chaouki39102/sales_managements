<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;
use Illuminate\Validation\Rule;

/**
 * Generate Store and Update Requests from existing Model
 *
 * Features:
 * - Automatic validation rules from casts and fillable
 * - Smart unique rules with ignore for update
 * - Foreign key validation with exists rules
 * - Custom messages generation
 * - Supports nested validation
 */
class GenerateRequestsFromModel extends Command
{
    protected $signature = 'make:requests
                            {model : Model name}
                            {--force : Overwrite existing files}
                            {--with-messages : Generate custom messages}
                            {--with-attributes : Generate custom attribute names}';

    protected $description = 'Generate Store and Update requests from Model';

    protected array $fillable = [];
    protected array $casts = [];
    protected array $searchable = [];
    protected array $filterable = [];
    protected array $foreignKeys = [];
    protected string $tableName = '';
    protected string $modelName = ''; // ✅ إضافة

    public function handle()
    {
        $this->modelName = $this->argument('model'); // ✅ تعريف
        $modelClass = "App\\Models\\{$this->modelName}";

        if (!class_exists($modelClass)) {
            $this->error("❌ Model not found: {$modelClass}");
            return 1;
        }

        $this->info("🔍 Analyzing model: {$this->modelName}");

        // Analyze model
        $this->analyzeModel($modelClass);

        // Generate Store Request
        $storeContent = $this->generateStoreRequest($this->modelName);
        $this->saveRequest($this->modelName, 'Store', $storeContent);

        // Generate Update Request
        $updateContent = $this->generateUpdateRequest($this->modelName);
        $this->saveRequest($this->modelName, 'Update', $updateContent);

        $this->info("✅ Requests generated successfully!");
        $this->displaySummary();

        return 0;
    }

    protected function analyzeModel(string $modelClass): void
    {
        $model = new $modelClass();
        $reflection = new ReflectionClass($modelClass);

        // Get fillable
        $this->fillable = $model->getFillable();

        // Get casts
        $this->casts = $model->getCasts();

        // Get table name
        $this->tableName = $model->getTable();

        // Get searchable (if exists)
        if (property_exists($modelClass, 'searchableFields')) {
            $this->searchable = $modelClass::$searchableFields ?? [];
        }

        // Get filterable (if exists)
        if (property_exists($modelClass, 'filterable')) {
            $this->filterable = $modelClass::$filterable ?? [];
        }

        // Detect foreign keys
        foreach ($this->fillable as $field) {
            if (Str::endsWith($field, '_id')) {
                $relatedTable = Str::plural(str_replace('_id', '', $field));
                $this->foreignKeys[$field] = $relatedTable;
            }
        }

        $this->info("   📋 Fillable: " . count($this->fillable));
        $this->info("   🔄 Casts: " . count($this->casts));
        $this->info("   🔗 Foreign Keys: " . count($this->foreignKeys));
    }

    protected function generateStoreRequest(string $modelName): string
    {
        $rules = $this->generateValidationRules(false);

        $messagesMethod = $this->option('with-messages')
            ? $this->generateMessagesMethod()
            : '';

        $attributesMethod = $this->option('with-attributes')
            ? $this->generateAttributesMethod()
            : '';

        return <<<PHP
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class {$modelName}StoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // TODO: Implement authorization logic
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
{$rules}
        ];
    }
{$messagesMethod}{$attributesMethod}

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // TODO: Add any data preparation logic here
        // Example: \$this->merge(['slug' => Str::slug(\$this->title)]);
    }

    /**
     * Handle a passed validation attempt.
     */
    protected function passedValidation(): void
    {
        // TODO: Add any post-validation logic here
    }
}
PHP;
    }

    protected function generateUpdateRequest(string $modelName): string
    {
        $rules = $this->generateValidationRules(true);
        $routeParam = Str::snake($modelName);

        $messagesMethod = $this->option('with-messages')
            ? $this->generateMessagesMethod()
            : '';

        $attributesMethod = $this->option('with-attributes')
            ? $this->generateAttributesMethod()
            : '';

        return <<<PHP
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class {$modelName}UpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // TODO: Implement authorization logic
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        \$id = \$this->route('{$routeParam}');

        return [
{$rules}
        ];
    }
{$messagesMethod}{$attributesMethod}

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // TODO: Add any data preparation logic here
    }

    /**
     * Handle a passed validation attempt.
     */
    protected function passedValidation(): void
    {
        // TODO: Add any post-validation logic here
    }
}
PHP;
    }

    protected function generateValidationRules(bool $isUpdate): string
    {
        $rules = [];

        foreach ($this->fillable as $field) {
            $fieldRules = [];

            // Required rule
            $fieldRules[] = $isUpdate ? 'sometimes' : 'required';

            // Type-based rules
            if (isset($this->casts[$field])) {
                switch ($this->casts[$field]) {
                    case 'integer':
                    case 'int':
                        $fieldRules[] = 'integer';
                        break;
                    case 'decimal':
                    case 'float':
                    case 'double':
                        $fieldRules[] = 'numeric';
                        break;
                    case 'boolean':
                    case 'bool':
                        $fieldRules[] = 'boolean';
                        break;
                    case 'array':
                        $fieldRules[] = 'array';
                        break;
                    case 'date':
                    case 'datetime':
                    case 'timestamp':
                        $fieldRules[] = 'date';
                        break;
                    default:
                        $fieldRules[] = 'string';
                        if (!Str::contains($field, ['password', 'token', 'secret'])) {
                            $fieldRules[] = 'max:255';
                        }
                        break;
                }
            } else {
                $fieldRules[] = 'string';
                $fieldRules[] = 'max:255';
            }

            // Foreign key rules
            if (isset($this->foreignKeys[$field])) {
                $relatedTable = $this->foreignKeys[$field];
                $fieldRules[] = "exists:{$relatedTable},id";
            }

            // Unique rule for specific fields
            if (in_array($field, ['email', 'username', 'code', 'slug'])) {
                if ($isUpdate) {
                    $fieldRules[] = "unique:{$this->tableName},{$field},{\$id}";
                } else {
                    $fieldRules[] = "unique:{$this->tableName},{$field}";
                }
            }

            $rules[] = "            '{$field}' => '" . implode('|', $fieldRules) . "'";
        }

        return implode(",\n", $rules);
    }

    protected function generateMessagesMethod(): string
    {
        $messages = [];
        foreach ($this->fillable as $field) {
            $messages[] = "            '{$field}.required' => 'حقل {$field} مطلوب.'";
            $messages[] = "            '{$field}.string' => 'حقل {$field} يجب أن يكون نصاً.'";
        }

        $messagesStr = implode(",\n", $messages);

        return <<<MESSAGES


    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
{$messagesStr}
        ];
    }
MESSAGES;
    }

    protected function generateAttributesMethod(): string
    {
        $attributes = [];
        foreach ($this->fillable as $field) {
            $attributes[] = "            '{$field}' => '{$field}'";
        }

        $attributesStr = implode(",\n", $attributes);

        return <<<ATTRIBUTES


    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
{$attributesStr}
        ];
    }
ATTRIBUTES;
    }

    protected function saveRequest(string $modelName, string $type, string $content): void
    {
        $path = app_path("Http/Requests/{$modelName}{$type}Request.php");

        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("Request file already exists. Overwrite?")) {
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);

        $this->info("✅ {$type} request generated: {$path}");
    }

    protected function displaySummary(): void
    {
        $this->newLine();
        $this->table(
            ['Feature', 'Count'],
            [
                ['Fillable Fields', count($this->fillable)],
                ['Casts', count($this->casts)],
                ['Foreign Keys', count($this->foreignKeys)],
                ['Searchable Fields', count($this->searchable)],
                ['Filterable Fields', count($this->filterable)],
            ]
        );
    }
}

