<?php

namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Basic Auditable trait for tracking who created/updated/deleted records
 */
trait Auditable
{
    public static function bootAuditable()
    {
        static::creating(function ($model) {
            if (auth()->check()) {
                $model->created_by = auth()->id();
            }
        });

        static::updating(function ($model) {
            if (auth()->check()) {
                $model->updated_by = auth()->id();
            }
        });

        static::deleting(function ($model) {
            if (auth()->check()) {
                $model->deleted_by = auth()->id();
            }
        });
    }

    /**
     * Get the user who created this record
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Get the user who last updated this record
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'updated_by');
    }

    /**
     * Get the user who deleted this record
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'deleted_by');
    }
}