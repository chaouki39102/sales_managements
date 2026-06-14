<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Advanced Migration to Model Converter - FIXED & CLEAN VERSION
 *
 * الميزات:
 * ✅ تحليل شامل للـ migration
 * ✅ كشف العلاقات والـ foreign keys
 * ✅ كشف جداول الـ pivot
 * ✅ كشف الـ morph relations
 * ✅ توليد Requests, Factory, Seeder
 * ✅ معالجة أخطاء محسّنة
 * ✅ بدون تكرار أو تعارض
 */
class MigrationToModelAdvanced extends Command
{
    protected $signature = 'make:model-advanced
                            {migration : اسم ملف الـ Migration}
                            {--name= : اسم الـ Model (اختياري)}
                            {--with-requests : توليد Store و Update Requests}
                            {--with-factory : توليد Factory}
                            {--with-seeder : توليد Seeder}
                            {--force : استبدال الملفات الموجودة}';

    protected $description = 'توليد Model متكامل مع Requests و Factory من Migration';

    // ===============================================
    // Properties
    // ===============================================

    protected array $columns = [];
    protected array $foreignKeys = [];
    protected array $indexes = [];
    protected array $morphRelations = [];
    protected bool $isPivot = false;
    protected ?string $pivotRelation1 = null;
    protected ?string $pivotRelation2 = null;

    /**
     * خريطة تحويل أنواع الأعمدة إلى Casts
     */
    protected array $castMap = [
        'boolean' => 'boolean',
        'integer' => 'integer',
        'bigInteger' => 'integer',
        'tinyInteger' => 'integer',
        'smallInteger' => 'integer',
        'mediumInteger' => 'integer',
        'unsignedBigInteger' => 'integer',
        'unsignedInteger' => 'integer',
        'decimal' => 'decimal:2',
        'float' => 'float',
        'double' => 'double',
        'date' => 'date',
        'datetime' => 'datetime',
        'timestamp' => 'datetime',
        'time' => 'datetime',
        'json' => 'array',
        'jsonb' => 'array',
        'enum' => 'string',
    ];

    // ===============================================
    // Main Handler
    // ===============================================

    public function handle()
    {
        try {
            $migrationName = $this->argument('migration');
            $modelName = $this->option('name');

            // 1. البحث عن الـ Migration
            $migrationPath = $this->findMigration($migrationName);
            if (!$migrationPath) {
                $this->error("❌ لم يتم العثور على Migration: {$migrationName}");
                return 1;
            }

            $this->info("📄 تم العثور على: {$migrationPath}");

            // 2. قراءة وتحليل المحتوى
            $content = File::get($migrationPath);
            $tableName = $this->extractTableName($content);

            if (!$modelName) {
                $modelName = Str::studly(Str::singular($tableName));
            }

            $this->info("🏗️  توليد: {$modelName} للجدول: {$tableName}");

            // 3. تحليل شامل
            $this->detectPivotTable($tableName, $content);
            $this->parseColumns($content);
            $this->parseForeignKeys($content);
            $this->parseIndexes($content);

            // 4. توليد الملفات
            $this->generateModel($modelName, $tableName);

            if ($this->option('with-requests')) {
                $this->generateRequests($modelName);
            }

            if ($this->option('with-factory')) {
                $this->generateFactory($modelName);
            }

            if ($this->option('with-seeder')) {
                $this->generateSeeder($modelName);
            }

            // 5. عرض الملخص
            $this->displaySummary($modelName, $tableName);

            return 0;

        } catch (\Throwable $e) {
            $this->error("❌ حدث خطأ: " . $e->getMessage());
            if ($this->option('verbose')) {
                $this->error($e->getTraceAsString());
            }
            return 1;
        }
    }

    // ===============================================
    // Migration Discovery
    // ===============================================

    protected function findMigration(string $name): ?string
    {
        $paths = [
            database_path('migrations'),
            database_path('migrations/tenant'),
        ];

        foreach ($paths as $path) {
            if (!File::isDirectory($path)) continue;

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

    // ===============================================
    // Pivot Table Detection
    // ===============================================

    protected function detectPivotTable(string $tableName, string $content): void
    {
        // Pattern 1: table_name1_table_name2
        if (preg_match('/^(\w+)_(\w+)$/', $tableName, $matches)) {
            $this->isPivot = true;
            $this->pivotRelation1 = Str::studly(Str::singular($matches[1]));
            $this->pivotRelation2 = Str::studly(Str::singular($matches[2]));
        }

        // Pattern 2: Two foreignId columns
        preg_match_all('/\$table->foreignId\([\'"](\w+)[\'"]/', $content, $fkMatches);
        if (count($fkMatches[1]) === 2) {
            $this->isPivot = true;
            $this->pivotRelation1 = Str::studly(str_replace('_id', '', $fkMatches[1][0]));
            $this->pivotRelation2 = Str::studly(str_replace('_id', '', $fkMatches[1][1]));
        }
    }

    // ===============================================
    // Column Parsing
    // ===============================================

    protected function parseColumns(string $content): void
    {
        // 1. Helper Methods
        if (preg_match('/\$table->timestamps\(\)/', $content)) {
            $this->addColumn('created_at', 'timestamp', ['cast' => 'datetime', 'nullable' => false]);
            $this->addColumn('updated_at', 'timestamp', ['cast' => 'datetime', 'nullable' => false]);
        }

        if (preg_match('/\$table->softDeletes\(\)/', $content)) {
            $this->addColumn('deleted_at', 'timestamp', ['cast' => 'datetime', 'nullable' => true]);
        }

        if (preg_match('/\$table->rememberToken\(\)/', $content)) {
            $this->addColumn('remember_token', 'string', ['cast' => null, 'nullable' => true, 'length' => 100]);
        }

        // 2. Morph Columns
        $morphPattern = '/\$table->(morphs|nullableMorphs|uuidMorphs|ulid)\([\'"](\w+)[\'"]/' ;
        preg_match_all($morphPattern, $content, $morphMatches, PREG_SET_ORDER);
        foreach ($morphMatches as $match) {
            $this->handleMorphColumn($match[1], $match[2]);
        }

        // 3. Foreign Keys
        $foreignPattern = '/\$table->foreignId\([\'"](\w+)[\'"]\)((?:->(?:\w+)\([^\)]*\))*);/';
        preg_match_all($foreignPattern, $content, $foreignMatches, PREG_SET_ORDER);
        foreach ($foreignMatches as $match) {
            $columnName = $match[1];
            $modifiers = $match[2] ?? '';
            $this->processRegularColumn('unsignedBigInteger', $columnName, null, $modifiers);
        }

        // 4. Regular Columns
        $regularPattern = '/\$table->(\w+)\([\'"](\w+)[\'"](?:,\s*(\d+|\'[^\']*\'|\[[^\]]*\]))?\)((?:->(?:\w+)\([^\)]*\))*);/';
        preg_match_all($regularPattern, $content, $regularMatches, PREG_SET_ORDER);
        foreach ($regularMatches as $match) {
            $type = $match[1];
            $name = $match[2];
            $param = $match[3] ?? null;
            $modifiers = $match[4] ?? '';

            // Skip helper methods
            if (in_array($type, ['timestamps', 'softDeletes', 'rememberToken', 'foreignId', 'morphs', 'nullableMorphs'])) {
                continue;
            }

            $this->processRegularColumn($type, $name, $param, $modifiers);
        }
    }

    /**
     * إضافة عمود مع إعدادات افتراضية
     */
    protected function addColumn(string $name, string $type, array $customConfig = []): void
    {
        if (isset($this->columns[$name])) {
            return; // تجنب التكرار
        }

        $defaultConfig = [
            'type' => $type,
            'cast' => $this->castMap[$type] ?? null,
            'nullable' => false,
            'unique' => false,
            'default' => null,
            'length' => null,
            'unsigned' => false,
            'index' => false,
            'validation' => 'required',
            'validation_update' => 'sometimes',
            'enum_values' => null,
        ];

        $this->columns[$name] = array_merge($defaultConfig, $customConfig);
    }

    /**
     * معالجة Morph Columns
     */
    protected function handleMorphColumn(string $type, string $name): void
    {
        $this->morphRelations[$name] = [
            'type' => $type,
            'id_column' => "{$name}_id",
            'type_column' => "{$name}_type",
        ];

        $nullable = Str::contains($type, 'nullable');

        $this->addColumn("{$name}_id", 'unsignedBigInteger', [
            'nullable' => $nullable,
            'unsigned' => true,
            'validation' => $nullable ? 'nullable|integer' : 'required|integer',
        ]);

        $this->addColumn("{$name}_type", 'string', [
            'nullable' => $nullable,
            'validation' => $nullable ? 'nullable|string' : 'required|string',
        ]);
    }

    /**
     * معالجة الأعمدة العادية
     */
    protected function processRegularColumn(string $type, string $name, ?string $param, string $modifiers): void
    {
        if (isset($this->columns[$name])) {
            return; // تجنب التكرار
        }

        $cast = $this->castMap[$type] ?? null;
        $nullable = Str::contains($modifiers, '->nullable()');
        $unique = Str::contains($modifiers, '->unique()');
        $default = $this->extractDefault($modifiers);
        $unsigned = Str::contains($modifiers, '->unsigned()') || Str::startsWith($type, 'unsigned');
        $index = Str::contains($modifiers, '->index()');

        // معالجة Enum
        $enumValues = null;
        $length = null;

        if ($type === 'enum' && $param) {
            $param = trim($param, '[]');
            $enumValues = array_map(fn($v) => trim($v, '\'" '), explode(',', $param));
            $cast = 'string';
        } elseif (is_numeric($param)) {
            $length = $param;
        }

        $validation = $this->buildValidation($type, $name, $nullable, $unique, $enumValues, $length);

        $this->addColumn($name, $type, [
            'cast' => $cast,
            'nullable' => $nullable,
            'unique' => $unique,
            'default' => $default,
            'length' => $length,
            'unsigned' => $unsigned,
            'index' => $index,
            'validation' => $validation,
            'validation_update' => str_replace('required', 'sometimes', $validation),
            'enum_values' => $enumValues,
        ]);
    }

    /**
     * استخراج القيمة الافتراضية
     */
    protected function extractDefault(string $modifiers): mixed
    {
        if (preg_match('/->default\(([^)]+)\)/', $modifiers, $match)) {
            $default = trim($match[1], '\'"');

            if ($default === 'true') return true;
            if ($default === 'false') return false;
            if ($default === 'null') return null;
            if (is_numeric($default)) return +$default;

            return $default;
        }
        return null;
    }

    /**
     * بناء قواعد الـ Validation
     */
    protected function buildValidation(string $type, string $name, bool $nullable, bool $unique, ?array $enumValues, ?string $length): string
    {
        $rules = [];

        // Required/Nullable
        $rules[] = $nullable ? 'nullable' : 'required';

        // Type-based rules
        switch ($type) {
            case 'string':
            case 'text':
            case 'longText':
                $rules[] = 'string';
                $rules[] = $length ? "max:{$length}" : 'max:255';
                break;

            case 'integer':
            case 'bigInteger':
            case 'tinyInteger':
            case 'smallInteger':
            case 'unsignedBigInteger':
            case 'unsignedInteger':
                $rules[] = 'integer';
                break;

            case 'decimal':
            case 'float':
            case 'double':
                $rules[] = 'numeric';
                break;

            case 'boolean':
                $rules[] = 'boolean';
                break;

            case 'date':
            case 'datetime':
            case 'timestamp':
                $rules[] = 'date';
                break;

            case 'json':
            case 'jsonb':
                $rules[] = 'array';
                break;

            case 'enum':
                $rules[] = 'string';
                if ($enumValues) {
                    $rules[] = 'in:' . implode(',', $enumValues);
                }
                break;
        }

        // Name-based rules
        if (Str::contains($name, 'email')) {
            $rules[] = 'email';
        }

        if (Str::contains($name, ['url', 'link'])) {
            $rules[] = 'url';
        }

        if ($unique) {
            $rules[] = 'unique:TABLE,COLUMN';
        }

        if (Str::endsWith($name, '_id')) {
            $rules[] = 'exists:RELATED_TABLE,id';
        }

        return implode('|', array_unique($rules));
    }

    // ===============================================
    // Foreign Keys Parsing
    // ===============================================

    protected function parseForeignKeys(string $content): void
    {
        // Pattern 1: foreignId()->constrained()
        $pattern1 = '/\$table->foreignId\([\'"](\w+)[\'"]\)(?:->constrained\([\'"]?(\w+)?[\'"]?\))?/';
        preg_match_all($pattern1, $content, $matches1, PREG_SET_ORDER);

        foreach ($matches1 as $match) {
            $column = $match[1];
            $table = $match[2] ?? Str::plural(str_replace('_id', '', $column));

            $this->foreignKeys[] = [
                'column' => $column,
                'references' => 'id',
                'on' => $table,
                'relation_name' => Str::camel(str_replace('_id', '', $column)),
                'model' => Str::studly(Str::singular($table)),
            ];
        }

        // Pattern 2: foreign()->references()->on()
        $pattern2 = '/\$table->foreign\([\'"](\w+)[\'"]\)->references\([\'"](\w+)[\'"]\)->on\([\'"](\w+)[\'"]\)/';
        preg_match_all($pattern2, $content, $matches2, PREG_SET_ORDER);

        foreach ($matches2 as $match) {
            $this->foreignKeys[] = [
                'column' => $match[1],
                'references' => $match[2],
                'on' => $match[3],
                'relation_name' => Str::camel(str_replace('_id', '', $match[1])),
                'model' => Str::studly(Str::singular($match[3])),
            ];
        }

        // إزالة التكرار
        $this->foreignKeys = array_values(array_unique($this->foreignKeys, SORT_REGULAR));
    }

    // ===============================================
    // Indexes Parsing
    // ===============================================

    protected function parseIndexes(string $content): void
    {
        $patterns = [
            'index' => '/\$table->index\((?:\[)?[\'"](\w+)[\'"]/',
            'unique' => '/\$table->unique\((?:\[)?[\'"](\w+)[\'"]/',
        ];

        foreach ($patterns as $type => $pattern) {
            preg_match_all($pattern, $content, $matches);
            foreach ($matches[1] as $column) {
                $this->indexes[$column] = $type;
            }
        }

        // Check for ->unique() modifier
        preg_match_all('/\$table->\w+\([\'"](\w+)[\'"].*?\)->unique\(\)/', $content, $uniqueMatches);
        foreach ($uniqueMatches[1] as $column) {
            $this->indexes[$column] = 'unique';
        }
    }

    // ===============================================
    // Model Generation
    // ===============================================

    protected function generateModel(string $modelName, string $tableName): void
    {
        $traits = ['HasStandardizedConfiguration'];
        if (isset($this->columns['deleted_at'])) {
            $traits[] = 'SoftDeletes';
        }

        $content = $this->buildModelContent($modelName, $tableName, $traits);
        $this->saveFile(app_path("Models/{$modelName}.php"), $content, 'Model');
    }

    protected function buildModelContent(string $modelName, string $tableName, array $traits): string
    {
        $traitsStr = implode(', ', $traits);
        $fillable = $this->buildFillableArray();
        $casts = $this->buildCastsArray();
        $hidden = $this->buildHiddenArray();
        $searchable = $this->buildSearchableArray();
        $filterable = $this->buildFilterableArray();
        $sortable = $this->buildSortableArray();
        $relations = $this->buildRelationsMethods();
        $scopes = $this->buildScopesMethods();

        $hiddenSection = empty(trim($hidden)) ? '' :
            "\n    // -------------------- Hidden --------------------\n    protected \$hidden = [\n{$hidden}\n    ];\n";

        return <<<PHP
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * {$modelName} Model
 *
 * Table: {$tableName}
 * Generated: {now()->toDateTimeString()}
 */
#[Cacheable]
class {$modelName} extends Model
{
    use {$traitsStr};

    protected \$table = '{$tableName}';

    // -------------------- Fillable --------------------
    protected \$fillable = [
{$fillable}
    ];

    // -------------------- Casts --------------------
    protected \$casts = [
{$casts}
    ];{$hiddenSection}
    // -------------------- Appends --------------------
    protected \$appends = [];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array \$searchableFields = {$searchable};

    /** @var array الفلاتر المسموحة */
    public static array \$filterable = {$filterable};

    /** @var array حقول الترتيب */
    public static array \$sortable = {$sortable};

    /** @var array العلاقات المحملة دائماً */
    public static array \$defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array \$allowedIncludes = [];

    /** @var string حقل الترتيب الافتراضي */
    public static string \$defaultSort = 'id';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string \$defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int \$defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int \$perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int \$cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array \$cacheTags = ['{$tableName}'];

    /** @var array الموديلات المرتبطة */
    public static array \$cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array \$scopes = [];

    // -------------------- Relations --------------------
{$relations}

    // -------------------- Scopes --------------------
{$scopes}

    // -------------------- Accessors --------------------

    // -------------------- Mutators --------------------

    // -------------------- Helpers --------------------
}
PHP;
    }

    // ===============================================
    // Array Builders
    // ===============================================

    protected function buildFillableArray(): string
    {
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];
        $fillable = array_filter(
            array_keys($this->columns),
            fn($col) => !in_array($col, $excluded)
        );

        return $this->formatArrayLines($fillable);
    }

    protected function buildCastsArray(): string
    {
        $casts = [];
        foreach ($this->columns as $name => $info) {
            if (!empty($info['cast'])) {
                $casts[$name] = $info['cast'];
            }
        }

        return $this->formatAssocArrayLines($casts);
    }

    protected function buildHiddenArray(): string
    {
        $hidden = [];
        foreach ($this->columns as $name => $info) {
            if (Str::contains($name, ['password', 'token', 'secret', 'api_key'])) {
                $hidden[] = $name;
            }
        }

        return $this->formatArrayLines($hidden);
    }

    protected function buildSearchableArray(): string
    {
        $searchable = [];
        $patterns = ['name', 'title', 'description', 'code', 'ref', 'email', 'phone', 'address', 'label', 'slug', 'notes'];

        foreach ($this->columns as $name => $info) {
            $type = $info['type'] ?? '';
            if (in_array($type, ['string', 'text', 'longText'])) {
                foreach ($patterns as $pattern) {
                    if (Str::contains($name, $pattern)) {
                        $searchable[] = $name;
                        break;
                    }
                }
            }
        }

        return $this->formatInlineArray($searchable);
    }

    protected function buildFilterableArray(): string
    {
        $filterable = [];

        foreach ($this->columns as $name => $info) {
            $include = false;

            // Boolean fields
            if (($info['type'] ?? '') === 'boolean') {
                $include = true;
            }
            // Foreign keys
            elseif (Str::endsWith($name, '_id')) {
                $include = true;
            }
            // Status fields
            elseif (in_array($name, ['active', 'status', 'type', 'state'])) {
                $include = true;
            }
            // Unique fields
            elseif (($info['unique'] ?? false) || ($this->indexes[$name] ?? '') === 'unique') {
                $include = true;
            }

            if ($include) {
                $filterable[] = $name;
            }
        }

        return $this->formatInlineArray(array_unique($filterable));
    }

    protected function buildSortableArray(): string
    {
        $sortable = ['id'];

        if (isset($this->columns['created_at'])) {
            $sortable[] = 'created_at';
        }

        foreach ($this->columns as $name => $info) {
            if (Str::contains($name, ['name', 'title', 'code', 'date', 'order', 'position', 'priority', 'sort'])) {
                $sortable[] = $name;
            }
        }

        return $this->formatInlineArray(array_unique($sortable));
    }

    // ===============================================
    // Relations & Scopes Builders
    // ===============================================

    protected function buildRelationsMethods(): string
    {
        $methods = [];

        // BelongsTo Relations
        foreach ($this->foreignKeys as $fk) {
            $methods[] = <<<METHOD
    /**
     * Get the {$fk['relation_name']} that owns this {class_basename(get_class($this))}.
     */
    public function {$fk['relation_name']}(): BelongsTo
    {
        return \$this->belongsTo({$fk['model']}::class);
    }
METHOD;
        }

        // MorphTo Relations
        foreach ($this->morphRelations as $name => $info) {
            $methods[] = <<<METHOD
    /**
     * Get the ownable model (polymorphic relation).
     */
    public function {$name}(): MorphTo
    {
        return \$this->morphTo();
    }
METHOD;
        }

        // Pivot Table Comment
        if ($this->isPivot && $this->pivotRelation1 && $this->pivotRelation2) {
            $rel1Plural = Str::camel(Str::plural($this->pivotRelation1));
            $rel2Plural = Str::camel(Str::plural($this->pivotRelation2));

            $methods[] = <<<COMMENT
    /**
     * هذا جدول pivot للعلاقة many-to-many
     *
     * أضف للموديل {$this->pivotRelation1}:
     * public function {$rel2Plural}(): BelongsToMany
     * {
     *     return \$this->belongsToMany({$this->pivotRelation2}::class);
     * }
     *
     * أضف للموديل {$this->pivotRelation2}:
     * public function {$rel1Plural}(): BelongsToMany
     * {
     *     return \$this->belongsToMany({$this->pivotRelation1}::class);
     * }
     */
COMMENT;
        }

        return empty($methods)
            ? "    // TODO: أضف العلاقات هنا\n"
            : implode("\n\n", $methods) . "\n";
    }

    protected function buildScopesMethods(): string
    {
        $scopes = [];

        // Active Scope
        if (isset($this->columns['active']) && ($this->columns['active']['type'] ?? '') === 'boolean') {
            $scopes[] = <<<SCOPE
    /**
     * Scope للسجلات النشطة فقط
     */
    public function scopeActive(Builder \$query): Builder
    {
        return \$query->where('active', true);
    }
SCOPE;
        }

        // Published Scope
        if (isset($this->columns['published_at'])) {
            $scopes[] = <<<SCOPE
    /**
     * Scope للسجلات المنشورة
     */
    public function scopePublished(Builder \$query): Builder
    {
        return \$query->whereNotNull('published_at')
                     ->where('published_at', '<=', now());
    }
SCOPE;
        }

        return empty($scopes) ? '' : implode("\n\n", $scopes) . "\n";
    }

    // ===============================================
    // Request Generation
    // ===============================================

    protected function generateRequests(string $modelName): void
    {
        $this->info("📝 توليد Requests...");

        // Store Request
        $storeContent = $this->buildStoreRequest($modelName);
        $this->saveFile(
            app_path("Http/Requests/{$modelName}StoreRequest.php"),
            $storeContent,
            'Store Request'
        );

        // Update Request
        $updateContent = $this->buildUpdateRequest($modelName);
        $this->saveFile(
            app_path("Http/Requests/{$modelName}UpdateRequest.php"),
            $updateContent,
            'Update Request'
        );
    }

    protected function buildStoreRequest(string $modelName): string
    {
        $rules = $this->buildValidationRules(false);

        return <<<PHP
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Store Request for {$modelName}
 *
 * Generated: {now()->toDateTimeString()}
 */
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

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            // TODO: Add custom error messages
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            // TODO: Add custom attribute names
        ];
    }
}
PHP;
    }

    protected function buildUpdateRequest(string $modelName): string
    {
        $rules = $this->buildValidationRules(true);
        $routeParam = Str::snake($modelName);

        return <<<PHP
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Update Request for {$modelName}
 *
 * Generated: {now()->toDateTimeString()}
 */
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

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            // TODO: Add custom error messages
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            // TODO: Add custom attribute names
        ];
    }
}
PHP;
    }

    protected function buildValidationRules(bool $isUpdate): string
    {
        $rules = [];
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];

        foreach ($this->columns as $name => $info) {
            if (in_array($name, $excluded)) {
                continue;
            }

            $validation = $isUpdate
                ? ($info['validation_update'] ?? 'sometimes|nullable')
                : ($info['validation'] ?? 'required');

            $rules[] = "            '{$name}' => '{$validation}'";
        }

        return empty($rules) ? '' : implode(",\n", $rules) . ',';
    }

    // ===============================================
    // Factory Generation
    // ===============================================

    protected function generateFactory(string $modelName): void
    {
        $this->info("🏭 توليد Factory...");

        $content = $this->buildFactoryContent($modelName);
        $this->saveFile(
            database_path("factories/{$modelName}Factory.php"),
            $content,
            'Factory'
        );
    }

    protected function buildFactoryContent(string $modelName): string
    {
        $definitions = $this->buildFactoryDefinitions();

        return <<<PHP
<?php

namespace Database\Factories;

use App\Models\\{$modelName};
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for {$modelName}
 *
 * Generated: {now()->toDateTimeString()}
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\\{$modelName}>
 */
class {$modelName}Factory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected \$model = {$modelName}::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
{$definitions}
        ];
    }
}
PHP;
    }

    protected function buildFactoryDefinitions(): string
    {
        $definitions = [];
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];

        foreach ($this->columns as $name => $info) {
            if (in_array($name, $excluded)) {
                continue;
            }

            $faker = $this->generateFakerMethod($name, $info);
            $definitions[] = "            '{$name}' => {$faker}";
        }

        return empty($definitions) ? '' : implode(",\n", $definitions) . ',';
    }

    protected function generateFakerMethod(string $name, array $info): string
    {
        // Foreign Keys
        if (Str::endsWith($name, '_id')) {
            $model = Str::studly(str_replace('_id', '', $name));
            return "{$model}::factory()";
        }

        $type = $info['type'] ?? 'string';
        $enumValues = $info['enum_values'] ?? null;

        // Enum
        if ($enumValues) {
            $values = implode("', '", $enumValues);
            return "fake()->randomElement(['{$values}'])";
        }

        // Name-based generation
        if (Str::contains($name, 'email')) {
            return 'fake()->unique()->safeEmail()';
        }
        if (Str::contains($name, 'password')) {
            return "bcrypt('password')";
        }
        if (Str::contains($name, ['first_name', 'firstname'])) {
            return 'fake()->firstName()';
        }
        if (Str::contains($name, ['last_name', 'lastname'])) {
            return 'fake()->lastName()';
        }
        if (Str::contains($name, 'name')) {
            return 'fake()->name()';
        }
        if (Str::contains($name, 'title')) {
            return 'fake()->sentence(3)';
        }
        if (Str::contains($name, 'description')) {
            return 'fake()->paragraph()';
        }
        if (Str::contains($name, 'phone')) {
            return 'fake()->phoneNumber()';
        }
        if (Str::contains($name, 'address')) {
            return 'fake()->address()';
        }
        if (Str::contains($name, ['url', 'link'])) {
            return 'fake()->url()';
        }
        if (Str::contains($name, 'slug')) {
            return 'fake()->slug()';
        }
        if (Str::contains($name, 'code')) {
            return "fake()->unique()->numerify('CODE-####')";
        }
        if (Str::contains($name, ['price', 'amount', 'cost'])) {
            return 'fake()->randomFloat(2, 10, 1000)';
        }
        if (Str::contains($name, 'quantity')) {
            return 'fake()->numberBetween(1, 100)';
        }

        // Type-based generation
        switch ($type) {
            case 'string':
            case 'text':
                return 'fake()->sentence()';

            case 'longText':
                return 'fake()->paragraphs(3, true)';

            case 'integer':
            case 'bigInteger':
            case 'tinyInteger':
            case 'smallInteger':
            case 'unsignedBigInteger':
            case 'unsignedInteger':
                return 'fake()->numberBetween(1, 100)';

            case 'decimal':
            case 'float':
            case 'double':
                return 'fake()->randomFloat(2, 0, 1000)';

            case 'boolean':
                return 'fake()->boolean()';

            case 'date':
                return 'fake()->date()';

            case 'datetime':
            case 'timestamp':
                return 'fake()->dateTime()';

            case 'time':
                return 'fake()->time()';

            case 'json':
            case 'jsonb':
                return '[]';

            default:
                return 'fake()->word()';
        }
    }

    // ===============================================
    // Seeder Generation
    // ===============================================

    protected function generateSeeder(string $modelName): void
    {
        $this->info("🌱 توليد Seeder...");

        $content = $this->buildSeederContent($modelName);
        $this->saveFile(
            database_path("seeders/{$modelName}Seeder.php"),
            $content,
            'Seeder'
        );
    }

    protected function buildSeederContent(string $modelName): string
    {
        return <<<PHP
<?php

namespace Database\Seeders;

use App\Models\\{$modelName};
use Illuminate\Database\Seeder;

/**
 * Seeder for {$modelName}
 *
 * Generated: {now()->toDateTimeString()}
 */
class {$modelName}Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 50 {$modelName} records
        {$modelName}::factory()
            ->count(50)
            ->create();

        // TODO: Add custom seeding logic if needed
    }
}
PHP;
    }

    // ===============================================
    // File Utilities
    // ===============================================

    protected function saveFile(string $path, string $content, string $type): void
    {
        if (File::exists($path) && !$this->option('force')) {
            if (!$this->confirm("⚠️  {$type} موجود. هل تريد الاستبدال؟")) {
                $this->warn("⏭️  تم تخطي {$type}");
                return;
            }
        }

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $content);
        $this->info("✅ تم إنشاء {$type}: {$path}");
    }

    // ===============================================
    // Formatting Utilities
    // ===============================================

    /**
     * تنسيق مصفوفة إلى أسطر منفصلة
     */
    protected function formatArrayLines(array $items): string
    {
        if (empty($items)) {
            return '';
        }

        $lines = array_map(fn($item) => "        '{$item}'", $items);
        return implode(",\n", $lines) . ',';
    }

    /**
     * تنسيق مصفوفة مفاتيح => قيم
     */
    protected function formatAssocArrayLines(array $items): string
    {
        if (empty($items)) {
            return '';
        }

        $lines = [];
        foreach ($items as $key => $value) {
            $lines[] = "        '{$key}' => '{$value}'";
        }

        return implode(",\n", $lines) . ',';
    }

    /**
     * تنسيق مصفوفة في سطر واحد
     */
    protected function formatInlineArray(array $items): string
    {
        if (empty($items)) {
            return '[]';
        }

        $formatted = array_map(fn($item) => "'{$item}'", $items);
        return '[' . implode(', ', $formatted) . ']';
    }

    // ===============================================
    // Summary Display
    // ===============================================

    protected function displaySummary(string $modelName, string $tableName): void
    {
        $this->newLine();
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info("📊 ملخص التوليد");
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        $this->table(
            ['الخاصية', 'القيمة'],
            [
                ['Model', $modelName],
                ['Table', $tableName],
                ['Columns', count($this->columns)],
                ['Foreign Keys', count($this->foreignKeys)],
                ['Indexes', count($this->indexes)],
                ['Morph Relations', count($this->morphRelations)],
                ['Is Pivot Table', $this->isPivot ? 'نعم' : 'لا'],
            ]
        );

        // عرض الأعمدة
        if (!empty($this->columns)) {
            $this->newLine();
            $this->info("📋 الأعمدة المكتشفة:");

            $columnData = [];
            foreach ($this->columns as $name => $info) {
                $columnData[] = [
                    $name,
                    $info['type'] ?? 'unknown',
                    $info['cast'] ?? '-',
                    $info['nullable'] ? '✓' : '✗',
                    $info['unique'] ? '✓' : '✗',
                ];
            }

            $this->table(
                ['Column', 'Type', 'Cast', 'Nullable', 'Unique'],
                $columnData
            );
        }

        // عرض العلاقات
        if (!empty($this->foreignKeys)) {
            $this->newLine();
            $this->info("🔗 العلاقات المكتشفة:");

            $relationData = [];
            foreach ($this->foreignKeys as $fk) {
                $relationData[] = [
                    $fk['column'],
                    $fk['model'],
                    $fk['relation_name'],
                    'BelongsTo',
                ];
            }

            $this->table(
                ['Column', 'Related Model', 'Method Name', 'Type'],
                $relationData
            );
        }

        // الملفات المولّدة
        $this->newLine();
        $this->info("📁 الملفات المولّدة:");
        $files = ['✓ Model'];

        if ($this->option('with-requests')) {
            $files[] = '✓ Store Request';
            $files[] = '✓ Update Request';
        }
        if ($this->option('with-factory')) {
            $files[] = '✓ Factory';
        }
        if ($this->option('with-seeder')) {
            $files[] = '✓ Seeder';
        }

        foreach ($files as $file) {
            $this->line("   {$file}");
        }

        $this->newLine();
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info("✨ تم بنجاح!");
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
}
