# 🔧 إصلاح صفحة الإعدادات — دليل التطبيق الكامل

## المشاكل التي تم إصلاحها

| الخطأ | السبب | الملف المُصلح |
|-------|-------|---------------|
| `500: This cache store does not support tagging` | `Setting` model يستخدم `Cache::tags()` مع file driver | `Setting.php` + `SettingService.php` |
| `404: PUT /companies/{slug}` | الـ client يُرسل slug كاملاً في URL | `CompanyController.php` (Route Model Binding) |
| `500: Property [id] does not exist on this collection` | خطأ في `members()` عند join الجداول | `CompanyController.php::members()` |
| `422: user_id must be an array` | validation تطلب array بدل integer | `CompanyController.php::addMember()` |
| `500: PATCH /settings` | SettingService يستدعي BaseService الذي يحذف `company_id` | `SettingService.php::upsertSettings()` |

---

## خطوات التطبيق (بالترتيب)

### الخطوة 1 — نسخ الملفات

```bash
# 1. Setting Model (مُصلح — بدون Cache::tags)
cp models/Setting.php app/Models/Setting.php

# 2. SettingService (مُصلح — بدون tags + upsertSettings صحيح)
cp services/SettingService.php app/Services/SettingService.php

# 3. SettingController (مُصلح — castValue يستدعي Service)
cp controllers/SettingController.php app/Http/Controllers/Api/V1/SettingController.php

# 4. CompanyController (مُصلح — members + addMember + update)
cp controllers/CompanyController.php app/Http/Controllers/Api/V1/CompanyController.php

# 5. CompanyObserver (جديد)
cp CompanyObserver.php app/Observers/CompanyObserver.php
```

### الخطوة 2 — Migration

```bash
# إذا لم يكن جدول settings موجوداً بعد:
cp migrations/2024_01_01_000010_create_settings_table.php \
   database/migrations/

php artisan migrate
```

**إذا كان الجدول موجوداً بالفعل** وفيه `value` cast كـ array في قاعدة البيانات، شغّل:
```bash
php artisan tinker
>>> DB::statement("ALTER TABLE settings MODIFY COLUMN value TEXT NULL");
```

### الخطوة 3 — Seeder

```bash
# نسخ الـ Seeder
cp seeders/SettingsSeeder.php database/seeders/SettingsSeeder.php

# إنشاء إعدادات افتراضية للشركات الموجودة
php artisan tinker
```

```php
// في tinker: أنشئ إعدادات لكل شركة موجودة
\App\Models\Company::all()->each(function ($company) {
    (new \Database\Seeders\SettingsSeeder())->seedForCompany($company->id);
    echo "✅ Done: {$company->name}\n";
});
```

### الخطوة 4 — تسجيل CompanyObserver

في `app/Providers/AppServiceProvider.php`:

```php
use App\Models\Company;
use App\Observers\CompanyObserver;

public function boot(): void
{
    Company::observe(CompanyObserver::class);
    // ... باقي الكود
}
```

### الخطوة 5 — إصلاح Cache Driver (مهم!)

في `.env`، تأكد من استخدام driver يدعم tagging أو استخدم `file`:

```env
# ✅ file — لا يدعم tags لكن الـ Setting model المُصلح لا يستخدمها
CACHE_DRIVER=file

# أو إذا أردت tags (Redis):
# CACHE_DRIVER=redis
# REDIS_HOST=127.0.0.1
# REDIS_PASSWORD=null
# REDIS_PORT=6379
```

بعد تغيير الـ driver:
```bash
php artisan cache:clear
php artisan config:clear
```

### الخطوة 6 — مسح الـ Cache القديم

```bash
php artisan cache:clear
php artisan route:clear
php artisan config:cache
```

---

## التحقق من الإصلاح

```bash
# اختبر الـ endpoints
php artisan tinker

# 1. اختبر GET settings/group/invoice
>>> $company = \App\Models\Company::first();
>>> app()->bind(\App\Services\CompanyContextService::class, fn() => new class {
...     public function get() { return $company->id; }
...     public function has() { return true; }
... });
>>> $service = app(\App\Services\SettingService::class);
>>> $service->getGroupAsArray('invoice');
// يجب أن يُرجع array من objects

# 2. اختبر upsertSettings
>>> $service->upsertSettings(['invoice_design' => 'modern', 'price_mode' => 'ht']);
// يجب أن ينجح بدون 500
```

---

## شرح المشاكل والحلول

### 1. `This cache store does not support tagging`

**المشكلة:**
```php
// Setting.php boot() — الكود القديم
static::saved(fn($s) => Cache::tags(['settings'])->forget("setting:{$s->key}"));
//                              ^^^^^^^^^^^^^^ يُسبب exception مع file driver
```

**الحل:**
```php
// Setting.php boot() — الكود المُصلح
static::saved(function (self $setting) {
    Cache::forget("setting:{$setting->company_id}:{$setting->key}"); // ✅ بدون tags
});
```

### 2. `PUT /companies/{slug}` → 404

**المشكلة:** الـ route كان:
```php
Route::put('/{company}', [CompanyController::class, 'update']);
```
Laravel يبحث بـ `id` افتراضياً، لكن الـ frontend يُرسل slug.

**الحل:** Route Model Binding يعمل بالـ slug تلقائياً لأن `Company` model عنده `getRouteKeyName()`:
```php
// Company model
public function getRouteKeyName(): string { return 'slug'; }
```
إذا لم يكن موجوداً، أضفه:
```php
// في app/Models/Company.php
public function getRouteKeyName(): string
{
    return 'slug';
}
```

### 3. `Property [id] does not exist on this collection instance`

**المشكلة:** الكود القديم كان يُنشئ collection بطريقة تُفقد `id`:
```php
// خاطئ
$company->users()->get()->pluck('id'); // users() مع pivot قد لا يحتوي id
```

**الحل:** استخدام DB::table مع JOIN صريح:
```php
DB::table('company_user as cu')
    ->join('users as u', 'cu.user_id', '=', 'u.id')
    ->where('cu.company_id', $company->id)
    ->select(['cu.id', 'cu.user_id', 'cu.role', 'u.name', 'u.email'])
    ->get();
```

### 4. `user_id must be an array` → 422

**المشكلة:**
```php
'user_id' => 'required|array', // ❌ خاطئ
```

**الحل:**
```php
'user_id' => 'required|integer|exists:users,id', // ✅ صحيح
```

### 5. PATCH /settings → 500

**المشكلة:** `BaseService::beforeCreate()` يحذف `company_id`:
```php
unset($data['company_id']); // يحذفه!
```
ثم Setting يُنشأ بدون `company_id` → يتعارض مع unique constraint.

**الحل في SettingService:**
```php
protected function beforeCreate(array $data, ?Request $request): array
{
    $companyId = $data['company_id'] ?? $this->getCurrentCompanyId();
    $data = parent::beforeCreate($data, $request); // يحذف company_id
    if ($companyId) $data['company_id'] = $companyId; // ✅ نُعيده
    return $data;
}
```
والأفضل: استخدام `DB::table()->updateOrInsert()` مباشرة في `upsertSettings()` بدون المرور بـ BaseService.
