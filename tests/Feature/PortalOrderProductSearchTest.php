<?php

use App\Models\Company;
use App\Models\Product;

// حراسة لصفحة "طلبات بوابة الزبائن": إضافة منتج تتم عبر /products (بحث
// بالاسم/المرجع + include unit,packagings)، وليس عبر /product-variants الذي
// يرفض العلاقات الموجودة على Product فقط (unit/tva/prices/packagings).

it('products index accepts search + unit,packagings include (admin order add-product contract)', function () {
    $company = Company::where('slug', testCompanySlug())->first();

    Product::create([
        'company_id' => $company->id,
        'name'       => 'زيت طهي',
        'ref'        => 'OIL-1000',
        'active'     => true,
    ]);

    actingAsAuthenticatedTenantUser();

    $response = $this->getJson('/api/v1/' . testCompanySlug() . '/products?search=زيت&include=unit,packagings&per_page=5');

    $response->assertOk()
        ->assertJsonPath('data.0.name', 'زيت طهي')
        ->assertJsonPath('data.0.ref', 'OIL-1000');
});

it('product-variants index still rejects includes that only exist on Product', function () {
    actingAsAuthenticatedTenantUser();

    $this->getJson('/api/v1/' . testCompanySlug() . '/product-variants?include=product,product.family,unit,tva,prices.priceLevel,packagings&per_page=5')
        ->assertStatus(400);
});
