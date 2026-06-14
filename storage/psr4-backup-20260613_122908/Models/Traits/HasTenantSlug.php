<?php
// app/Models/Traits/HasTenantSlug.php

namespace App\Models\Traits;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

trait HasTenantSlug
{
    protected static function bootHasTenantSlug(): void
    {
        static::saving(function (self $model): void {
            $needsSlug = empty($model->slug)
                || ($model->isDirty('name') && !$model->isDirty('slug'));

            if (!$needsSlug || empty($model->name)) {
                return;
            }

            $companyId = $model->company_id
                ?? app(\App\Services\CompanyContextService::class)->get();

            $model->slug = static::generateUniqueSlug(
                $model->name,
                (int) $companyId,
                $model->exists ? $model->id : null
            );
        });
    }

    public static function generateUniqueSlug(
        string $name,
        int    $companyId,
        ?int   $ignoreId = null
    ): string {
        $base = Str::slug($name)
            ?: preg_replace('/\s+/u', '-', trim(mb_strtolower($name)))
            ?: 'item';

        $slug    = $base;
        $counter = 1;

        while (
            DB::table((new static)->getTable())
                ->where('company_id', $companyId)
                ->where('slug', $slug)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
