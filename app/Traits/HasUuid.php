<?php

namespace App\Traits;

use Illuminate\Support\Str;

trait HasUuid
{
    /**
     * Boot the trait
     */
    public static function bootHasUuid()
    {
        static::creating(function ($model) {
            if (!$model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the value indicating whether the IDs are incrementing
     */
    public function getIncrementing()
    {
        return false;
    }

    /**
     * Get the data type for the primary key
     */
    public function getKeyType()
    {
        return 'string';
    }
}
