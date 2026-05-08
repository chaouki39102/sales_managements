<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class NumberingSeries extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'numbering_series';

    protected $fillable = [
        'company_id',
        'document_type_id',
        'warehouse_id',
        'prefix',
        'suffix',
        'format',
        'last_number',
        'padding',
        'start_number',
        'max_number',
        'reset_yearly',
        'reset_monthly',
        'current_year',
        'current_month',
        'reset_date',
        'active',
        'is_locked',
    ];

    protected $casts = [
        'last_number' => 'integer',
        'padding' => 'integer',
        'start_number' => 'integer',
        'max_number' => 'integer',
        'reset_yearly' => 'boolean',
        'reset_monthly' => 'boolean',
        'current_year' => 'integer',
        'current_month' => 'integer',
        'reset_date' => 'date',
        'active' => 'boolean',
        'is_locked' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['prefix', 'suffix', 'format'];
    public static array $filterable = ['document_type_id', 'warehouse_id', 'active', 'is_locked'];
    public static array $sortable = ['id', 'prefix', 'last_number'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentType', 'warehouse', 'commercialDocuments'];
    public static string $defaultSort = 'id';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['numbering_series'];

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function scopeUnlocked(Builder $query): Builder
    {
        return $query->where('is_locked', false);
    }

    public function getNextNumber(): string
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;

        if ($this->reset_yearly && $this->current_year != $currentYear) {
            $this->resetSequence($currentYear, $currentMonth);
        } elseif ($this->reset_monthly && $this->current_month != $currentMonth) {
            $this->resetSequence($currentYear, $currentMonth);
        }

        $nextNumber = $this->last_number + 1;

        if ($this->max_number && $nextNumber > $this->max_number) {
            throw new \Exception("Numbering series has reached its maximum number ({$this->max_number})");
        }

        return $this->formatNumber($nextNumber);
    }

    public function incrementNumber(): bool
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;

        if ($this->reset_yearly && $this->current_year != $currentYear) {
            return $this->resetSequence($currentYear, $currentMonth);
        } elseif ($this->reset_monthly && $this->current_month != $currentMonth) {
            return $this->resetSequence($currentYear, $currentMonth);
        }

        return $this->increment('last_number');
    }

    protected function resetSequence(int $year, int $month): bool
    {
        return $this->update([
            'last_number' => $this->start_number - 1,
            'current_year' => $year,
            'current_month' => $month,
        ]);
    }

    protected function formatNumber(int $number): string
    {
        $paddedNumber = str_pad($number, $this->padding, '0', STR_PAD_LEFT);
        $formatted = $this->format;
        $formatted = str_replace('{PREFIX}', $this->prefix, $formatted);
        $formatted = str_replace('{SUFFIX}', $this->suffix ?? '', $formatted);
        $formatted = str_replace('{YY}', now()->format('y'), $formatted);
        $formatted = str_replace('{YYYY}', now()->format('Y'), $formatted);
        $formatted = str_replace('{MM}', now()->format('m'), $formatted);
        $formatted = str_replace('{MONTH}', now()->format('m'), $formatted);
        $formatted = str_replace('{NUMBER}', $paddedNumber, $formatted);
        $formatted = preg_replace_callback('/\{NUMBER:(\d+)\}/', function ($matches) use ($number) {
            $width = (int) $matches[1];
            return str_pad($number, $width, '0', STR_PAD_LEFT);
        }, $formatted);

        return $formatted;
    }
}