<?php

namespace App\Traits;

trait HasTimestamps
{
    /**
     * Indicates if the model should be timestamped
     */
    public $timestamps = true;

    /**
     * The storage format of the model's date columns
     */
    protected $dateFormat = 'Y-m-d H:i:s';

    /**
     * Format a datetime to ISO8601
     */
    protected function serializeDate(\DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }
}
