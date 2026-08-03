<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * PortalUser — حساب بوابة الزبائن
 *
 * حساب دخول منفصل لكل زبون (زبون = Party من نوع customer) يسمح له بالاطلاع
 * على فواتيره ودفعاته وكشف حسابه عبر بوابة الزبائن، دون الدخول إلى النظام.
 *
 * ملاحظة Multi-Tenancy:
 * - يستخدم HasCompany → يخضع لـ CompanyScope عند ضبط السياق.
 * - أثناء تسجيل الدخول (قبل PortalAuthenticate) السياق فارغ → الاستعلامات
 *   تجري دون فلترة الشركة (وهذا مقصود: نبحث بالبريد ثم نتحقق من الشركة).
 */
class PortalUser extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasCompany;

    protected $fillable = [
        'company_id',
        'party_id',
        'name',
        'email',
        'password',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
        'password'      => 'hashed',
    ];

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }
}
