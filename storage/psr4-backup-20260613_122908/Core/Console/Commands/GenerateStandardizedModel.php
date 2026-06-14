<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GenerateStandardizedModel extends Command
{
    protected $signature = 'make:standard-model {name} {--migration=} {--force}';
    protected $description = 'Generate a standardized model following the Article pattern';

    public function handle()
    {
        $name = $this->argument('name');
        $migrationFile = $this->option('migration');

        $modelPath = app_path("Models/{$name}.php");

        if (File::exists($modelPath) && !$this->option('force')) {
            $this->error("Model {$name} already exists!");
            return 1;
        }

        // Parse migration if provided
        $columns = [];
        $relations = [];
        $usesSoftDeletes = false;

        if ($migrationFile && File::exists($migrationFile)) {
            $migrationContent = File::get($migrationFile);
            $parsed = $this->parseMigration($migrationContent);

            $columns = $parsed['columns'];
            $relations = $parsed['relations'];
            $usesSoftDeletes = $parsed['soft_deletes'];
        }

        // Generate model content
        $content = $this->generateModelContent($name, $columns, $relations, $usesSoftDeletes);

        File::put($modelPath, $content);

        $this->info("Model {$name} created successfully at {$modelPath}");

        return 0;
    }

    protected function parseMigration($content)
    {
        $columns = [];
        $relations = [];

        // 1. Detect SoftDeletes
        $usesSoftDeletes = preg_match('/\$table->softDeletes\(\);/', $content);

        // 2. Extract column definitions
        // Regex محسن: $table->type('name', ...)->modifier();
        preg_match_all('/\$table->(\w+)\([\'"](\w+)[\'"](?:,[^)]*)?\)((?:->\w+(?:\([^)]*\))?)*);/', $content, $matches, PREG_SET_ORDER);

        if (!empty($matches)) {
            foreach ($matches as $match) {
                $type = $match[1];
                $columnName = $match[2];
                $modifiers = $match[3] ?? '';

                $columns[$columnName] = [
                    'type' => $type,
                    'cast' => $this->determineCast($type),
                    'nullable' => Str::contains($modifiers, '->nullable()'),
                ];
            }
        }

        // 3. Extract foreign keys
        preg_match_all('/\$table->foreignId\([\'"](\w+)_id[\'"]\)/', $content, $fkMatches);
        if (!empty($fkMatches[1])) {
            foreach ($fkMatches[1] as $relationName) {
                $relations[] = [
                    'name' => Str::camel($relationName),
                    'model' => Str::studly($relationName),
                ];
            }
        }

        return [
            'columns' => $columns,
            'relations' => $relations,
            'soft_deletes' => $usesSoftDeletes,
        ];
    }

    protected function determineCast($type)
    {
        $castMap = [
            'boolean' => 'boolean',
            'integer' => 'integer',
            'bigInteger' => 'integer',
            'unsignedBigInteger' => 'integer',
            'tinyInteger' => 'integer',
            'smallInteger' => 'integer',
            'decimal' => 'decimal:2',
            'float' => 'float',
            'double' => 'double',
            'date' => 'date',
            'datetime' => 'datetime',
            'timestamp' => 'datetime',
            'json' => 'array',
            'jsonb' => 'array',
            'text' => 'string',
        ];

        return $castMap[$type] ?? null; // Default to null instead of 'string'
    }

    protected function generateModelContent($name, $columns, $relations, $usesSoftDeletes)
    {
        $tableName = Str::snake(Str::pluralStudly($name));

        // إزالة المفاتيح الأساسية والـ timestamps من $fillable
        $excluded = ['id', 'created_at', 'updated_at', 'deleted_at', 'remember_token'];
        $fillable = array_diff(array_keys($columns), $excluded);

        $casts = array_filter(array_map(fn($col) => $col['cast'], $columns));

        $fillableStr = !empty($fillable) ? "'" . implode("',\n        '", $fillable) . "'," : "//";

        $castsStr = '';
        foreach ($casts as $col => $cast) {
            $castsStr .= "        '{$col}' => '{$cast}',\n";
        }

        // --- SoftDeletes ---
        $softDeletesUse = $usesSoftDeletes ? "use Illuminate\Database\Eloquent\SoftDeletes;\n" : "";
        $softDeletesTrait = $usesSoftDeletes ? "    use SoftDeletes;\n" : "";

        // --- Relations ---
        $relationsStr = "// TODO: Add your relations here\n";
        if (!empty($relations)) {
            $relationsStr = "";
            foreach ($relations as $relation) {
                $relationsStr .= <<<REL
    public function {$relation['name']}(): BelongsTo
    {
        return \$this->belongsTo({$relation['model']}::class);
    }

REL;
            }
        }

        return <<<PHP
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
{$softDeletesUse}use App\Core\Attributes\Cacheable;

#[Cacheable]
class {$name} extends Model
{
{$softDeletesTrait}
    // -------------------- Fillable --------------------
    protected \$fillable = [
        {$fillableStr}
    ];

    // -------------------- Casts --------------------
    protected \$casts = [
{$castsStr}    ];

    // -------------------- Appends --------------------
    protected \$appends = [];

    // -------------------- Config for ApiListService --------------------

    // 🔍 حقول البحث
    public static array \$searchableFields = [];

    // 🎯 الفلاتر المسموحة
    public static array \$filterable = [];

    // 📊 حقول الترتيب
    public static array \$sortable = ['id', 'created_at'];

    // 🔗 العلاقات المحملة دائماً (افتراضياً)
    public static array \$defaultWith = [];

    // ✅ العلاقات التي يمكن للمستخدم طلبها عبر ?include=
    public static array \$allowedIncludes = [];

    // ⚙️ الإعدادات العامة
    public static string \$defaultSort = 'id';
    public static string \$defaultSortDirection = 'asc';
    public static int \$defaultPerPage = 15;
    public static int \$perPageLimit = 100;

    // 💾 إعدادات الكاش
    public static ?int \$cacheTtl = 300; // 5 دقائق
    public static array \$cacheTags = ['{$tableName}'];

    // 🔄 الموديلات التي يجب إبطال كاشها عند تعديل {$name}
    public static array \$cacheInvalidateRelations = [];

    // 🔭 Scopes المطبقة تلقائياً
    public static array \$scopes = [];

    // -------------------- Relations --------------------
    {$relationsStr}
    // -------------------- Accessors --------------------
    // TODO: Add your accessors here

    // -------------------- Mutators --------------------
    // TODO: Add your mutators here

    // -------------------- Scopes --------------------
    public function scopeActive(\$query)
    {
        // تم التعديل للتحقق من وجود العمود أولاً
        if (property_exists(\$this, 'active') || \Schema::hasColumn(\$this->getTable(), 'active')) {
             return \$query->where('active', true);
        }
        return \$query;
    }

    // -------------------- Helpers --------------------
    // TODO: Add your helper methods here
}
PHP;
    }
}
