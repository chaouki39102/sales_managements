<?php

declare(strict_types=1);

namespace App\Core\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Enhanced Auditable with automatic change tracking.
 *
 * Boot method auto-records created/updated/deleted events to the `audits` table.
 * Models using this trait also get the basic user-stamp columns (created_by, etc.)
 * via the included Auditable trait.
 */
trait AuditableEnhanced
{
    use Auditable;

    public static function bootAuditableEnhanced(): void
    {
        static::created(function ($model): void {
            static::recordAuditEvent($model, 'created');
        });

        static::updated(function ($model): void {
            static::recordAuditEvent($model, 'updated');
        });

        static::deleted(function ($model): void {
            static::recordAuditEvent($model, 'deleted');
        });
    }

    /**
     * Write a single audit record to the `audits` table.
     */
    protected static function recordAuditEvent($model, string $event): void
    {
        try {
            Audit::create([
                'user_id'       => Auth::id(),
                'user_type'     => Auth::check() ? get_class(Auth::user()) : null,
                'event'         => $event,
                'auditable_type' => get_class($model),
                'auditable_id'  => $model->getKey(),
                'old_values'    => $event === 'created' ? [] : $model->getOriginal(),
                'new_values'    => $event === 'deleted' ? [] : $model->getChanges(),
                'url'           => request()->fullUrl(),
                'ip_address'    => request()->ip(),
                'user_agent'    => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to record audit event', [
                'model' => get_class($model),
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get detailed change log for this model.
     */
    public function getChangeLog(): array
    {
        if (!$this->exists) {
            return [];
        }

        $changes  = [];
        $original = $this->getOriginal();
        $current  = $this->getAttributes();

        foreach ($current as $key => $value) {
            $oldValue = $original[$key] ?? null;

            if ($oldValue != $value && !in_array($key, $this->getHidden())) {
                $changes[] = [
                    'field'      => $key,
                    'label'      => $this->getFieldLabel($key),
                    'old'        => $this->formatValue($oldValue),
                    'new'        => $this->formatValue($value),
                    'changed_at' => now()->toISOString(),
                ];
            }
        }

        return $changes;
    }

    protected function getFieldLabel(string $field): string
    {
        return Str::title(str_replace('_', ' ', $field));
    }

    protected function formatValue($value): string
    {
        if (is_null($value))   return '—';
        if (is_bool($value))   return $value ? 'Yes' : 'No';
        if (is_array($value) || is_object($value)) return json_encode($value);
        if ($value instanceof \DateTime) return $value->format('Y-m-d H:i:s');

        return (string) $value;
    }
}
