<?php

// دمج تلقائي لكل ملفات الـ migrations



// ===== ملف: 0001_01_01_000000_create_users_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};




// ===== ملف: 0001_01_01_000001_create_cache_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};




// ===== ملف: 0001_01_01_000002_create_jobs_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('failed_jobs');
    }
};




// ===== ملف: 2025_10_15_093100_create_companies_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug')->unique();
            $table->text('activity')->nullable()->comment('Commercial activity description');
            $table->string('rc', 50)->nullable()->comment('السجل التجاري');
            $table->string('nif', 50)->unique()->nullable()->comment('Numéro d\'Identification Fiscale رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable()->comment('رقم التعريف الإحصائي');
            $table->string('ai', 50)->nullable()->comment('المادة الجبائية');
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable()->comment('رأس المال');
            $table->date('rc_date')->nullable()->comment('تاريخ السجل التجاري');
            $table->text('address')->nullable();
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_companies_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable()->comment('Bank account number');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('active')->default(true);

            // إدارة الحالة والخطط
            $table->timestamp('suspended_at')->nullable()->comment('تاريخ التعليق المؤقت');
            $table->string('suspension_reason', 500)->nullable();
            $table->foreignId('suspended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deactivated_at')->nullable();
            $table->foreignId('deactivated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('plan', 30)->default('free');
            $table->timestamp('trial_ends_at')->nullable();
            $table->unsignedSmallInteger('max_users')->default(3);
            $table->unsignedSmallInteger('max_warehouses')->default(1);
            $table->unsignedInteger('max_products')->default(500);
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('settings_json')->nullable();

            // تدقيق
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();

            $table->timestamps();
            $table->softDeletes();

            $table->index('plan');
            $table->index('suspended_at');
            $table->index('verified_at');
            $table->index('trial_ends_at');
        });

        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_default')->default(false);
            $table->string('role', 30)->default('member');
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('joined_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
            $table->index(['company_id', 'role']);
            $table->index(['company_id', 'active']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('company_user');
        Schema::dropIfExists('companies');
    }
};




// ===== ملف: 2025_10_15_093158_create_genders_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('genders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('genders');
    }
};




// ===== ملف: 2025_10_15_093204_create_document_base_operations_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_base_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_base_operations');
    }
};




// ===== ملف: 2025_10_15_093204_create_party_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('party_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('party_types');
    }
};




// ===== ملف: 2025_10_15_093205_create_product_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('manages_stock')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_types');
    }
};




// ===== ملف: 2025_10_15_093209_create_wilayas_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('wilayas');
    }
};




// ===== ملف: 2025_10_15_093215_create_communes_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->string('post_code', 10)->nullable()->index();
            $table->string('name', 100);
            $table->string('arabic_name', 100);
            $table->foreignId('wilaya_id')->constrained('wilayas')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->index('name');
            $table->index('arabic_name');
            $table->index(['latitude', 'longitude']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('communes');
    }
};




// ===== ملف: 2025_10_15_093216_create_price_levels_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('price_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false)->index()->comment('التعريفة الافتراضية عند إنشاء زبون جديد');
            $table->boolean('is_percentage')->default(false)->comment('هل التعريفة نسبية على سعر الشراء');
            $table->decimal('value', 8, 2)->nullable()->comment('قيمة النسبة أو المبلغ الإضافي');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('price_levels');
    }
};




// ===== ملف: 2025_10_15_093217_create_stock_movement_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('stock_movement_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->smallInteger('direction')->default(0)->comment('-1 for out, 0 for neutral, 1 for in');
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('stock_movement_types');
    }
};




// ===== ملف: 2025_10_15_093218_create_treasury_account_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('treasury_account_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('treasury_account_types');
    }
};




// ===== ملف: 2025_10_15_093221_create_permission_tables.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teams = config('permission.teams');

        Schema::create($tableNames['permissions'], function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')
                ->nullable()                          // ← السماح بالقيم الفارغة
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('name', 125);
            $table->string('guard_name', 125);
            $table->string('display_name')->nullable();
            $table->string('group', 100)->nullable()->index();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'name', 'guard_name']);
            $table->index('company_id');
        });

        Schema::create($tableNames['roles'], function (Blueprint $table) use ($teams, $columnNames) {
            $table->id();
            $table->foreignId('company_id')
                ->nullable()                          // ← السماح بالقيم الفارغة
                ->constrained('companies')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key'])->nullable()->index();
            }
            $table->string('name', 125);
            $table->string('guard_name', 125);
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            if ($teams) {
                $table->unique([$columnNames['team_foreign_key'], 'company_id', 'name', 'guard_name']);
            } else {
                $table->unique(['company_id', 'name', 'guard_name']);
            }
            $table->index('company_id');
        });

        Schema::create($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames, $teams) {
            $permissionColumn = $columnNames['permission_pivot_key'] ?? 'permission_id';
            $table->foreignId($permissionColumn)->constrained($tableNames['permissions'])->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete()->cascadeOnUpdate();
            $table->index('company_id');
            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key']);
                $table->index($columnNames['team_foreign_key'], 'model_has_permissions_team_foreign_key_index');
                $table->primary([$columnNames['team_foreign_key'], $permissionColumn, $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
            } else {
                $table->primary([$permissionColumn, $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
            }
        });

        Schema::create($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $columnNames, $teams) {
            $roleColumn = $columnNames['role_pivot_key'] ?? 'role_id';
            $table->foreignId($roleColumn)->constrained($tableNames['roles'])->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('model_type');
            $table->unsignedBigInteger($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete()->cascadeOnUpdate();
            $table->index('company_id');
            if ($teams) {
                $table->foreignId($columnNames['team_foreign_key']);
                $table->index($columnNames['team_foreign_key'], 'model_has_roles_team_foreign_key_index');
                $table->primary([$columnNames['team_foreign_key'], $roleColumn, $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
            } else {
                $table->primary([$roleColumn, $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
            }
        });

        Schema::create($tableNames['role_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames) {
            $permissionColumn = $columnNames['permission_pivot_key'] ?? 'permission_id';
            $roleColumn = $columnNames['role_pivot_key'] ?? 'role_id';
            $table->foreignId($permissionColumn)->constrained($tableNames['permissions'])->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId($roleColumn)->constrained($tableNames['roles'])->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete()->cascadeOnUpdate();
            $table->index('company_id');
            $table->primary([$permissionColumn, $roleColumn], 'role_has_permissions_permission_id_role_id_primary');
        });

        app('cache')->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
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

return new class extends Migration {
    public function up(): void {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false)->index();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('is_current')->default(false)->index();
            $table->text('closing_notes')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
            $table->index(['company_id', 'is_current']);
            $table->index(['company_id', 'start_date', 'end_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('fiscal_years');
    }
};




// ===== ملف: 2025_10_15_093229_create_currencies_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 3);
            $table->string('symbol', 10);
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->boolean('is_base_currency')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE currencies COMMENT 'لإدارة العملات المختلفة المستخدمة في النظام'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('currencies');
    }
};




// ===== ملف: 2025_10_15_093236_create_legal_forms_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('legal_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('code', 20);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('requires_capital')->default(true);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE legal_forms COMMENT 'الأشكال القانونية للشركات حسب القانون الجزائري'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('legal_forms');
    }
};




// ===== ملف: 2025_10_15_093237_create_warehouses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate();
            $table->string('phone', 20)->nullable();
            $table->string('manager_name', 100)->nullable();
            $table->text('activity')->nullable();
            $table->string('rc', 50)->nullable();
            $table->string('nif', 50)->nullable();
            $table->string('nis', 50)->nullable();
            $table->string('ai', 50)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('warehouses');
    }
};




// ===== ملف: 2025_10_15_093242_create_parties_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_type_id')->constrained('party_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_parties_party_type_id');
            $table->string('code', 50)->nullable();
            $table->string('name', 150);
            $table->string('commercial_name', 150)->nullable();
            $table->string('slug');
            $table->text('activity')->nullable();
            $table->string('rc', 50)->nullable();
            $table->string('nif', 50)->nullable()->index()->comment('رقم التعريف الجبائي');
            $table->string('nis', 50)->nullable();
            $table->string('ai', 50)->nullable();
            $table->foreignId('legal_form_id')->nullable()->constrained('legal_forms')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_legal_form_id');
            $table->decimal('capital_amount', 15, 4)->nullable();
            $table->date('rc_date')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('commune_id')->nullable()->constrained('communes')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_commune_id');
            $table->foreignId('wilaya_id')->nullable()->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_wilaya_id');
            $table->string('phone', 20)->nullable()->index();
            $table->string('mobile', 30)->nullable();
            $table->string('fax', 30)->nullable();
            $table->string('email', 100)->nullable()->index();
            $table->string('avatar')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('rib', 30)->nullable();
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('credit_limit', 15, 4)->default(0.00);
            $table->foreignId('default_price_level_id')->nullable()->constrained('price_levels')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_price_level_id');
            $table->unsignedInteger('credit_days')->nullable();
            $table->boolean('is_tva_exempt')->default(false)->index();
            $table->boolean('is_taxable')->default(true)->index();
            $table->string('tax_option', 50)->nullable();
            $table->string('cnas_number', 50)->nullable();
            $table->string('tax_regime', 50)->nullable()->comment('forfaitaire | réel');
            $table->boolean('is_final_consumer')->default(false);
            $table->boolean('is_vat_registered')->default(false);
            $table->date('vat_registration_date')->nullable();
            $table->json('additional_data')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_parties_deleted_by');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->unique(['company_id', 'slug']);
            $table->unique(['company_id', 'nif']);
            $table->unique(['company_id', 'email']);
            $table->index(['name', 'commercial_name']);
            $table->index(['party_type_id', 'active']);

            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'commercial_name', 'email', 'phone']);
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE parties COMMENT 'لإدارة الأطراف (عملاء، موردون) مع المعلومات القانونية الجزائرية'");
        }
    }

    public function down(): void {
        Schema::dropIfExists('parties');
    }
};




// ===== ملف: 2025_10_15_093247_create_families_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('slug')->unique()->nullable();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['company_id', 'name']);
            $table->index(['parent_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('families');
    }
};




// ===== ملف: 2025_10_15_093252_create_brands_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->string('website', 255)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('brands');
    }
};




// ===== ملف: 2025_10_15_093257_create_units_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('symbol', 20)->nullable()->comment('Unit symbol (e.g., kg, m, l)');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('units');
    }
};




// ===== ملف: 2025_10_15_093302_create_tvas_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tvas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->decimal('rate', 8, 2)->default(0.00)->comment('VAT rate percentage');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_default')->default(false)->index()->comment('Default VAT rate');
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name', 'rate']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('tvas');
    }
};




// ===== ملف: 2025_10_15_093306_create_fiscal_stamps_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('fiscal_stamps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name');
            $table->decimal('min_amount', 15, 4)->comment('الحد الأدنى للمبلغ لتطبيق الطابع');
            $table->decimal('max_amount', 15, 4)->nullable()->comment('الحد الأقصى للمبلغ');
            $table->decimal('stamp_value', 15, 4)->comment('قيمة الطابع الجبائي');
            $table->enum('type', ['fixed', 'percentage'])->default('fixed')->comment('نوع الطابع: ثابت أو نسبة مئوية');
            $table->boolean('active')->default(true)->index();
            $table->date('valid_from');
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE fiscal_stamps COMMENT 'لإدارة قيم وقواعد تطبيق الطابع الجبائي'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('fiscal_stamps');
    }
};




// ===== ملف: 2025_10_15_093307_create_inventory_valuation_methods_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('inventory_valuation_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->enum('method', ['fifo', 'lifo', 'weighted_average'])->default('fifo');
            $table->boolean('is_default')->default(false);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('inventory_valuation_methods');
    }
};




// ===== ملف: 2025_10_15_093308_create_products_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 150);
            $table->string('slug', 150)->nullable()->index();
            $table->string('ref', 50)->nullable()->index()->comment('SKU / مرجع المنتج');
            $table->string('barcode', 50)->nullable()->index()->comment('الباركود');
            $table->text('description')->nullable();
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_type_id')->nullable()->constrained('product_types')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('tva_id')->nullable()->constrained('tvas')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete()->cascadeOnUpdate();
            $table->decimal('purchase_price_ht', 15, 4)->default(0)->comment('سعر الشراء الأساسي');
            $table->decimal('current_cost_price', 15, 4)->default(0)->comment('آخر تكلفة محسوبة (PMP/FIFO/LIFO)');
            $table->boolean('manages_stock')->default(true);
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('has_lots')->default(false);
            $table->boolean('has_expiration_date')->default(false);
            $table->decimal('min_stock_alert', 15, 4)->default(0);
            $table->decimal('max_stock_alert', 15, 4)->default(0);
            $table->boolean('manages_quantity_discounts')->default(false);
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('volume', 8, 2)->nullable();
            $table->decimal('length', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->foreignId('valuation_method_id')->nullable()->constrained('inventory_valuation_methods')->nullOnDelete()->cascadeOnUpdate();
            $table->json('specifications')->nullable()->comment('خصائص تقنية مرنة');
            $table->json('images')->nullable();
            $table->string('meta_title', 200)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('meta_keywords')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'active']);
            $table->index(['company_id', 'name', 'active']);
            $table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
            $table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');

            if (app()->environment() !== 'testing' && DB::getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'description']);
            }
        });
    }
    public function down(): void {
        Schema::dropIfExists('products');
    }
};




// ===== ملف: 2025_10_15_093421_create_document_types_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('name_latin', 100);
            $table->string('code', 20);
            $table->text('description')->nullable();
            $table->foreignId('document_base_operation_id')->constrained('document_base_operations')->restrictOnDelete()->cascadeOnUpdate();
            $table->smallInteger('affects_stock_direction')->default(0)->comment('-1 for stock out, 0 for no effect, 1 for stock in');
            $table->boolean('requires_party')->default(true)->comment('Requires customer/supplier');
            $table->boolean('affects_accounting')->default(true);
            $table->boolean('is_printable')->default(true);
            $table->string('print_template', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'name_latin']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_types');
    }
};




// ===== ملف: 2025_10_15_093426_create_numbering_series_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('numbering_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->cascadeOnDelete()->cascadeOnUpdate()->name('fk_series_document_type_id');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete()->cascadeOnUpdate()->name('fk_series_warehouse_id');
            $table->string('prefix', 20);
            $table->string('suffix', 20)->nullable();
            $table->string('format', 100)->comment('{PREFIX}{YY}{MONTH}{NUMBER:6}');
            $table->unsignedBigInteger('last_number')->default(0);
            $table->unsignedInteger('padding')->default(6);
            $table->unsignedBigInteger('start_number')->default(1);
            $table->unsignedBigInteger('max_number')->nullable();
            $table->boolean('reset_yearly')->default(false);
            $table->boolean('reset_monthly')->default(false);
            $table->unsignedSmallInteger('current_year')->nullable();
            $table->unsignedTinyInteger('current_month')->nullable();
            $table->date('reset_date')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->boolean('is_locked')->default(false)->index();
            $table->timestamps();

            $table->unique(['company_id', 'document_type_id', 'warehouse_id', 'prefix'], 'numbering_series_company_unique');
            $table->index(['document_type_id', 'warehouse_id', 'prefix'], 'idx_series_lookup');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE numbering_series COMMENT 'يدير سلاسل الترقيم التلقائي للمستندات المختلفة'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('numbering_series');
    }
};




// ===== ملف: 2025_10_15_093431_create_document_statuses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->string('color', 20)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_statuses');
    }
};




// ===== ملف: 2025_10_15_093432_create_commercial_documents_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commercial_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_document_type_id');
            $table->foreignId('numbering_series_id')->constrained('numbering_series')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_numbering_series_id');
            $table->string('document_number', 50);
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_user_id');
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_party_id');
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_warehouse_id');
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_fiscal_year_id');
            $table->foreignId('currency_id')->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_currency_id');
            $table->decimal('exchange_rate', 15, 8)->default(1.00);
            $table->date('document_date');
            $table->timestampTz('issued_at')->nullable()->comment('Datetime with timezone for legal issuance time');
            $table->date('due_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->decimal('total_ht', 15, 4)->default(0.00)->comment('Total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00)->comment('Total VAT');
            $table->decimal('total_discount', 15, 4)->default(0.00)->comment('Total discount');
            $table->decimal('total_stamp', 15, 4)->default(0.00)->comment('Stamp tax');
            $table->decimal('total_ttc', 15, 4)->default(0.00)->comment('Total including tax');
            $table->decimal('net_to_pay', 15, 4)->default(0.00)->comment('Final amount to pay');
            $table->decimal('paid_amount', 15, 4)->default(0.00)->comment('Amount already paid');
            $table->decimal('remaining_amount', 15, 4)->default(0.00)->comment('Amount remaining');
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable()->comment('Internal notes not printed');
            $table->json('payment_terms')->nullable();
            $table->json('shipping_info')->nullable();
            $table->json('legal_mentions')->nullable()->comment('Mandatory legal text for invoices');
            $table->foreignId('document_status_id')->nullable()->constrained('document_statuses')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_status_id');
            $table->foreignId('fiscal_stamp_id')->nullable()->constrained('fiscal_stamps')->nullOnDelete();
            $table->boolean('is_locked')->default(false)->index();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_validated_by');
            $table->boolean('is_proforma')->default(false)->comment('Is this a proforma invoice?');
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('source_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_source_document_id');
            $table->foreignId('cancellation_of_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_cancellation_of_id');
            $table->string('qr_code_data', 500)->nullable();
            $table->boolean('is_exported_to_accounting')->default(false)->index()->comment('Exported to accounting system?');
            $table->timestamp('exported_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_deleted_by');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'document_number']);
            $table->index(['company_id', 'party_id', 'document_type_id', 'document_date', 'document_status_id'], 'idx_docs_by_party_type_date_status');
            $table->index(['company_id', 'document_status_id', 'due_date', 'remaining_amount'], 'idx_docs_due_by_status_date_amount');
            $table->index(['company_id', 'document_status_id', 'document_date', 'party_id'], 'idx_status_date_party');
            $table->index(['company_id', 'warehouse_id', 'document_date', 'document_status_id'], 'idx_warehouse_date_status');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_payment_amounts CHECK (paid_amount <= total_ttc)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_remaining_amount CHECK (remaining_amount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_dates CHECK (due_date IS NULL OR due_date >= document_date)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_discount CHECK (total_discount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_totals CHECK (total_ttc >= 0)');
            DB::statement("ALTER TABLE commercial_documents COMMENT 'الجدول الرئيسي للمستندات التجارية (فواتير، إلخ) - نظام مبسط (TVA وطابع جبائي فقط)'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('commercial_documents');
    }
};




// ===== ملف: 2025_10_15_093437_create_commercial_document_lines_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commercial_document_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->unsignedSmallInteger('line_order')->default(0)->comment('ترتيب العرض');
            $table->text('description')->nullable()->comment('وصف إضافي للسطر');
            $table->decimal('quantity', 15, 3);
            $table->decimal('delivered_quantity', 15, 3)->default(0)->comment('الكمية المستلمة/المسلمة');
            $table->decimal('returned_quantity', 15, 3)->default(0)->comment('الكمية المرتجعة');
            $table->decimal('unit_price_ht', 15, 4)->comment('سعر الوحدة قبل الضريبة');
            $table->decimal('discount_percentage', 8, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.00);
            $table->decimal('tva_rate', 8, 2)->comment('نسبة القيمة المضافة');
            $table->decimal('total_ht', 15, 4)->comment('المجموع الصافي قبل الضريبة');
            $table->decimal('total_tva', 15, 4)->default(0.00);
            $table->decimal('total_ttc', 15, 4)->comment('المجموع النهائي شامل الضريبة');
            $table->json('additional_costs')->nullable()->comment('تكاليف إضافية مرتبطة بالسطر');
            $table->decimal('total_additional_cost', 15, 4)->default(0)->comment('مجموع التكاليف');
            $table->decimal('total_discount_amount', 15, 4)->default(0)->comment('مجموع الخصومات');
            $table->unsignedBigInteger('stock_lot_id')->nullable();
            $table->boolean('is_auto_split')->default(false)->index();
            $table->unsignedBigInteger('parent_line_id')->nullable();
            $table->foreign('parent_line_id')->references('id')->on('commercial_document_lines')->restrictOnDelete();
            $table->json('line_attributes')->nullable()->comment('خصائص إضافية للسطر');
            $table->timestamps();

            $table->index(['company_id', 'commercial_document_id', 'line_order'], 'idx_cdl_doc_order');
            $table->index(['company_id', 'product_id'], 'idx_cdl_product');
            $table->index('stock_lot_id', 'idx_cdl_lot');
        });
    }
    public function down(): void {
        Schema::dropIfExists('commercial_document_lines');
    }
};




// ===== ملف: 2025_10_15_094100_create_treasury_accounts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable()->index();
            $table->foreignId('treasury_account_type_id')->constrained('treasury_account_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('rib', 30)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('swift_bic', 11)->nullable();
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('initial_balance', 15, 4)->default(0.00);
            $table->decimal('current_balance', 15, 4)->default(0.00);
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'treasury_account_type_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('treasury_accounts');
    }
};




// ===== ملف: 2025_10_15_094104_create_payment_modes_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payment_modes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('requires_reference')->default(false);
            $table->boolean('is_cash')->default(false)->index();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payment_modes');
    }
};




// ===== ملف: 2025_10_15_094110_create_checks_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('check_number', 50)->index();
            $table->date('check_date')->comment('Issue date');
            $table->date('due_date')->nullable()->comment('Due date for post-dated checks');
            $table->decimal('amount', 15, 4);
            $table->string('bank_name', 100)->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('drawer_name', 150)->nullable();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();
            $table->string('status', 50)->default('pending')->index()->comment('pending, cleared, bounced, cancelled');
            $table->date('cleared_date')->nullable();
            $table->text('bounce_reason')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['company_id', 'check_number']);
            $table->index(['company_id', 'status', 'due_date']);
            $table->index(['company_id', 'party_id', 'status']);
            $table->index(['company_id', 'check_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('checks');
    }
};




// ===== ملف: 2025_10_15_094115_create_payments_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('payment_number', 50)->unique()->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete()->cascadeOnUpdate()->name('fk_payments_currency_id');
            $table->decimal('amount_local', 15, 4)->nullable()->comment('Amount in base currency');
            $table->foreignId('payment_mode_id')->constrained('payment_modes')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('check_id')->nullable()->constrained('checks')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('reference', 100)->nullable()->comment('Check number, transfer reference, etc.');
            $table->string('bank_reference', 150)->nullable()->comment('Bank transaction reference');
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('confirmed')->index()->comment('confirmed, pending, cancelled');
            $table->boolean('is_reconciled')->default(false)->index();
            $table->date('reconciliation_date')->nullable();
            $table->timestampTz('clearing_date')->nullable()->comment('Date the payment cleared the bank');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'payment_date', 'status']);
            $table->index(['company_id', 'party_id', 'payment_date']);
            $table->index(['company_id', 'treasury_account_id', 'payment_date']);
            $table->index(['company_id', 'status', 'payment_date', 'treasury_account_id'], 'idx_payment_status_date_account');
            $table->index(['company_id', 'fiscal_year_id', 'payment_date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('payments');
    }
};




// ===== ملف: 2025_10_15_094120_create_document_payment_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'commercial_document_id', 'payment_id']);
            $table->index('payment_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_payment');
    }
};




// ===== ملف: 2025_10_15_094121_create_exchange_rates_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('from_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->foreignId('to_currency_id')->constrained('currencies')->cascadeOnDelete();
            $table->decimal('rate', 15, 8);
            $table->date('rate_date')->index();
            $table->timestamps();
            $table->unique(['company_id', 'from_currency_id', 'to_currency_id', 'rate_date']);
        });
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE exchange_rates COMMENT 'لتخزين أسعار صرف العملات اليومية'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('exchange_rates');
    }
};




// ===== ملف: 2025_10_15_094123_create_opening_balances_stock_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('opening_balances_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->decimal('opening_quantity', 15, 3)->default(0);
            $table->decimal('opening_value', 15, 4)->comment('القيمة الإجمالية للمخزون الافتتاحي (PMP) عند بداية السنة');
            $table->string('lot_number', 100)->nullable();
            $table->date('manufacturing_date')->nullable();
            $table->date('expiration_date')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'], 'obs_year_product_wh_unique');
            $table->index(['company_id', 'product_id', 'warehouse_id'], 'idx_obs_product_warehouse');
        });
    }
    public function down(): void {
        Schema::dropIfExists('opening_balances_stock');
    }
};




// ===== ملف: 2025_10_15_094126_create_expense_categories_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('code', 20)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('expense_categories')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'code']);
            $table->index(['parent_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('expense_categories');
    }
};




// ===== ملف: 2025_10_15_094131_create_expenses_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('expense_number', 50)->unique()->nullable();
            $table->date('date');
            $table->decimal('amount', 15, 4);
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_mode_id')->nullable()->constrained('payment_modes')->nullOnDelete();
            $table->foreignId('treasury_account_id')->nullable()->constrained('treasury_accounts')->nullOnDelete();
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('reference', 100)->nullable()->comment('Invoice number, receipt number, etc.');
            $table->boolean('has_attachments')->default(false);
            $table->string('status', 50)->default('confirmed')->index();
            $table->boolean('is_paid')->default(true)->index();
            $table->boolean('is_recurring')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'date', 'status']);
            $table->index(['company_id', 'expense_category_id', 'date']);
            $table->index(['company_id', 'party_id', 'date']);
            $table->index(['company_id', 'fiscal_year_id', 'date']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('expenses');
    }
};




// ===== ملف: 2025_10_15_094133_create_opening_balances_parties_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('opening_balances_parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->cascadeOnDelete();
            $table->foreignId('party_id')->constrained('parties')->restrictOnDelete();
            $table->decimal('opening_balance', 15, 4);
            $table->enum('balance_type', ['debit', 'credit'])->comment('debit = رصيد مدين, credit = رصيد دائن');
            $table->timestamps();
            $table->unique(['company_id', 'fiscal_year_id', 'party_id'], 'opening_party_unique');
        });
    }
    public function down(): void {
        Schema::dropIfExists('opening_balances_parties');
    }
};




// ===== ملف: 2025_10_15_094134_create_attachments_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type', 50)->nullable()->comment('MIME type');
            $table->string('file_extension', 10)->nullable();
            $table->unsignedBigInteger('file_size')->nullable()->comment('Size in bytes');
            $table->morphs('attachable');
            $table->string('title', 200)->nullable();
            $table->text('description')->nullable();
            $table->string('category', 50)->nullable()->index();
            $table->boolean('is_public')->default(false)->index();
            $table->string('disk', 50)->default('local');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['attachable_type', 'attachable_id', 'category']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('attachments');
    }
};




// ===== ملف: 2025_10_15_094140_create_audits_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_type', 100)->nullable();
            $table->string('event', 50)->index()->comment('created, updated, deleted, etc.');
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 1023)->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['user_id', 'created_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('audits');
    }
};




// ===== ملف: 2025_10_15_094145_create_settings_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate()->comment('NULL = إعداد عام للنظام');
            $table->string('key', 100);
            $table->string('group', 50)->default('general')->index();
            $table->json('value')->nullable();
            $table->string('type', 50)->default('string')->comment('string, integer, boolean, json');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_editable')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'key'], 'settings_company_key_unique');
            $table->index(['group', 'key']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('settings');
    }
};




// ===== ملف: 2025_10_15_094149_create_notifications_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['company_id', 'notifiable_type', 'notifiable_id'], 'notifications_company_notifiable_idx');
            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('notifications');
    }
};




// ===== ملف: 2025_10_15_094157_create_personal_access_tokens_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('personal_access_tokens');
    }
};




// ===== ملف: 2025_10_21_115346_create_employees_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('matricule', 20)->index()->comment('رقم التسجيل الداخلي');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('nss', 20)->nullable()->index()->comment('رقم الضمان الاجتماعي');
            $table->date('birth_date')->nullable();
            $table->foreignId('gender_id')->nullable()->constrained('genders')->nullOnDelete()->cascadeOnUpdate();
            $table->string('rib', 30)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->date('hire_date')->nullable();
            $table->date('termination_date')->nullable();
            $table->string('employment_status', 30)->default('active')->index()->comment('active | suspended | terminated');
            $table->boolean('active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'matricule'], 'employees_company_matricule_unique');
            $table->unique(['company_id', 'nss'], 'employees_company_nss_unique');
        });
    }
    public function down(): void {
        Schema::dropIfExists('employees');
    }
};




// ===== ملف: 2025_10_21_115441_create_employment_contracts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('employment_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('contract_type', ['cdi', 'cdd', 'pre_emploi', 'stage']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('base_salary', 15, 4)->comment('الراتب الأساسي');
            $table->string('job_title');
            $table->string('department')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index('company_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('employment_contracts');
    }
};




// ===== ملف: 2026_04_13_092026_alter_users_table_make_password_nullable.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
        });
    }
    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
        });
    }
};




// ===== ملف: 2026_04_15_000001_create_login_attempts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
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
    public function down(): void {
        Schema::dropIfExists('login_attempts');
    }
};




// ===== ملف: 2026_04_23_182757_create_telescope_entries_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function getConnection(): ?string {
        return config('telescope.storage.database.connection');
    }

    public function up(): void {
        $schema = Schema::connection($this->getConnection());

        $schema->create('telescope_entries', function (Blueprint $table) {
            $table->bigIncrements('sequence');
            $table->uuid('uuid');
            $table->uuid('batch_id');
            $table->string('family_hash')->nullable();
            $table->boolean('should_display_on_index')->default(true);
            $table->string('type', 20);
            $table->longText('content');
            $table->dateTime('created_at')->nullable();
            $table->unique('uuid');
            $table->index('batch_id');
            $table->index('family_hash');
            $table->index('created_at');
            $table->index(['type', 'should_display_on_index']);
        });

        $schema->create('telescope_entries_tags', function (Blueprint $table) {
            $table->uuid('entry_uuid');
            $table->string('tag');
            $table->primary(['entry_uuid', 'tag']);
            $table->index('tag');
            $table->foreign('entry_uuid')->references('uuid')->on('telescope_entries')->cascadeOnDelete();
        });

        $schema->create('telescope_monitoring', function (Blueprint $table) {
            $table->string('tag')->primary();
        });
    }

    public function down(): void {
        $schema = Schema::connection($this->getConnection());
        $schema->dropIfExists('telescope_entries_tags');
        $schema->dropIfExists('telescope_entries');
        $schema->dropIfExists('telescope_monitoring');
    }
};




// ===== ملف: 2026_04_28_184027_create_product_packagings_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_packagings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('code', 20)->comment('UN / FD / PLT');
            $table->string('label', 100)->comment('قارورة / فاردو / باليطة');
            $table->decimal('quantity', 15, 4)->default(1)->comment('عدد الوحدات الأساسية في هذه التعبئة');
            $table->string('barcode', 50)->nullable()->index()->comment('باركود خاص بهذه التعبئة');
            $table->boolean('is_default')->default(false)->comment('الوحدة الأساسية (quantity=1)');
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'code'], 'product_packaging_code_unique');
            $table->unique(['company_id', 'barcode'], 'packagings_company_barcode_unique');
            $table->index(['company_id', 'product_id', 'active']);
            $table->index(['company_id', 'product_id', 'is_default']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_packagings');
    }
};




// ===== ملف: 2026_04_28_184054_create_product_prices_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('pricing_method', ['fixed', 'rate', 'margin'])->default('fixed')->comment('fixed=سعر مباشر | rate=نسبة% فوق الشراء | margin=هامش ثابت دج');
            $table->decimal('price', 15, 4)->nullable()->comment('Prix de Vente HT — للطريقة fixed فقط');
            $table->decimal('rate', 8, 4)->nullable()->comment('Taux % — للطريقة rate فقط');
            $table->decimal('margin', 15, 4)->nullable()->comment('Marge دج — للطريقة margin فقط');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->unique(['company_id', 'product_id', 'price_level_id'], 'product_price_level_unique');
            $table->index(['company_id', 'product_id', 'active']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE product_prices ADD CONSTRAINT chk_pricing_method CHECK ((pricing_method = 'fixed' AND price IS NOT NULL AND price >= 0) OR (pricing_method = 'rate' AND rate IS NOT NULL AND rate >= 0) OR (pricing_method = 'margin' AND margin IS NOT NULL))");
        }
    }
    public function down(): void {
        Schema::dropIfExists('product_prices');
    }
};




// ===== ملف: 2026_04_28_184333_create_quantity_discounts_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('quantity_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('price_level_id')->constrained('price_levels')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('min_qty', 15, 4)->unsigned()->comment('Qte De — الحد الأدنى للكمية');
            $table->decimal('max_qty', 15, 4)->nullable()->unsigned()->comment('Qte À — الحد الأعلى (NULL = بلا حد أعلى)');
            $table->decimal('discount_amount', 15, 4)->nullable()->unsigned()->comment('Montant Remise — خصم ثابت بالدج لكل وحدة');
            $table->decimal('discount_percentage', 8, 4)->nullable()->unsigned()->comment('Tx Remise % — نسبة خصم من سعر البيع');
            $table->unsignedTinyInteger('tier_order')->default(0);
            $table->boolean('is_blocked')->default(false)->comment('Bloqué — تجميد هذه الشريحة مؤقتاً');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index(['company_id', 'product_id', 'price_level_id', 'active'], 'qty_disc_prod_level_active_idx');
            $table->index(['min_qty', 'max_qty'], 'qty_disc_range_idx');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_qty_range CHECK (max_qty IS NULL OR max_qty > min_qty)");
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_discount_not_empty CHECK (discount_amount IS NOT NULL OR discount_percentage IS NOT NULL)");
            DB::statement("ALTER TABLE quantity_discounts ADD CONSTRAINT chk_discount_values CHECK ((discount_amount IS NULL OR discount_amount >= 0) AND (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)))");
        }
    }
    public function down(): void {
        Schema::dropIfExists('quantity_discounts');
    }
};




// ===== ملف: 2026_04_28_184440_create_stock_movements_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('packaging_id')->nullable()->constrained('product_packagings')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('stock_movement_type_id')->constrained('stock_movement_types')->restrictOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('commercial_document_line_id')->nullable()->comment('FK يُضاف لاحقاً');
            $table->dateTime('movement_date');
            $table->decimal('quantity', 15, 4)->comment('الكمية بالوحدة الأساسية');
            $table->decimal('packaging_quantity', 15, 4)->nullable()->comment('الكمية بوحدة التعبئة — للعرض فقط');
            $table->decimal('unit_price', 15, 4)->comment('سعر الوحدة الأساسية وقت الحركة');
            $table->decimal('cost_price', 15, 4)->comment('سعر التكلفة (PMP أو FIFO) وقت الحركة');
            $table->decimal('total_price', 15, 4);
            $table->string('price_source', 30)->default('sale')->comment('purchase=شراء | sale=بيع | adjustment=تسوية');
            $table->decimal('stock_balance_after', 15, 4)->comment('الرصيد بالوحدة الأساسية بعد الحركة');
            $table->string('lot_number', 100)->nullable();
            $table->date('expiration_date')->nullable();
            $table->unsignedBigInteger('stock_lot_id')->nullable()->index()->comment('FK يُضاف لاحقاً');
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('parent_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('is_validated')->default(false)->index();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'product_id', 'warehouse_id', 'movement_date'], 'stock_mov_prod_wh_date_idx');
            $table->index(['company_id', 'movement_date', 'stock_movement_type_id']);
            $table->index(['company_id', 'warehouse_id', 'movement_date']);
            $table->index(['company_id', 'fiscal_year_id', 'movement_date']);
            $table->index('lot_number');
        });
    }
    public function down(): void {
        Schema::dropIfExists('stock_movements');
    }
};




// ===== ملف: 2026_04_28_184501_create_product_lots_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('lot_number', 50)->index();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate();
            $table->date('manufacturing_date')->nullable()->index();
            $table->date('expiration_date')->nullable()->index();
            $table->date('purchase_date')->index();
            $table->decimal('purchase_price', 15, 4);
            $table->decimal('legal_selling_price', 15, 4);
            $table->decimal('margin_percentage', 8, 4)->default(5.00);
            $table->decimal('original_quantity', 15, 4);
            $table->decimal('remaining_quantity', 15, 4)->index();

            if (DB::getDriverName() !== 'sqlite') {
                $table->boolean('is_depleted')->storedAs('CASE WHEN remaining_quantity <= 0 THEN 1 ELSE 0 END')->index();
                $table->decimal('total_cost', 15, 4)->storedAs('original_quantity * purchase_price');
                $table->decimal('remaining_value', 15, 4)->storedAs('remaining_quantity * purchase_price');
            } else {
                $table->boolean('is_depleted')->default(false)->index();
                $table->decimal('total_cost', 15, 4)->nullable();
                $table->decimal('remaining_value', 15, 4)->nullable();
            }

            $table->unsignedBigInteger('stock_movement_id')->nullable()->comment('FK يُضاف لاحقاً');
            $table->string('supplier_lot_number', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'lot_number'], 'product_lots_company_lot_unique');
            $table->index(['company_id', 'product_id', 'warehouse_id', 'is_depleted', 'purchase_date'], 'idx_fifo_lookup');
            $table->index(['company_id', 'active', 'remaining_quantity'], 'idx_active_stock');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE product_lots ADD CONSTRAINT chk_quantities CHECK (remaining_quantity >= 0 AND remaining_quantity <= original_quantity)");
        }
    }
    public function down(): void {
        Schema::dropIfExists('product_lots');
    }
};




// ===== ملف: 2026_04_28_184611_add_foreign_keys.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->foreign('stock_lot_id')->references('id')->on('product_lots')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreign('commercial_document_line_id')->references('id')->on('commercial_document_lines')->nullOnDelete()->cascadeOnUpdate();
            $table->foreign('stock_lot_id')->references('id')->on('product_lots')->restrictOnDelete()->cascadeOnUpdate();
        });
        Schema::table('product_lots', function (Blueprint $table) {
            $table->foreign('stock_movement_id')->references('id')->on('stock_movements')->nullOnDelete()->cascadeOnUpdate();
        });
    }
    public function down(): void {
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




// ===== ملف: 2026_04_30_190443_add_profile_columns_to_users_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->unique()->after('name');
            $table->string('phone', 20)->nullable()->index()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->text('bio')->nullable()->after('avatar');
            $table->string('job_title', 100)->nullable()->after('bio');
            $table->date('birth_date')->nullable()->after('job_title');
            $table->foreignId('gender_id')->nullable()->after('birth_date')->constrained('genders')->nullOnDelete()->cascadeOnUpdate();
            $table->string('national_id', 20)->nullable()->after('gender_id');
            $table->text('address')->nullable()->after('national_id');
            $table->foreignId('commune_id')->nullable()->after('address')->constrained('communes')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')->nullable()->after('commune_id')->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('role_id')->nullable()->after('wilaya_id')->index();
            $table->timestamp('last_login_at')->nullable()->after('role_id');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('register_ip', 45)->nullable()->after('last_login_ip');
            $table->text('register_user_agent')->nullable()->after('register_ip');
        });
    }
    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['gender_id']);
            $table->dropForeign(['commune_id']);
            $table->dropForeign(['wilaya_id']);
            $table->dropColumn([
                'username', 'phone', 'avatar', 'bio', 'job_title',
                'birth_date', 'gender_id', 'national_id', 'address',
                'commune_id', 'wilaya_id', 'role_id',
                'last_login_at', 'last_login_ip', 'register_ip', 'register_user_agent',
            ]);
        });
    }
};




// ===== ملف: 2026_05_02_084253_create_product_variants_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 50)->nullable();
            $table->enum('price_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('price_value', 15, 4)->nullable();
            $table->decimal('stock', 15, 4)->nullable();
            $table->boolean('track_stock')->nullable();
            $table->json('attributes')->nullable();
            $table->string('image')->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('volume', 10, 2)->nullable();
            $table->boolean('active')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'sku'], 'pv_company_sku_unique');
            $table->unique(['company_id', 'barcode'], 'pv_company_barcode_unique');
            $table->index(['company_id', 'product_id', 'active']);
            $table->index(['company_id', 'active']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('product_variants');
    }
};




// ===== ملف: 2026_05_02_200521_create_barcodes_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('barcode')->nullable()->unique();
            $table->string('type', 50)->nullable()->comment('primary, unit, box, supplier, etc.');
            $table->boolean('is_primary')->default(false);
            $table->string('unit', 50)->nullable()->comment('piece, kg, box, pack');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'product_id']);
            $table->index(['company_id', 'variant_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('barcodes');
    }
};




// ===== ملف: 2026_05_07_000100_create_company_wilaya_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('company_wilaya', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('wilaya_id')->constrained('wilayas')->cascadeOnDelete();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'wilaya_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('company_wilaya');
    }
};




// ===== ملف: 2026_05_07_000101_create_company_commune_table.php =====
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('company_commune', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('commune_id')->constrained('communes')->cascadeOnDelete();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'commune_id']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('company_commune');
    }
};


