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
        'template_version',
        'config',
    ];

    protected $casts = [
        'is_default'       => 'boolean',
        'is_active'        => 'boolean',
        'template_version' => 'integer',
        'config'           => 'json',
    ];

    protected $attributes = [
        'config' => '{}',
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
            // عند الإنشاء لا يوجد id بعد — where('id','!=',null) لا تطابق
            // أي سطر فيبقى الافتراضي القديم معلّماً (افتراضيان معاً).
            $siblings = static::where('doc_type_code', $model->doc_type_code);
            if ($model->exists) {
                $siblings->where('id', '!=', $model->id);
            }
            $siblings->update(['is_default' => false]);
        });
    }
}
