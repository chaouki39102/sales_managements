<?php

// دمج تلقائي لكل ملفات الـ migrations



// ===== ملف: 0001_01_01_000000_create_users_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};




// ===== ملف: 0001_01_01_000001_create_cache_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->bigInteger('expiration')->index();
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->bigInteger('expiration')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};




// ===== ملف: 0001_01_01_000002_create_jobs_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('failed_jobs');
    }
};




// ===== ملف: 2025_10_15_093158_create_genders_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for genders lookup table
 *
 * Replaces ENUM gender field with a proper lookup table
 * for better flexibility and maintainability
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('genders', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });


    }

    public function down(): void
    {
        Schema::dropIfExists('genders');
    }
};




// ===== ملف: 2025_10_15_093204_create_document_base_operations_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_base_operations lookup table
 *
 * Defines base operations for commercial documents
 * Replaces the ENUM base_operation field in document_types table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_base_operations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });


    }

    public function down(): void
    {
        Schema::dropIfExists('document_base_operations');
    }
};




// ===== ملف: 2025_10_15_093204_create_party_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for party_types lookup table
 *
 * Defines types of parties (customers, suppliers, both)
 * Replaces the ENUM type field in the parties table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('party_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('party_types')->insert([
            ['name' => 'client', 'label' => 'Customer', 'description' => 'Customer party type', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'supplier', 'label' => 'Supplier', 'description' => 'Supplier party type', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'both', 'label' => 'Customer & Supplier', 'description' => 'Both customer and supplier', 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('party_types');
    }
};




// ===== ملف: 2025_10_15_093205_create_product_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_types lookup table
 *
 * Defines types of products (stockable, service, consumable)
 * Replaces the ENUM type field in the products table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('manages_stock')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('product_types')->insert([
            ['name' => 'stockable', 'label' => 'Stockable Product', 'description' => 'Physical product with inventory tracking', 'manages_stock' => true, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'service', 'label' => 'Service', 'description' => 'Non-physical service item', 'manages_stock' => false, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'consumable', 'label' => 'Consumable', 'description' => 'Consumable product without strict inventory tracking', 'manages_stock' => false, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_types');
    }
};




// ===== ملف: 2025_10_15_093209_create_wilayas_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for wilayas table
 *
 * Stores Algerian provinces (wilayas) for geographic organization
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wilayas', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('code')->unique()->comment('Official wilaya code');
            $table->string('name', 100);
            $table->string('arabic_name', 100);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wilayas');
    }
};




// ===== ملف: 2025_10_15_093215_create_communes_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for communes table
 *
 * Stores Algerian municipalities (communes) linked to wilayas
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->string('post_code', 10)->nullable()->index();
            $table->string('name', 100);
            $table->string('arabic_name', 100);

            // ✅ CORRECTED: Added explicit table name and cascadeOnUpdate
            // cascadeOnDelete is correct here, as a commune cannot exist without a wilaya.
            $table->foreignId('wilaya_id')
                  ->constrained('wilayas') // تحديد اسم الجدول الأب بوضوح
                  ->cascadeOnDelete()      // (صحيح) احذف البلدية إذا حذفت الولاية
                  ->cascadeOnUpdate();      // (مضاف) حدث المفتاح إذا تغير ID الولاية

            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
    }
};




// ===== ملف: 2025_10_15_093216_create_price_levels_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for price_levels table
 *
 * Defines different pricing tiers for products (retail, wholesale, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_percentage')->default(false)->comment('Is the value a percentage?');
            $table->decimal('value', 10, 2)->default(0)->comment('Fixed price or percentage value');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_levels');
    }
};




// ===== ملف: 2025_10_15_093217_create_stock_movement_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for stock_movement_types lookup table
 *
 * Defines types of stock movements (in, out, adjustment)
 * Replaces the ENUM movement_type field in stock_movements table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movement_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->smallInteger('direction')->default(0)->comment('-1 for out, 0 for neutral, 1 for in');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('stock_movement_types')->insert([
            ['name' => 'in', 'label' => 'Stock In', 'description' => 'Incoming stock', 'direction' => 1, 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'out', 'label' => 'Stock Out', 'description' => 'Outgoing stock', 'direction' => -1, 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'adjustment', 'label' => 'Adjustment', 'description' => 'Stock adjustment', 'direction' => 0, 'active' => true, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movement_types');
    }
};




// ===== ملف: 2025_10_15_093218_create_treasury_account_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for treasury_account_types lookup table
 *
 * Defines types of treasury accounts (bank, cash)
 * Replaces the ENUM type field in treasury_accounts table
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_account_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('treasury_account_types')->insert([
            ['name' => 'bank', 'label' => 'Bank Account', 'description' => 'Bank account type', 'active' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cash', 'label' => 'Cash', 'description' => 'Cash account type', 'active' => true, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_account_types');
    }
};




// ===== ملف: 2025_10_15_093221_create_permission_tables.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for Spatie Permission package tables
 *
 * Manages roles and permissions for user access control
 */
return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teams = config('permission.teams');

        Schema::create($tableNames['permissions'], function (Blueprint $table) {
            $table->id();
            $table->string('name', 125); // Default length is 255, 125 is often enough
            $table->string('guard_name', 125);
            $table->string('display_name')->nullable();
            $table->string('group', 100)->nullable()->index();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
        });

        Schema::create($tableNames['roles'], function (Blueprint $table) use ($teams, $columnNames) {
            $table->id();
            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key'])->nullable()->index();
            }
            $table->string('name', 125);
            $table->string('guard_name', 125);
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            if ($teams) {
                $table->unique([$columnNames['team_foreign_key'], 'name', 'guard_name']);
            } else {
                $table->unique(['name', 'guard_name']);
            }
        });

        Schema::create($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames, $teams) {
            $permissionColumn = $columnNames['permission_pivot_key'] ?? 'permission_id';

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId($permissionColumn)
                ->constrained($tableNames['permissions'])
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');

            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key']);
                $table->index($columnNames['team_foreign_key'], 'model_has_permissions_team_foreign_key_index');
                $table->primary([
                    $columnNames['team_foreign_key'],
                    $permissionColumn,
                    $columnNames['model_morph_key'],
                    'model_type'
                ], 'model_has_permissions_permission_model_type_primary');
            } else {
                $table->primary([
                    $permissionColumn,
                    $columnNames['model_morph_key'],
                    'model_type'
                ], 'model_has_permissions_permission_model_type_primary');
            }
        });

        Schema::create($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $columnNames, $teams) {
            $roleColumn = $columnNames['role_pivot_key'] ?? 'role_id';

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId($roleColumn)
                ->constrained($tableNames['roles'])
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');

            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key']);
                $table->index($columnNames['team_foreign_key'], 'model_has_roles_team_foreign_key_index');
                $table->primary([
                    $columnNames['team_foreign_key'],
                    $roleColumn,
                    $columnNames['model_morph_key'],
                    'model_type'
                ], 'model_has_roles_role_model_type_primary');
            } else {
                $table->primary([
                    $roleColumn,
                    $columnNames['model_morph_key'],
                    'model_type'
                ], 'model_has_roles_role_model_type_primary');
            }
        });

        Schema::create($tableNames['role_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames) {
            $permissionColumn = $columnNames['permission_pivot_key'] ?? 'permission_id';
            $roleColumn = $columnNames['role_pivot_key'] ?? 'role_id';

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId($permissionColumn)
                ->constrained($tableNames['permissions'])
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId($roleColumn)
                ->constrained($tableNames['roles'])
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->primary([
                $permissionColumn,
                $roleColumn
            ], 'role_has_permissions_permission_id_role_id_primary');
        });

        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');

        Schema::dropIfExists($tableNames['role_has_permissions']);
        Schema::dropIfExists($tableNames['model_has_roles']);
        Schema::dropIfExists($tableNames['model_has_permissions']);
        Schema::dropIfExists($tableNames['roles']);
        Schema::dropIfExists($tableNames['permissions']);
    }
};




// ===== ملف: 2025_10_15_093228_create_fiscal_years_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for fiscal_years table
 * 
 * Manages fiscal/financial years for accounting periods
 * Required for Algerian accounting system compliance
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique()->comment('e.g., 2025, FY2025');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false)->index();
            $table->date('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_current')->default(false)->index()->comment('Currently active fiscal year');
            $table->text('closing_notes')->nullable();
            $table->timestamps();
            
            // Ensure no overlapping periods
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};




// ===== ملف: 2025_10_15_093229_create_currencies_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 3)->unique()->comment('ISO 4217 code like DZD, EUR, USD');
            $table->string('symbol', 10);
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->boolean('is_base_currency')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE currencies COMMENT 'لإدارة العملات المختلفة المستخدمة في النظام'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};




// ===== ملف: 2025_10_15_093236_create_legal_forms_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_forms', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('مثل: SARL, EURL, SPA');
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('requires_capital')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE legal_forms COMMENT 'يحتوي على الأشكال القانونية للشركات حسب القانون الجزائري'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_forms');
    }
};




// ===== ملف: 2025_10_15_093237_create_warehouses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for warehouses table (renamed from depots)
 *
 * Manages inventory storage locations
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('address')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate();

            $table->string('phone', 20)->nullable();
            $table->string('manager_name', 100)->nullable();

            // Business and Legal Information
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');

            $table->boolean('active')->default(true)->index();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};




// ===== ملف: 2025_10_15_093242_create_parties_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for parties table (renamed from tiers)
 *
 * Manages customers, suppliers, and business partners with Algerian legal compliance
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();

            // Party type
            // ✅ CORRECTED: Kept restrictOnDelete (field is NOT nullable), added cascadeOnUpdate
            $table->foreignId('party_type_id')->constrained('party_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_parties_party_type_id');

            // Identification
            $table->string('code', 50)->nullable()->unique()->index();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug')->unique();

            // Business and Legal Information (Original & New)
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->unique()->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');
            // ✅ IMPROVEMENT: Added Algerian Legal Fields
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable()->comment('رأس المال');
            $table->date('rc_date')->nullable()->comment('تاريخ السجل التجاري');

            // Contact information
            $table->text('address')->nullable();
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->unique();
            $table->string('avatar')->nullable();

            // Banking information
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable()->comment('Bank account number');

            // Financial settings (Original & New)
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('credit_limit', 15, 4)->default(0.00);
            // ✅ CORRECTED: Use nullOnDelete() for nullable foreign keys
            $table->foreignId('default_price_level_id')->nullable()->constrained('price_levels')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_price_level_id');
            // ✅ IMPROVEMENT: Added financial fields
            $table->unsignedInteger('credit_days')->nullable()->comment('أجل الدفع الافتراضي بالأيام');

            // Tax settings (Original & New)
            $table->boolean('is_tva_exempt')->default(false)->index()->comment('معفى من TVA؟');
            $table->boolean('is_taxable')->default(true)->index()->comment('VAT exempt status');
            $table->string('tax_option', 50)->nullable()->comment('e.g., TVA sur les débits');

            // ✅ IMPROVEMENT: Added tax and classification fields
            $table->string('cnas_number', 50)->nullable()->comment('رقم التسجيل في CNAS');
            $table->enum('tax_regime', ['forfaitaire', 'réel'])->nullable()->comment('النظام الضريبي');
            $table->boolean('is_final_consumer')->default(false)->comment('يصنف كـ مستهلك نهائي');

            // Additional data
            $table->json('additional_data')->nullable();
            // Disable fullText for SQLite (not supported)
            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'commercial_name', 'email', 'phone']);
            }

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Use nullOnDelete() for audit trails
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_deleted_by');


            $table->boolean('is_vat_registered')->default(false)
                ->comment('مسجل في نظام TVA؟');
            $table->date('vat_registration_date')->nullable();


            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['name', 'commercial_name']);
            $table->index(['party_type_id', 'active']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE parties COMMENT 'لإدارة الأطراف (عملاء، موردون) مع المعلومات القانونية الجزائرية'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('parties');
    }
};




// ===== ملف: 2025_10_15_093247_create_families_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for families table
 *
 * Manages hierarchical product categories/families
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug')->unique()->nullable();
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('parent_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();

            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('families');
    }
};




// ===== ملف: 2025_10_15_093252_create_brands_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for brands table
 *
 * Manages product brands/manufacturers
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->string('website', 255)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};




// ===== ملف: 2025_10_15_093257_create_units_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for units table (renamed from unites)
 *
 * Manages units of measurement for products
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('symbol', 20)->nullable()->comment('Unit symbol (e.g., kg, m, l)');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};




// ===== ملف: 2025_10_15_093302_create_tvas_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for tvas table
 *
 * Manages VAT (Value Added Tax) rates
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tvas', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->decimal('rate', 8, 2)->default(0.00)->comment('VAT rate percentage');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_default')->default(false)->index()->comment('Default VAT rate');
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['name', 'rate']);
        });

        // Insert default VAT rates for Algeria
        DB::table('tvas')->insert([
            ['name' => 'VAT 19%', 'rate' => 19.00, 'description' => 'Standard VAT rate', 'active' => true, 'is_default' => true, 'display_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VAT 9%', 'rate' => 9.00, 'description' => 'Reduced VAT rate', 'active' => true, 'is_default' => false, 'display_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VAT 0%', 'rate' => 0.00, 'description' => 'Zero VAT rate', 'active' => true, 'is_default' => false, 'display_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tvas');
    }
};




// ===== ملف: 2025_10_15_093306_create_fiscal_stamps_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_stamps', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('min_amount', 15, 4)->comment('الحد الأدنى للمبلغ لتطبيق الطابع');
            $table->decimal('max_amount', 15, 4)->nullable()->comment('الحد الأقصى للمبلغ');
            $table->decimal('stamp_value', 15, 4)->comment('قيمة الطابع الجبائي');
            $table->enum('type', ['fixed', 'percentage'])->default('fixed');
            $table->boolean('active')->default(true)->index();
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE fiscal_stamps COMMENT 'لإدارة قيم وقواعد تطبيق الطابع الجبائي'");
    }
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_stamps');
    }
};




// ===== ملف: 2025_10_15_093308_create_products_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration for products table (renamed from articles)
 *
 * Stores general product information (parent level)
 * This table contains shared information for all product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // Basic information
            $table->string('name', 150);
            $table->string('slug', 150)->unique();
            $table->text('description')->nullable();

            // Categorization
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete()->cascadeOnUpdate();
            // ✅ CORRECTED: Kept restrictOnDelete (non-nullable), added cascadeOnUpdate
            $table->foreignId('product_type_id')->constrained('product_types')->restrictOnDelete()->cascadeOnUpdate();

            // Product specifications
            $table->json('specifications')->nullable()->comment('Product specifications and attributes');

            // Images and media
            $table->json('images')->nullable()->comment('Product images');

            // SEO and metadata
            $table->string('meta_title', 200)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('meta_keywords')->nullable();

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['name', 'active']);
            $table->index(['family_id', 'brand_id', 'active']);
            // Disable fullText for SQLite (not supported)
            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'description']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};




// ===== ملف: 2025_10_15_093309_create_inventory_valuation_methods_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_valuation_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->enum('method', ['fifo', 'lifo', 'weighted_average']);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_valuation_methods');
    }
};




// ===== ملف: 2025_10_15_093313_create_product_variants_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_variants table
 *
 * Stores specific variant information (SKU level)
 * Each variant represents a sellable unit with unique pricing and inventory
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();

            // Parent product relationship
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();

            // Variant identification
            $table->string('ref', 50)->nullable()->unique()->comment('SKU/Reference');
            $table->string('barcode', 50)->nullable()->unique();
            $table->string('variant_name', 100)->nullable()->comment('Variant name (e.g., Size L, Color Red)');

            // Unit and tax
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('tva_id')->nullable()->constrained('tvas')->nullOnDelete()->cascadeOnUpdate();

            // Pricing
            $table->decimal('last_purchase_price', 15, 4)->default(0)->unsigned();
            $table->decimal('average_cost_price', 15, 4)->default(0)->unsigned();
            $table->decimal('default_selling_price_ht', 15, 4)->default(0)->unsigned();

            // Stock management settings
            $table->boolean('manages_stock')->default(true);
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('has_lots')->default(false)->comment('Tracks lot/batch numbers');
            $table->boolean('has_expiration_date')->default(false);
            $table->decimal('min_stock_alert', 15, 4)->default(0)->unsigned();
            $table->decimal('max_stock_alert', 15, 4)->default(0)->unsigned();

            // Discounts
            $table->boolean('manages_quantity_discounts')->default(false);

            // Physical attributes
            $table->decimal('weight', 15, 3)->default(0)->unsigned()->comment('Weight in kg');
            $table->decimal('volume', 15, 3)->default(0)->unsigned()->comment('Volume in m³');
            $table->decimal('length', 15, 4)->default(0)->unsigned()->nullable()->comment('Length in cm');
            $table->decimal('width', 15, 4)->default(0)->unsigned()->nullable()->comment('Width in cm');
            $table->decimal('height', 15, 4)->default(0)->unsigned()->nullable()->comment('Height in cm');

            // Variant-specific data
            $table->json('variant_attributes')->nullable()->comment('Color, size, etc.');

            // Status and audit
            $table->boolean('active')->default(true)->index();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('valuation_method_id')
                ->nullable()
                ->constrained('inventory_valuation_methods');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['ref', 'barcode', 'active']);
            $table->index(['product_id', 'active']);
            $table->index(['manages_stock']); // للمنتجات التي تحتاج إدارة مخزون
        });
        // Disable CHECK constraints for SQLite (not fully supported)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE product_variants
                ADD CONSTRAINT chk_prices CHECK (default_selling_price_ht >= 0)');
            DB::statement('ALTER TABLE product_variants
                ADD CONSTRAINT chk_stock_alerts CHECK (min_stock_alert <= max_stock_alert)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};




// ===== ملف: 2025_10_15_093319_create_product_variant_prices_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for product_variant_prices table (renamed from article_prices)
 *
 * Manages different pricing levels for product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variant_prices', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('price', 15, 4)->unsigned();
            $table->date('valid_from')->default(now())->comment('Price validity start date');
            $table->date('valid_to')->nullable()->comment('Price validity end date');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->unique(['product_variant_id', 'price_level_id', 'valid_from'], 'variant_price_level_date_unique');
            $table->index(['product_variant_id', 'active']);
            $table->index(['valid_from', 'valid_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_prices');
    }
};




// ===== ملف: 2025_10_15_093416_create_quantity_discounts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for quantity_discounts table
 *
 * Manages volume-based discounts for product variants
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quantity_discounts', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('min_quantity', 15, 4)->unsigned();
            $table->decimal('max_quantity', 15, 4)->nullable()->unsigned()->comment('NULL means no upper limit');
            $table->decimal('discount_per_unit', 15, 4)->unsigned()->comment('Discount amount per unit');
            $table->decimal('discount_percentage', 8, 2)->nullable()->unsigned()->comment('Alternative: percentage discount');
            $table->unsignedTinyInteger('tier_order')->default(0)->comment('Order of discount tiers');
            $table->boolean('active')->default(true)->index();
            $table->date('valid_from')->default(now());
            $table->date('valid_to')->nullable();
            $table->timestamps();

            $table->index(['product_variant_id', 'active']);
            $table->index(['min_quantity', 'max_quantity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quantity_discounts');
    }
};




// ===== ملف: 2025_10_15_093421_create_document_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_types table
 *
 * Defines types of commercial documents (invoices, quotes, orders, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('name_latin', 100)->unique();
            $table->string('code', 20)->unique()->comment('Short code for document type');
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('document_base_operation_id')->constrained('document_base_operations')->restrictOnDelete()->cascadeOnUpdate();

            $table->smallInteger('affects_stock_direction')->default(0)->comment('-1 for stock out, 0 for no effect, 1 for stock in');
            $table->boolean('requires_party')->default(true)->comment('Requires customer/supplier');
            $table->boolean('affects_accounting')->default(true);
            $table->boolean('is_printable')->default(true);
            $table->string('print_template', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};




// ===== ملف: 2025_10_15_093426_create_numbering_series_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for numbering_series table
 *
 * Manages automatic numbering sequences for documents
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('numbering_series', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Kept cascadeOnDelete (correct choice) and added cascadeOnUpdate
            $table->foreignId('document_type_id')
                  ->constrained('document_types')
                  ->cascadeOnDelete() // (صحيح) حذف السلسلة إذا حذف نوع المستند
                  ->cascadeOnUpdate()
                  ->name('fk_series_document_type_id');

            // ✅ CORRECTED: Changed cascadeOnDelete to nullOnDelete (field is nullable)
            $table->foreignId('warehouse_id')
                  ->nullable()
                  ->constrained('warehouses')
                  ->nullOnDelete() // (مُصحح) اجعل الحقل NULL إذا حذف المستودع
                  ->cascadeOnUpdate()
                  ->name('fk_series_warehouse_id');

            $table->string('prefix', 20);
            $table->string('suffix', 20)->nullable();
            $table->string('format', 100)->comment('e.g., {PREFIX}{YY}{MONTH}{NUMBER:6}');
            $table->unsignedBigInteger('last_number')->default(0);
            $table->unsignedInteger('padding')->default(6)->comment('Number padding length');

            // ✅ IMPROVEMENT: Added new fields for better control
            $table->unsignedBigInteger('start_number')->default(1)->comment('The number to start from');
            $table->unsignedBigInteger('max_number')->nullable()->comment('The maximum allowed number in the series');
            $table->boolean('reset_yearly')->default(false);
            $table->boolean('reset_monthly')->default(false);
            $table->unsignedSmallInteger('current_year')->nullable();
            $table->unsignedTinyInteger('current_month')->nullable();
            $table->date('reset_date')->nullable()->comment('Specific date for manual reset if needed');
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_locked')->default(false)->index()->comment('Prevent this series from being used');
            $table->timestamps();

            $table->unique(['document_type_id', 'warehouse_id', 'prefix'], 'numbering_series_unique');
        });

        // ✅ IMPROVEMENT: Added table comment
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE numbering_series COMMENT 'يدير سلاسل الترقيم التلقائي للمستندات المختلفة'");
    }
    }

    public function down(): void
    {
        Schema::dropIfExists('numbering_series');
    }
};




// ===== ملف: 2025_10_15_093429_create_stock_movements_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for stock_movements table
 *
 * Tracks all inventory movements
 * Now linked to product_variant_id instead of article_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            // Product and location
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();

            // ⭐ تعديل: إضافة السنة المالية ⭐
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Movement type
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('stock_movement_type_id')->constrained('stock_movement_types')->restrictOnDelete()->cascadeOnUpdate();

            // Related document
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
$table->unsignedBigInteger('commercial_document_line_id') // <--- تم التغيير من foreignId
    ->nullable();
            // Movement details
            $table->dateTime('movement_date');
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 4);
            $table->decimal('cost_price', 15, 4)->comment('Cost price at movement time');
            $table->decimal('total_price', 15, 4);

            // Stock balance after movement
            $table->decimal('stock_balance_after', 15, 3)->comment('Stock quantity after this movement');

            // Lot tracking
            $table->string('lot_number', 100)->nullable();
            $table->date('expiration_date')->nullable();

            // Additional information
            $table->string('reason', 255)->nullable()->comment('Reason for movement');
            $table->text('notes')->nullable();

            // User and relationships
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('parent_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete()->cascadeOnUpdate()->comment('For adjustments or reversals');

            $table->boolean('is_validated')->default(false)->index()
                ->comment('محققة ومعتمدة؟');
            $table->foreignId('validated_by')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();

// Lot tracking
$table->unsignedBigInteger('stock_lot_id') // <--- تم التغيير من foreignId
    ->nullable()
    ->index();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['product_variant_id', 'warehouse_id', 'movement_date'], 'stock_mov_prod_wh_date_idx');
            $table->index(['movement_date', 'stock_movement_type_id']);
            $table->index(['warehouse_id', 'movement_date']);
            $table->index('lot_number');
            // ⭐ تعديل: إضافة فهرس للسنة المالية ⭐
            $table->index(['fiscal_year_id', 'movement_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};




// ===== ملف: 2025_10_15_093430_create_product_lots_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 📦 جدول دفعات المنتجات (Product Lots)
 * النسخة النهائية – متوافقة مع Laravel 12 و Blueprint v4
 * تشمل تطبيق FIFO + التتبع + التكلفة القانونية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();

            // 🧾 معلومات أساسية
            $table->string('lot_number', 50)->unique();
            $table->foreignId('product_variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // 📅 معلومات زمنية (التصنيع والانتهاء والشراء)
            $table->date('manufacturing_date')->nullable()->index()->comment('تاريخ التصنيع');
            $table->date('expiration_date')->nullable()->index()->comment('تاريخ انتهاء الصلاحية');
            $table->date('purchase_date')->index()->comment('تاريخ الشراء');

            // 💰 الأسعار والكميات
            $table->decimal('purchase_price', 15, 4)->comment('سعر الشراء للوحدة');
            $table->decimal('legal_selling_price', 15, 4)->comment('السعر القانوني للوحدة');
            $table->decimal('margin_percentage', 8, 4)->default(5.00)->comment('نسبة الهامش');
            $table->decimal('original_quantity', 15, 3)->comment('الكمية الأصلية');
            $table->decimal('remaining_quantity', 15, 3)->index()->comment('الكمية المتبقية');

            // ⚙️ أعمدة محسوبة (Computed Columns)
            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')
                    ->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')
                    ->index()
                    ->comment('هل تم استهلاك الدفعة بالكامل؟');

                $table->decimal('total_cost', 15, 4)
                    ->storedAs('original_quantity * purchase_price')
                    ->comment('إجمالي تكلفة الدفعة');

                $table->decimal('remaining_value', 15, 4)
                    ->storedAs('remaining_quantity * purchase_price')
                    ->comment('قيمة المخزون المتبقي');
            } else {
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost', 15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            // 🔗 الربط بالحركة الأصلية (لتتبع الدفعات)
$table->unsignedBigInteger('stock_movement_id') // <--- تم التغيير من foreignId
    ->nullable();

            // 🧾 رقم دفعة المورد
            $table->string('supplier_lot_number', 100)->nullable()->comment('رقم الدفعة عند المورد');

            // ⚡ الحالة
            $table->boolean('active')->default(true)->index();

            $table->timestamps();
            $table->softDeletes();

            // 📈 الفهارس المخصصة لتحسين الأداء
            $table->index(['product_variant_id', 'warehouse_id', 'is_depleted', 'purchase_date'], 'idx_fifo_lookup');
            $table->index(['active', 'remaining_quantity'], 'idx_active_stock');
        });

        // ✅ قيود التحقق (Data Validation Constraints)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE product_lots
                ADD CONSTRAINT chk_quantities
                CHECK (remaining_quantity >= 0 AND remaining_quantity <= original_quantity)
            ");
            DB::statement("
                ALTER TABLE product_lots
                ADD CONSTRAINT chk_prices
                CHECK (purchase_price > 0 AND legal_selling_price >= purchase_price)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_lots');
    }
};




// ===== ملف: 2025_10_15_093431_create_document_statuses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('document_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique(); // draft, validated, paid, cancelled
            $table->string('label', 100);
            $table->string('color', 20)->nullable(); // للواجهة
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_statuses');
    }
};




// ===== ملف: 2025_10_15_093432_create_commercial_documents_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for commercial_documents table
 *
 * Manages all commercial documents, simplified for TVA and Stamp Tax only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commercial_documents', function (Blueprint $table) {
            $table->id();

            // === Document Identification ===
            $table->foreignId('document_type_id')->constrained('document_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_document_type_id');
            $table->foreignId('numbering_series_id')->constrained('numbering_series')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_numbering_series_id');
            $table->string('document_number', 50)->unique();

            // === Related Entities & Context ===
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_user_id');
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_party_id');
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_warehouse_id');
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_fiscal_year_id');
            $table->foreignId('currency_id')->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_currency_id');
            $table->decimal('exchange_rate', 15, 8)->default(1.00);

            // === Dates ===
            $table->date('document_date');
            $table->timestampTz('issued_at')->nullable()->comment('Datetime with timezone for legal issuance time');
            $table->date('due_date')->nullable();
            $table->date('delivery_date')->nullable();

            // === Financial Totals (TVA + Stamp ONLY) ===
            $table->decimal('total_ht', 15, 4)->default(0.00)->comment('Total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00)->comment('Total VAT');
            $table->decimal('total_discount', 15, 4)->default(0.00)->comment('Total discount');
            $table->decimal('total_stamp', 15, 4)->default(0.00)->comment('Stamp tax');
            $table->decimal('total_ttc', 15, 4)->default(0.00)->comment('Total including tax');
            $table->decimal('net_to_pay', 15, 4)->default(0.00)->comment('Final amount to pay');
            $table->decimal('paid_amount', 15, 4)->default(0.00)->comment('Amount already paid');
            $table->decimal('remaining_amount', 15, 4)->default(0.00)->comment('Amount remaining');

            // === Additional Information ===
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable()->comment('Internal notes not printed');
            $table->json('payment_terms')->nullable();
            $table->json('shipping_info')->nullable();
            $table->json('legal_mentions')->nullable()->comment('Mandatory legal text for invoices');

            // === Status & Lifecycle ===
            $table->foreignId('document_status_id')
                ->nullable()
                ->constrained('document_statuses')
                ->nullOnDelete()
                ->cascadeOnUpdate()
                ->name('fk_docs_status_id');

            $table->boolean('is_locked')->default(false)->index();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_validated_by');
            $table->boolean('is_proforma')->default(false)->comment('Is this a proforma invoice?');
            $table->text('cancellation_reason')->nullable();

            // === Document Relationships ===
            $table->foreignId('source_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_source_document_id')->comment('e.g., the Sales Order that generated this Invoice');
            $table->foreignId('cancellation_of_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_cancellation_of_id')->comment('For credit notes, links to the original invoice');

            // === Compliance & Extras ===
            $table->string('qr_code_data', 500)->nullable()
                ->comment('QR code data for mobile scanning');

            $table->boolean('is_exported_to_accounting')->default(false)
                ->index()->comment('Exported to accounting system?');
            $table->timestamp('exported_at')->nullable();

            // === Audit ===
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_deleted_by');

            $table->timestamps();
            $table->softDeletes();

            // === Indexes ===
            $table->index(['party_id', 'document_type_id', 'document_date', 'document_status_id'], 'idx_docs_by_party_type_date_status');
            $table->index(['document_status_id', 'due_date', 'remaining_amount'], 'idx_docs_due_by_status_date_amount');
            $table->index(['document_status_id', 'document_date', 'party_id'], 'idx_status_date_party');
            $table->index(['warehouse_id', 'document_date', 'document_status_id'], 'idx_warehouse_date_status');
        });

        // ✅ CHECK constraints
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_payment_amounts CHECK (paid_amount <= total_ttc)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_remaining_amount CHECK (remaining_amount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_dates CHECK (due_date IS NULL OR due_date >= document_date)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_discount CHECK (total_discount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_totals CHECK (total_ttc >= 0)');
            DB::statement("ALTER TABLE commercial_documents COMMENT 'الجدول الرئيسي للمستندات التجارية (فواتير، إلخ) - نظام مبسط (TVA وطابع جبائي فقط)'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('commercial_documents');
    }
};




// ===== ملف: 2025_10_15_093437_create_commercial_document_lines_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for commercial_document_lines table (renamed from document_lines)
 *
 * Stores line items for commercial documents
 * Now linked to product_variant_id instead of product_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commercial_document_lines', function (Blueprint $table) {
            $table->id();

            // Parent document
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();

            // Product variant reference
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete()->cascadeOnUpdate();

            // Line details
            $table->unsignedSmallInteger('line_order')->default(0)->comment('Display order');
            $table->text('description')->nullable()->comment('Line description');

            // Quantities
            $table->decimal('quantity', 15, 3);
            $table->decimal('delivered_quantity', 15, 3)->default(0)->comment('Quantity delivered');
            $table->decimal('returned_quantity', 15, 3)->default(0)->comment('Quantity returned');

            // Pricing
            $table->decimal('unit_price_ht', 15, 4)->comment('Unit price excluding tax');
            $table->decimal('discount_percentage', 8, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.00);
            $table->decimal('tva_rate', 8, 2);
            $table->decimal('total_ht', 15, 4)->comment('Line total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00);
            $table->decimal('total_ttc', 15, 4)->comment('Line total including tax');

            // Lot tracking
            $table->unsignedBigInteger('stock_lot_id') // <--- تم التغيير من foreignId
                ->nullable();

            $table->boolean('is_auto_split')->default(false)
                ->index();

            $table->unsignedBigInteger('parent_line_id')->nullable();

            $table->foreign('parent_line_id')
                ->references('id')
                ->on('commercial_document_lines')
                ->restrictOnDelete(); // 🔒 منع حذف السطر الأب

            // Additional data
            $table->json('line_attributes')->nullable()->comment('Additional line attributes');

            $table->timestamps();

            // Indexes
            $table->index(['commercial_document_id', 'line_order'], 'doc_lines_doc_order_idx');
            $table->index('product_variant_id');
            $table->index('stock_lot_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commercial_document_lines');
    }
};




// ===== ملف: 2025_10_15_094100_create_treasury_accounts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for treasury_accounts table
 *
 * Manages bank and cash accounts
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->id();

            // Account information
            $table->string('name', 100);
            $table->string('code', 20)->unique()->nullable();
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used restrictOnDelete)
            $table->foreignId('treasury_account_type_id')->constrained('treasury_account_types')->restrictOnDelete()->cascadeOnUpdate();

            // Bank details (for bank accounts)
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('rib', 30)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('swift_bic', 11)->nullable();

            // Financial information
            $table->string('currency', 3)->default('DZD');
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);

            // Settings
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('active')->default(true)->index();

            // Additional information
            $table->text('notes')->nullable();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['treasury_account_type_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_accounts');
    }
};




// ===== ملف: 2025_10_15_094104_create_payment_modes_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for payment_modes table
 *
 * Defines payment methods (cash, check, transfer, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_modes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('description')->nullable();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete()->cascadeOnUpdate();

            $table->boolean('requires_reference')->default(false)->comment('Requires check number, transfer reference, etc.');
            $table->boolean('is_cash')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_modes');
    }
};




// ===== ملف: 2025_10_15_094110_create_checks_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for checks table
 *
 * Manages check payments and their lifecycle
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checks', function (Blueprint $table) {
            $table->id();

            // Check information
            $table->string('check_number', 50)->unique();
            $table->date('check_date')->comment('Issue date');
            $table->date('due_date')->nullable()->comment('Due date for post-dated checks');
            $table->decimal('amount', 15, 4);

            // Bank details
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('drawer_name', 150)->nullable()->comment('Check drawer name');

            // Party relationship
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();

            // Status tracking
            $table->string('status', 50)->default('pending')->index()->comment('pending, cleared, bounced, cancelled');
            $table->date('cleared_date')->nullable();
            $table->text('bounce_reason')->nullable();

            // Additional information
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            // Audit
            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used nullOnDelete)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();

            // Indexes
            $table->index(['status', 'due_date']);
            $table->index(['party_id', 'status']);
            $table->index('check_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checks');
    }
};




// ===== ملف: 2025_10_15_094115_create_payments_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for payments table
 *
 * Manages payment transactions
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Payment details
            $table->string('payment_number', 50)->unique()->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete()->cascadeOnUpdate()->name('fk_payments_currency_id');
            $table->decimal('amount_local', 15, 4)->nullable()->comment('Amount in base currency if payment is in foreign currency');

            // Payment method
            $table->foreignId('payment_mode_id')->constrained('payment_modes')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();

            // Check reference (if applicable)
            $table->foreignId('check_id')->nullable()->constrained('checks')->nullOnDelete()->cascadeOnUpdate();

            // Party relationship
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();

            // ⭐⭐ (تصحيح) ⭐⭐
            // تمت إضافة السنة المالية لربط الدفعات بالسنوات
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Payment information
            $table->string('reference', 100)->nullable()->comment('Check number, transfer reference, etc.');
            $table->string('bank_reference', 150)->nullable()->comment('Bank transaction reference');
            $table->text('notes')->nullable();

            // Status
            $table->string('status', 50)->default('confirmed')->index()->comment('confirmed, pending, cancelled');
            $table->boolean('is_reconciled')->default(false)->index();
            $table->date('reconciliation_date')->nullable();
            $table->timestampTz('clearing_date')->nullable()->comment('Date the payment cleared the bank');

            // User tracking
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['payment_date', 'status']);
            $table->index(['party_id', 'payment_date']);
            $table->index(['treasury_account_id', 'payment_date']);
            $table->index(['status', 'payment_date', 'treasury_account_id'], 'idx_payment_status_date_account');

            // ⭐⭐ (تصحيح) ⭐⭐
            // فهرس للسنة المالية
            $table->index(['fiscal_year_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};





// ===== ملف: 2025_10_15_094120_create_document_payment_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for document_payment pivot table
 *
 * Implements flexible many-to-many relationship between documents and payments
 * Allows a single payment to be split across multiple documents
 * and a single document to be paid by multiple payments
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();

            // ✅ CORRECTED: Added cascadeOnUpdate (user correctly used cascadeOnDelete)
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();

            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['commercial_document_id', 'payment_id']);
            $table->index('payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_payment');
    }
};




// ===== ملف: 2025_10_15_094121_create_exchange_rates_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->foreignId('to_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->decimal('rate', 15, 8);
            $table->date('rate_date')->index();
            $table->timestamps();
            $table->unique(['from_currency_id', 'to_currency_id', 'rate_date']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE exchange_rates COMMENT 'لتخزين أسعار صرف العملات اليومية'");
    }
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};




// ===== ملف: 2025_10_15_094123_create_opening_balances_stock_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * (جدول جديد)
 * إنشاء جدول الأرصدة الافتتاحية للمخزون
 * لتسجيل رصيد المخزون في بداية كل سنة مالية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_balances_stock', function (Blueprint $table) {
            $table->id();

            // الربط بالسنة المالية (يحذف الرصيد إذا حذفت السنة)
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();

            // الربط بالصنف (يمنع حذف صنف له رصيد افتتاحي)
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();

            // الربط بالمستودع (يمنع حذف مستودع له رصيد افتتاحي)
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();

            $table->decimal('opening_quantity', 15, 3);
            $table->decimal('opening_value', 15, 4)->comment('القيمة الإجمالية للمخزون الافتتاحي (PMP)');

            $table->timestamps();

            // ضمان عدم تكرار الصنف في نفس المستودع والسنة
            $table->unique(['fiscal_year_id', 'product_variant_id', 'warehouse_id'], 'opening_stock_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balances_stock');
    }
};




// ===== ملف: 2025_10_15_094126_create_expense_categories_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for expense_categories table
 *
 * Categorizes business expenses for better tracking and reporting
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique()->nullable();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('expense_categories')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};




// ===== ملف: 2025_10_15_094131_create_expenses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for expenses table
 *
 * Tracks business expenses and operational costs
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            // Expense details
            $table->string('expense_number', 50)->unique()->nullable();
            $table->date('date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();

            // ⭐ السنة المالية ⭐
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();

            // Payment information
            $table->foreignId('payment_mode_id')->nullable()->constrained('payment_modes')->nullOnDelete();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete();

            // Supplier/Party (optional)
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete();

            // Description and reference
            $table->text('description')->nullable();
            $table->string('reference', 100)->nullable()->comment('Invoice number, receipt number, etc.');

            // Attachments tracking
            $table->boolean('has_attachments')->default(false);

            // Status
            $table->string('status', 50)->default('confirmed')->index();
            $table->boolean('is_paid')->default(true)->index();
            $table->boolean('is_recurring')->default(false);

            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['date', 'status']);
            $table->index(['expense_category_id', 'date']);
            $table->index(['party_id', 'date']);

            // ⭐ فهرس للسنة المالية ⭐
            $table->index(['fiscal_year_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};





// ===== ملف: 2025_10_15_094133_create_opening_balances_parties_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * (جدول جديد)
 * إنشاء جدول الأرصدة الافتتاحية للأطراف (عملاء وموردون)
 * لتسجيل رصيد الدين/المستحقات في بداية كل سنة مالية
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_balances_parties', function (Blueprint $table) {
            $table->id();

            // الربط بالسنة المالية (يحذف الرصيد إذا حذفت السنة)
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();

            // الربط بالطرف (يمنع حذف طرف له رصيد افتتاحي)
            $table->foreignId('party_id')->constrained('parties')->restrictOnDelete();

            // الرصيد الافتتاحي
            $table->decimal('opening_balance', 15, 4);
            $table->enum('balance_type', ['debit', 'credit'])->comment('debit = رصيد مدين, credit = رصيد دائن');

            $table->timestamps();

            // ضمان عدم تكرار الطرف في نفس السنة
            $table->unique(['fiscal_year_id', 'party_id'], 'opening_party_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_balances_parties');
    }
};




// ===== ملف: 2025_10_15_094134_create_attachments_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for attachments table
 *
 * Polymorphic attachment system for any entity
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            // File information
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 50)->nullable()->comment('MIME type');
            $table->string('file_extension', 10)->nullable();
            $table->unsignedBigInteger('file_size')->nullable()->comment('Size in bytes');

            // Polymorphic relationship
            $table->morphs('attachable');

            // Attachment metadata
            $table->string('title', 200)->nullable();
            $table->text('description')->nullable();
            $table->string('category', 50)->nullable()->index();

            // Security and access
            $table->boolean('is_public')->default(false)->index();
            $table->string('disk', 50)->default('local');

            // Audit
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['attachable_type', 'attachable_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};




// ===== ملف: 2025_10_15_094140_create_audits_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for audits table
 *
 * Comprehensive audit trail for tracking all changes in the system
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();

            // User information
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_type', 100)->nullable();

            // Event information
            $table->string('event', 50)->index()->comment('created, updated, deleted, etc.');

            // Auditable model (polymorphic)
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');

            // Changed data
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Request information
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 1023)->nullable();

            // Additional context
            $table->json('tags')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};




// ===== ملف: 2025_10_15_094145_create_settings_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for settings table
 *
 * Stores application-wide configuration settings
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('group', 50)->default('general')->index();
            $table->json('value')->nullable();
            $table->string('type', 50)->default('string')->comment('string, integer, boolean, json, etc.');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false)->comment('Can be accessed without authentication');
            $table->boolean('is_editable')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['group', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};




// ===== ملف: 2025_10_15_094149_create_notifications_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for notifications table
 *
 * Laravel's built-in notification system
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};




// ===== ملف: 2025_10_15_094157_create_personal_access_tokens_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for personal_access_tokens table
 *
 * Laravel Sanctum API authentication tokens
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};




// ===== ملف: 2025_10_21_115346_create_employees_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('matricule', 20)->unique(); // رقم التسجيل
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // معلومات شخصية
            $table->string('first_name');
            $table->string('last_name');
            $table->string('nss', 20)->unique()->comment('رقم الضمان الاجتماعي');
            $table->date('birth_date');
            $table->foreignId('gender_id')->constrained();

            // معلومات بنكية
            $table->string('rib', 30)->nullable();
            $table->string('bank_name', 100)->nullable();

            // معلومات إدارية
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->enum('employment_status', ['active', 'suspended', 'terminated'])->default('active');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};




// ===== ملف: 2025_10_21_115441_create_employment_contracts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('employment_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('contract_type', ['cdi', 'cdd', 'pre_emploi', 'stage']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('base_salary', 15, 4)->comment('الراتب الأساسي');
            $table->string('job_title');
            $table->string('department')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employment_contracts');
    }
};




// ===== ملف: 2025_10_23_135226_add_foreing_keys.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to add foreign keys that caused circular dependencies
 * (stock_movements, commercial_document_lines, product_lots).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. ربط stock_lot_id في commercial_document_lines
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('stock_lot_id')
                ->references('id')
                ->on('product_lots')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        // 2. ربط commercial_document_line_id و stock_lot_id في stock_movements
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreign('commercial_document_line_id')
                ->references('id')
                ->on('commercial_document_lines')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('stock_lot_id')
                ->references('id')
                ->on('product_lots')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        // 3. ربط stock_movement_id في product_lots
        Schema::table('product_lots', function (Blueprint $table) {
            $table->foreign('stock_movement_id')
                ->references('id')
                ->on('stock_movements')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropForeign(['stock_lot_id']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['commercial_document_line_id']);
            $table->dropForeign(['stock_lot_id']);
        });

        Schema::table('product_lots', function (Blueprint $table) {
            $table->dropForeign(['stock_movement_id']);
        });
    }
};




// ===== ملف: 2026_04_13_092026_alter_users_table_make_password_nullable.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('password')->nullable()->change();
    });
}

    /**
     * Reverse the migrations.
     */
public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('password')->nullable(false)->change();
    });
}
};




// ===== ملف: 2026_04_15_000001_create_login_attempts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email')->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->boolean('success')->default(false)->index();
            $table->timestamp('attempted_at')->index();

            $table->index(['email', 'attempted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
    }
};

