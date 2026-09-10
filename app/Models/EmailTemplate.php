<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Traits\HasCompany;

class EmailTemplate extends Model
{
    use HasCompany;

    protected $table = 'email_templates';

    protected $fillable = [
        'company_id',
        'name',
        'doc_type_code',
        'subject',
        'body',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (self $model) {
            if (!$model->is_default) {
                return;
            }
            // سطر واحد افتراضي لكل (company_id, doc_type_code) — doc_type_code
            // يساوي null يعني "لكل أنواع المستندات" ويمثل قالباً عاماً مستقلاً.
            $siblings = static::where('company_id', $model->company_id);
            if ($model->doc_type_code === null) {
                $siblings->whereNull('doc_type_code');
            } else {
                $siblings->where('doc_type_code', $model->doc_type_code);
            }
            if ($model->exists) {
                $siblings->where('id', '!=', $model->id);
            }
            $siblings->update(['is_default' => false]);
        });
    }
}