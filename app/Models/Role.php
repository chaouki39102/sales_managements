<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Role Model (يمتد من Spatie)
 *
 * Table: roles
 */
class Role extends SpatieRole
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
    ];

    // -------------------- التكوين --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name', 'display_name', 'description'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = ['guard_name'];

    /** @var array حقول الترتيب */
    public static array $sortable = ['id', 'name', 'display_name'];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = ['permissions', 'users'];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600; // ساعة واحدة

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['roles', 'permissions'];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];
}
