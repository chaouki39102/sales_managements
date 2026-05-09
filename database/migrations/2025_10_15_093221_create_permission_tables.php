<?php

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
