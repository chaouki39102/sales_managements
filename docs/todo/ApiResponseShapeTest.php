<?php

/**
 * اختبار عقد: يضمن أن شكل استجابة الـ API لا ينحرف بين paginate() و simplePaginate()
 * ولا بأي شكل ثالث مختلف من أي endpoint يستخدم successResponse().
 *
 * ضعه في: tests/Feature/ApiResponseShapeTest.php
 *
 * ملاحظات قبل التشغيل:
 * - عدّل الرابط '/api/v1/{slug}/units' ليطابق أحد الـ endpoints الحقيقية عندك
 *   (اختر endpoint خفيف وموجود دائماً في بيانات الاختبار — مثل units أو currencies)
 * - إن أردت اختبار simplePaginate فعلياً، أضف تمويهاً مؤقتاً لموديل الاختبار
 *   عبر getListConfig() أو استخدم Model::$simplePaginate = true; في setUp لو أضفتها
 *   كخاصية قابلة للتصريح (كما في التعديل المقترح على ModelConfigService).
 */

use function Pest\Laravel\getJson;

it('returns the canonical envelope for a normal paginated list', function () {
    $response = actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.testCompanySlug().'/units');

    $response->assertOk();

    $json = $response->json();

    expect($json)->toHaveKeys(['status', 'message', 'data', 'meta', 'timestamp']);
    expect($json['data'])->toBeArray();
    expect($json['status'])->toBe('success');

    // حقول paginate() الكاملة يجب أن تكون موجودة
    expect($json['meta'])->toHaveKeys([
        'current_page', 'per_page', 'from', 'to',
        'has_more_pages', 'is_first_page',
        'last_page', 'total', 'is_last_page',
    ]);
    expect($json['links'])->toHaveKeys(['first', 'last', 'prev', 'next', 'current']);
});

it('returns the same top-level envelope shape for a simplePaginate() list', function () {
    // فعّل simple_paginate مؤقتاً على موديل اختبار — عدّل حسب بنية مشروعك الفعلية
    // مثال: عبر binding مؤقت لـ getListConfig() أو موديل اختبار مخصص
    $response = actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.testCompanySlug().'/units?simple=1'); // عدّل حسب آلية التفعيل عندك

    $response->assertOk();

    $json = $response->json();

    // نفس المفاتيح على المستوى الأعلى — هذا هو جوهر الاختبار
    expect($json)->toHaveKeys(['status', 'message', 'data', 'meta', 'timestamp']);
    expect($json['data'])->toBeArray();

    // simplePaginate لا يملك total count — يجب ألا تظهر هذه المفاتيح
    expect($json['meta'])->toHaveKeys(['current_page', 'per_page', 'has_more_pages']);
    expect($json['meta'])->not->toHaveKey('total');
    expect($json['meta'])->not->toHaveKey('last_page');
});

it('rejects a response whose data is nested instead of a flat array (regression guard)', function () {
    $response = actingAsAuthenticatedTenantUser()
        ->getJson('/api/v1/'.testCompanySlug().'/units');

    $json = $response->json();

    // لو انكسر الشكل يوماً (كما حصل مع simplePaginate) فإن data سيكون
    // كائناً معشّشاً {data:[...], current_page:...} بدل مصفوفة مسطّحة
    expect(array_is_list($json['data']))->toBeTrue(
        'data يجب أن تكون مصفوفة مسطحة — إذا فشل هذا فهناك تداخل مضاعف (نفس باغ simplePaginate)'
    );
});
