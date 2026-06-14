<?php

namespace App\Core\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Enhanced Auditable with change tracking
 */
trait AuditableEnhanced
{
    use \App\Core\Traits\Auditable;

    /**
     * Get detailed change log
     */
    public function getChangeLog(): array
    {
        if (!$this->exists) {
            return [];
        }

        $changes = [];
        $original = $this->getOriginal();
        $current = $this->getAttributes();

        foreach ($current as $key => $value) {
            $oldValue = $original[$key] ?? null;

            if ($oldValue != $value && !in_array($key, $this->getHidden())) {
                $changes[] = [
                    'field' => $key,
                    'label' => $this->getFieldLabel($key),
                    'old' => $this->formatValue($oldValue),
                    'new' => $this->formatValue($value),
                    'changed_at' => now()->toISOString(),
                ];
            }
        }

        return $changes;
    }

    /**
     * Get human-readable field label
     */
    protected function getFieldLabel(string $field): string
    {
        return Str::title(str_replace('_', ' ', $field));
    }

    /**
     * Format value for display
     */
    protected function formatValue($value): string
    {
        if (is_null($value)) {
            return '—';
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        if (is_array($value) || is_object($value)) {
            return json_encode($value);
        }

        if ($value instanceof \DateTime) {
            return $value->format('Y-m-d H:i:s');
        }

        return (string) $value;
    }

    /**
     * Track changes to audit table
     */
    public function trackChanges(): void
    {
        if (!$this->exists || !$this->wasChanged()) {
            return;
        }

        try {
            \App\Models\Audit::create([
                'user_id' => Auth::id(),
                'user_type' => Auth::check() ? get_class(Auth::user()) : null,
                'event' => 'updated',
                'auditable_type' => get_class($this),
                'auditable_id' => $this->getKey(),
                'old_values' => $this->getOriginal(),
                'new_values' => $this->getChanges(),
                'url' => request()->fullUrl(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to track changes', [
                'model' => get_class($this),
                'error' => $e->getMessage()
            ]);
        }
    }
}
