<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * تحويل Migration إلى Model موحد - Enhanced Version
 *
 * الميزات:
 * ✅ تحليل شامل للـ migration
 * ✅ كشف العلاقات والـ foreign keys
 * ✅ دعم جميع أنواع الأعمدة
 * ✅ معالجة أخطاء محسّنة
 * ✅ توليد searchable, filterable, sortable ذكي
 *
 * الاستخدام:
 * php artisan make:model-from-migration create_tiers_table
 * php artisan make:model-from-migration create_users_table --name=User
 * php artisan make:model-from-migration create_users_table --force
 */
class MigrationToModel extends Command
{
    protected $signature = 'make:model-from-migration
                            {migration : اسم ملف الـ Migration}
                            {--name= : اسم الـ Model (اختياري)}
                            {--force : استبدال الملف الموجود}';

    protected $description = 'توليد Model موحد من Migration';

    protected array $columns = [];
    protected array $foreignKeys = [];
    protected array $indexes = [];
    protected bool $hasSoftDeletes = false;

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
        'unsignedTinyInteger' => 'integer',
        'unsignedSmallInteger' => 'integer',
        'unsignedMediumInteger' => 'integer',
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

    public function handle()
    {
        try {
            $migrationName = $this->argument('migration');
            $modelName = $this->option('name');

            // البحث عن ملف الـ Migration
            $migrationPath = $this->findMigration($migrationName);

            if (!$migrationPath) {
                $this->error("❌ لم يتم العثور على Migration: {$migrationName}");
                return 1;
            }

            $this->info("📄 تم العثور على: {$migrationPath}");

            // قراءة وتحليل الـ Migration
            $migrationContent = File::get($migrationPath);
            $tableName = $this->extractTableName($migrationContent);

            if (!$modelName) {
                $modelName = Str::studly(Str::singular($tableName));
            }

            $this->info("🗃️  إنشاء Model: {$modelName} للجدول: {$tableName}");

            // تحليل شامل
            $this->parseColumns($migrationContent);
            $this->parseForeignKeys($migrationContent);
            $this->parseIndexes($migrationContent);

            // توليد محتوى الـ Model
            $modelContent = $this->generateModel($modelName, $tableName);

            // حفظ الملف
            $modelPath = app_path("Models/{$modelName}.php");

            if (File::exists($modelPath) && !$this->option('force')) {
                if (!$this->confirm("⚠️  الملف موجود. هل تريد الاستبدال؟")) {
                    $this->warn("❌ تم الإلغاء");
                    return 0;
                }
            }

            File::ensureDirectoryExists(dirname($modelPath));
            File::put($modelPath, $modelContent);

            $this->info("✅ تم إنشاء Model: {$modelPath}");
            $this->displaySummary();

            return 0;

        } catch (\Throwable $e) {
            $this->error("❌ حدث خطأ: " . $e->getMessage());
            if ($this->option('verbose')) {
                $this->error($e->getTraceAsString());
            }
            return 1;
        }
    }

    /**
     * البحث عن ملف Migration
     */
    protected function findMigration(string $name): ?string
    {
        $migrationsPaths = [
            database_path('migrations'),
            database_path('migrations/tenant'),
        ];

        foreach ($migrationsPaths as $migrationsPath) {
            if (!is_dir($migrationsPath)) {
                continue;
            }

            $files = File::files($migrationsPath);

            foreach ($files as $file) {
                if (Str::contains($file->getFilename(), $name)) {
                    return $file->getPathname();
                }
            }
        }

        return null;
    }

    /**
     * استخراج اسم الجدول
     */
    protected function extractTableName(string $content): string
    {
        if (preg_match('/Schema::create\([\'"](\w+)[\'"]/', $content, $match)) {
            return $match[1];
        }
        return 'unknown';
    }

    /**
     * تحليل الأعمدة
     */
    protected function parseColumns(string $content): void
    {
        $this->columns = [];

        // 1. Helper Methods
        $this->parseHelperMethods($content);

        // 2. Foreign Keys
        $this->parseForeignIdColumns($content);

        // 3. Regular Columns
        $this->parseRegularColumns($content);
    }

    /**
     * تحليل Helper Methods (timestamps, softDeletes, etc.)
     */
    protected function parseHelperMethods(string $content): void
    {
        // timestamps()
        if (preg_match('/\$table->timestamps\(\)/', $content)) {
            $this->addColumn('created_at', 'timestamp', [
                'cast' => 'datetime',
                'nullable' => false
            ]);
            $this->addColumn('updated_at', 'timestamp', [
                'cast' => 'datetime',
                'nullable' => false
            ]);
        }

        // softDeletes()
        if (preg_match('/\$table->softDeletes\(\)/', $content)) {
            $this->hasSoftDeletes = true;
            $this->addColumn('deleted_at', 'timestamp', [
                'cast' => 'datetime',
                'nullable' => true
            ]);
        }

        // rememberToken()
        if (preg_match('/\$table->rememberToken\(\)/', $content)) {
            $this->addColumn('remember_token', 'string', [
                'cast' => null,
                'nullable' => true,
                'length' => 100
            ]);
        }
    }

    /**
     * تحليل Foreign ID Columns
     */
    protected function parseForeignIdColumns(string $content): void
    {
        $pattern = '/\$table->foreignId\([\'"](\w+)[\'"]\)((?:->(?:\w+)\([^\)]*\))*);/';
        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $columnName = $match[1];
            $modifiers = $match[2] ?? '';

            $this->addColumn($columnName, 'unsignedBigInteger', [
                'cast' => 'integer',
                'nullable' => Str::contains($modifiers, '->nullable()'),
                'unsigned' => true
            ]);
        }
    }

    /**
     * تحليل الأعمدة العادية
     */
    protected function parseRegularColumns(string $content): void
    {
        $pattern = '/\$table->(\w+)\([\'"](\w+)[\'"](?:,\s*([^)]+))?\)((?:->(?:\w+)\([^\)]*\))*);/';
        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $type = $match[1];
            $name = $match[2];
            $param = $match[3] ?? null;
            $modifiers = $match[4] ?? '';

            // Skip helper methods and foreignId
            if (in_array($type, ['timestamps', 'softDeletes', 'rememberToken', 'foreignId'])) {
                continue;
            }

            $this->processRegularColumn($type, $name, $param, $modifiers);
        }
    }

    /**
     * معالجة عمود عادي
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
            $length = (int)$param;
        }

        $this->addColumn($name, $type, [
            'cast' => $cast,
            'nullable' => $nullable,
            'unique' => $unique,
            'default' => $default,
            'length' => $length,
            'unsigned' => $unsigned,
            'index' => $index,
            'enum_values' => $enumValues
        ]);
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
            'enum_values' => null,
        ];

        $this->columns[$name] = array_merge($defaultConfig, $customConfig);
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
     * تحليل Foreign Keys
     */
    protected function parseForeignKeys(string $content): void
    {
        $this->foreignKeys = [];

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

    /**
     * تحليل Indexes
     */
    protected function parseIndexes(string $content): void
    {
        $this->indexes = [];

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

    /**
     * توليد محتوى Model
     */
    protected function generateModel(string $modelName, string $tableName): string
    {
        $traits = ['HasStandardizedConfiguration'];
        if ($this->hasSoftDeletes) {
            $traits[] = 'SoftDeletes';
        }

        $traitsStr = implode(', ', $traits);
        $softDeletesImport = $this->hasSoftDeletes ? "use Illuminate\Database\Eloquent\SoftDeletes;\n" : "";

        $fillable = $this->buildFillableArray();
        $casts = $this->buildCastsArray();
        $hidden = $this->buildHiddenArray();
        $searchable = $this->buildSearchableArray();
        $filterable = $this->buildFilterableArray();
        $sortable = $this->buildSortableArray();
        $relations = $this->buildRelationsMethods();

        $hiddenSection = empty(trim($hidden)) ? '' :
            "\n    // -------------------- Hidden --------------------\n    protected \$hidden = [\n{$hidden}\n    ];\n";

        return <<<PHP
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
{$softDeletesImport}use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;
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
    public function scopeActive(Builder \$query): Builder
    {
        if (Schema::hasColumn(\$this->getTable(), 'active')) {
            return \$query->where('active', true);
        }
        return \$query;
    }

    // -------------------- Accessors --------------------

    // -------------------- Mutators --------------------

    // -------------------- Helpers --------------------
}
PHP;
    }

    /**
     * بناء مصفوفة Fillable
     */
    protected function buildFillableArray(): string
    {
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];
        $fillable = array_filter(
            array_keys($this->columns),
            fn($col) => !in_array($col, $excluded)
        );

        return $this->formatArrayLines($fillable);
    }

    /**
     * بناء مصفوفة Casts
     */
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

    /**
     * بناء مصفوفة Hidden
     */
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

    /**
     * بناء مصفوفة Searchable
     */
    protected function buildSearchableArray(): string
    {
        $searchable = [];
        $patterns = ['name', 'title', 'description', 'code', 'ref', 'email', 'phone', 'address', 'label', 'slug'];

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

    /**
     * بناء مصفوفة Filterable
     */
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

    /**
     * بناء مصفوفة Sortable
     */
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

    /**
     * بناء Methods العلاقات
     */
    protected function buildRelationsMethods(): string
    {
        if (empty($this->foreignKeys)) {
            return "    // TODO: أضف العلاقات هنا\n";
        }

        $methods = [];
        foreach ($this->foreignKeys as $fk) {
            $methods[] = <<<METHOD
    /**
     * Get the {$fk['relation_name']} that owns this record.
     */
    public function {$fk['relation_name']}(): BelongsTo
    {
        return \$this->belongsTo({$fk['model']}::class);
    }
METHOD;
        }

        return implode("\n\n", $methods) . "\n";
    }

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

    /**
     * عرض الملخص
     */
    protected function displaySummary(): void
    {
        $this->newLine();
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info("📊 ملخص التحليل");
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        $this->table(
            ['الخاصية', 'العدد'],
            [
                ['الأعمدة', count($this->columns)],
                ['العلاقات', count($this->foreignKeys)],
                ['Indexes', count($this->indexes)],
                ['SoftDeletes', $this->hasSoftDeletes ? 'نعم' : 'لا'],
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
                ];
            }

            $this->table(
                ['Column', 'Type', 'Cast', 'Nullable'],
                array_slice($columnData, 0, 10) // عرض أول 10 أعمدة فقط
            );

            if (count($columnData) > 10) {
                $this->line("   ... و " . (count($columnData) - 10) . " عمود إضافي");
            }
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
                ];
            }

            $this->table(
                ['Column', 'Related Model', 'Method Name'],
                $relationData
            );
        }

        $this->newLine();
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info("✨ تم بنجاح!");
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
}
