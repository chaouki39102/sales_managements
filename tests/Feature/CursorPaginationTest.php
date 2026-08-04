<?php

/**
 * اختبار الـ Cursor (Keyset) pagination الجديد في ApiListService:
 *   - لا COUNT(*) — meta يخلو من total/last_page
 *   - meta يحمل next_cursor + has_more للوصول للصفحة التالية
 *   - ترقيم ثابت عبر id (لا تكرار ولا فجوات مهما تغيّر sort المستخدم)
 *
 * ملاحظة: إنشاء شركة الاختبار يفعّل CompanyObserver → CompanySeeder → UnitSeeder
 * الذي يبذر 13 وحدة افتراضية (Unité, Pièce, ...). لذلك تُحذف وحدات الشركة في
 * بداية كل اختبار ليصبح عدّ الوحدات حتمياً.
 */

use App\Models\Company;
use App\Models\Unit;

use function Pest\Laravel\getJson;

function seedUnitsForTest(int $count): void
{
    $company = Company::query()->where('slug', TEST_COMPANY_SLUG)->firstOrFail();

    // حذف الوحدات الافتراضية التي بذرها CompanySeeder ليصبح العد حتمياً
    Unit::query()->where('company_id', $company->id)->delete();

    foreach (['kg', 'g', 'ml', 'l', 'oz', 'btl', 'ctn', 'pck'] as $name) {
        if (--$count < 0) {
            break;
        }
        Unit::query()->create(['company_id' => $company->id, 'name' => $name]);
    }
}

it('returns keyset cursor meta without a total count', function () {
    actingAsAuthenticatedTenantUser();
    seedUnitsForTest(4);

    $response = getJson('/api/v1/'.testCompanySlug().'/units?cursor=0&per_page=2');

    $response->assertOk();
    $json = $response->json();

    expect($json)->toHaveKeys(['status', 'message', 'data', 'meta', 'timestamp']);
    expect($json['data'])->toBeArray();
    expect(count($json['data']))->toBe(2);

    // meta: cursor بدون total/last_page
    expect($json['meta'])->toHaveKeys(['next_cursor', 'has_more']);
    expect($json['meta']['has_more'])->toBeTrue();
    expect($json['meta']['next_cursor'])->toBeGreaterThan(0);
    expect($json['meta'])->not->toHaveKey('total');
    expect($json['meta'])->not->toHaveKey('last_page');
});

it('paginates keyset through all rows without duplicates or gaps', function () {
    actingAsAuthenticatedTenantUser();
    seedUnitsForTest(6);

    $ids    = [];
    $cursor = 0;
    do {
        $response = getJson('/api/v1/'.testCompanySlug()."/units?cursor={$cursor}&per_page=2");
        $response->assertOk();
        $json = $response->json();

        expect(count($json['data']))->toBeLessThanOrEqual(2);
        foreach ($json['data'] as $row) {
            $ids[] = $row['id'];
        }

        $cursor = (int) $json['meta']['next_cursor'];
    } while ($cursor > 0);

    expect(count($ids))->toBe(6);
    expect(count(array_unique($ids)))->toBe(6);
    // ترتيب حتمي تصاعدي عبر id (لا قفزات ترقيم داخل الصفحات المتتالية)
    $sorted = $ids;
    sort($sorted, SORT_NUMERIC);
    expect($ids)->toBe($sorted);
});

it('reports has_more=false and next_cursor=0 on the final page', function () {
    actingAsAuthenticatedTenantUser();
    seedUnitsForTest(2);

    $json = getJson('/api/v1/'.testCompanySlug().'/units?cursor=0&per_page=10')->json();

    expect(count($json['data']))->toBe(2);
    expect($json['meta']['has_more'])->toBeFalse();
    expect((int) $json['meta']['next_cursor'])->toBe(0);
});
