<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Traits\HasCompany;

class PrintTemplate extends Model
{
    use HasCompany;

    protected $table = 'print_templates';

    protected $fillable = [
        'company_id',
        'name',
        'doc_type_code',
        'paper_size',
        'is_default',
        'is_active',
        'config',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active'  => 'boolean',
        'config'     => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (self $model) {
            if ($model->is_default) {
                static::where('doc_type_code', $model->doc_type_code)
                    ->where('id', '!=', $model->id)
                    ->update(['is_default' => false]);
            }
        });
    }
}
