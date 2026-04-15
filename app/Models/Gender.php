<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Gender Model
 *
 * Table: genders
 * Represents gender lookup data
 */
#[Cacheable]
class Gender extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'genders';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'label',
        'active',
        'display_order',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name', 'label'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = ['active'];

    /** @var array حقول الترتيب */
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'display_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600; // 1 hour for lookup tables

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['genders', 'lookups'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = ['active'];

    // -------------------- Relations --------------------

    /**
     * Get users with this gender
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get employees with this gender
     */
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
