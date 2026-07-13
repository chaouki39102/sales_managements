<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\AuditableEnhanced;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;
use App\Models\Traits\HasTenantSlug;

#[Cacheable]
class Brand extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, AuditableEnhanced,
        HasCompany, HasTenantSlug, HasTenantRouteBinding;

    protected $table = 'brands';

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'description',
        'logo',
        'website',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active'        => 'boolean',
        'display_order' => 'integer',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
        'deleted_at'    => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description', 'website'];
    public static array $filterable       = ['active'];
    public static array $sortable         = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith      = [];
    public static array $allowedIncludes  = ['products', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort     = 'name';
    public static ?int   $cacheTtl        = 600;
    public static array  $cacheTags       = ['brands'];

    // ─────────────────────────────────────────────────────────────
    // boot() لضمان التنسيق والأتمتة التلقائية
    // ─────────────────────────────────────────────────────────────
    // protected static function boot(): void
    // {
    //     parent::boot();

    //     static::creating(function (self $model): void {
    //         $model->slug = static::uniqueSlug(
    //             $model->name,
    //             $model->company_id
    //         );
    //     });

    //     static::updating(function (self $model): void {
    //         if ($model->isDirty('name')) {
    //             $model->slug = static::uniqueSlug(
    //                 $model->name,
    //                 $model->company_id,
    //                 $model->id
    //             );
    //         }
    //     });
    // }

    // // ─────────────────────────────────────────────────────────────
    // // يُولِّد slug فريداً مطلقاً على مستوى قاعدة البيانات بالكامل
    // // ─────────────────────────────────────────────────────────────
    // public static function uniqueSlug(string $name, int $companyId, ?int $ignoreId = null): string
    // {
    //     // 1. توليد الـ slug الأساسي من الاسم
    //     $slug = Str::slug($name) ?: static::arabicSlug($name);

    //     $originalSlug = $slug;
    //     $count = 1;

    //     // 2. استخدام DB نقي لتخطي الـ Global Scopes والـ SoftDeletes ورؤية الجدول كاملاً
    //     while (DB::table('brands')
    //         ->where('slug', $slug)
    //         ->when($ignoreId, function ($query) use ($ignoreId) {
    //             return $query->where('id', '!=', $ignoreId);
    //         })
    //         ->exists()
    //     ) {
    //         $slug = $originalSlug . '-' . $count;
    //         $count++;
    //     }

    //     return $slug;
    // }

    // // دالة مساعدة لدعم الحروف العربية في الـ slug
    // protected static function arabicSlug(string $title): string
    // {
    //     return preg_replace('/\s+/u', '-', trim(mb_strtolower($title)));
    // }

    // ─────────────────────────────────────────────────────────────
    // Relations
    // ─────────────────────────────────────────────────────────────
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
