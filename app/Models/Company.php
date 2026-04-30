<?php
// app/Models/Company.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Company extends Model
{
    protected $fillable = [
        'name', 'commercial_name', 'slug', 'email', 'phone',
        'address', 'nif', 'nis', 'rc', 'is_active',
        'legal_form_id', 'wilaya_id', 'commune_id', 'owner_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $company): void {
            if (empty($company->slug)) {
                $company->slug = Str::slug($company->name);
            }
        });
    }

    // ===== Relations =====

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
                    ->withPivot('is_default')
                    ->withTimestamps();
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    // ... باقي العلاقات

    // ===== Accessors =====

    public function getRouteKeyName(): string
    {
        return 'slug'; // Route Model Binding باستخدام slug
    }
}
