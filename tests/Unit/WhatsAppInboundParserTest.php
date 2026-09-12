<?php

use App\Core\Exceptions\BusinessRuleException;
use App\Services\WhatsApp\WhatsAppInboundParser;
use Tests\TestCase;

uses(TestCase::class);

/**
 * WhatsAppInboundParser — عالمي اختبار الخوارزميات الأساسية (مستقلة عن قاعدة البيانات)
 *
 * حاوية المنتجات مبنية يدوياً (أشياء بها keys: id/name/ref/barcode) — لا query.
 * كل حالة تختبر مساراً واحداً في parse(): فصل الأسطر، الأعداد العشرية، القواعد
 * العربية/الفارسية، الكلمات المفتاحية، المطابقة، تجميع الأسطر المتكررة، والرفض.
 */

beforeEach(function () {
    $this->parser = new WhatsAppInboundParser();

    // │ id │ name │ ref │ barcode │
    $def = fn (int $id, string $name, string $ref, string $barcode = '') => [
        'id' => $id,
        'name' => $name,
        'ref' => $ref,
        'barcode' => $barcode,
    ];

    $this->catalog = [
        $def(1, 'حليب', 'MLK'),
        $def(2, 'حليب مركز', 'MLKC'),
        $def(3, 'سكر', 'SUG'),
        $def(4, 'صابون سائل', 'SOAP', '6111252425017'),
        $def(5, 'Café Lait', 'CAF'),
        $def(6, 'زيت أحمر', 'REDOIL'),
    ];
});

// ─── رسائل رفض (BusinessRuleException) ────────────────────────────────

test('فارغ النص يرفض', function () {
    $this->parser->parse('', $this->catalog);
})->throws(BusinessRuleException::class, 'لم أتمكن من قراءة طلبك');

test('كتالوج فارغ يرفض', function () {
    $this->parser->parse('حليب', []);
})->throws(BusinessRuleException::class, 'لم يتم العثور على أي منتج');

test('سطر بدون منتج (رقم فقط) يرفض', function () {
    $this->parser->parse('5', $this->catalog);
})->throws(BusinessRuleException::class, 'تعذّرت قراءة السطر التالي من طلبك: «5»');

test('سطر رقمي غريب (789) يرفض', function () {
    $this->parser->parse('789', $this->catalog);
})->throws(BusinessRuleException::class, 'تعذّرت قراءة السطر التالي من طلبك: «789»');

test('سطر بكلمات غير معروفة يرفض', function () {
    // رسالة الرفض تعرض السطر بعد تطبيعه (ة → ه) كما ردّده المحلل فعلاً.
    $this->parser->parse('كلمات غريبة', $this->catalog);
})->throws(BusinessRuleException::class, 'تعذّرت قراءة السطر التالي من طلبك: «كلمات غريبه»');

test('اسم جزئي لا يطابق أي منتج (صابون) يرفض', function () {
    $this->parser->parse('صابون', $this->catalog);
})->throws(BusinessRuleException::class, 'تعذّرت قراءة السطر التالي من طلبك: «صابون»');

test('اسم منتج مقطوع لا يطابق (احمر) يرفض', function () {
    $this->parser->parse('احمر', $this->catalog);
})->throws(BusinessRuleException::class, 'تعذّرت قراءة السطر التالي من طلبك: «احمر»');

// ─── شكل نتيجة parse() ────────────────────────────────────────────────

test('النتيجة مصفوفة سطور {product_id, quantity}', function () {
    $result = $this->parser->parse('2 حليب', $this->catalog);

    expect($result)->toBeArray()
        ->and($result[0])->toMatchArray([
            'product_id' => 1,
            'quantity'   => 2.0,
        ]);
});

// ─── الرسائل الأساسية ─────────────────────────────────────────────────

test('اسم منتج بدون كمية → كمية 1', function () {
    expect($this->parser->parse('حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 1.0]]);
});

test('اسم منتج طويل يطابق الاسم الأطول (حليب مركز)', function () {
    expect($this->parser->parse('حليب مركز', $this->catalog))
        ->toBe([['product_id' => 2, 'quantity' => 1.0]]);
});

test('اسم أطول مع صفة (حليب مركز 1ل) → المنتج الأطول', function () {
    expect($this->parser->parse('حليب مركز 1ل', $this->catalog))
        ->toBe([['product_id' => 2, 'quantity' => 1.0]]);
});

test('حرف x يفصل كمية عن اسم (3 x حليب)', function () {
    expect($this->parser->parse('3 x حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 3.0]]);
});

test('حرف × يفصل كمية عن اسم (2×سكر)', function () {
    expect($this->parser->parse('2×سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 2.0]]);
});

test('شرطة قبل الكمية (- 2 حليب)', function () {
    expect($this->parser->parse('- 2 حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 2.0]]);
});

test('نقطة قبل الكمية (• 2 حليب)', function () {
    expect($this->parser->parse('• 2 حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 2.0]]);
});

test('ترقيم السطر (1. حليب) → كمية 1', function () {
    expect($this->parser->parse('1. حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 1.0]]);
});

test('ترقيم السطر (2) سكر) → كمية 1 سكر', function () {
    expect($this->parser->parse('2) سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 1.0]]);
});

// ─── الأرقام العربية والفارسية ────────────────────────────────────────

test('أرقام عربية-هندية (٣ حليب) → 3', function () {
    expect($this->parser->parse('٣ حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 3.0]]);
});

test('أرقام فارسية (۴ سكر) → 4', function () {
    expect($this->parser->parse('۴ سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 4.0]]);
});

// ─── الكسور والأعداد العشرية ─────────────────────────────────────────

test('فاصلة عشرية (2,5 سكر) → 2.5', function () {
    expect($this->parser->parse('2,5 سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 2.5]]);
});

test('فاصلة عشرية عربية (2٫5 سكر) → 2.5', function () {
    expect($this->parser->parse('2٫5 سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 2.5]]);
});

test('فاصلة عشرية (1,75 سكر) → 1.75', function () {
    expect($this->parser->parse('1,75 سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 1.75]]);
});

// ─── البحث بالمرجع والباركود ─────────────────────────────────────────

test('بحث بالمرجع (sug → SUG)', function () {
    expect($this->parser->parse('sug', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 1.0]]);
});

test('بحث بالباركود مع كمية (2 6111252425017)', function () {
    // سطر رقمي خالص يُعامل ككمية فقط، لذا الباركود يُبحث عنه مع كمية سابقة
    // ليصبح اسم المنتج المراد البحث عنه (المسار الفعلي للمحلل).
    expect($this->parser->parse('2 6111252425017', $this->catalog))
        ->toBe([['product_id' => 4, 'quantity' => 2.0]]);
});

// ─── التطبيع اللاتيني والعربي ────────────────────────────────────────

test('أحرف لاتينية/لهجات (cafe lait)', function () {
    expect($this->parser->parse('cafe lait', $this->catalog))
        ->toBe([['product_id' => 5, 'quantity' => 1.0]]);
});

test('اسم لاتيني كامل (Café Lait)', function () {
    expect($this->parser->parse('Café Lait', $this->catalog))
        ->toBe([['product_id' => 5, 'quantity' => 1.0]]);
});

test('همزة منتج (زيت أحمر → أ) مع كمية', function () {
    expect($this->parser->parse('2 زيت أحمر', $this->catalog))
        ->toBe([['product_id' => 6, 'quantity' => 2.0]]);
});

// ─── عدة أسطر والفصل ─────────────────────────────────────────────────

test('فصل بفواصل عربية (2 حليب، 1 سكر)', function () {
    expect($this->parser->parse('2 حليب، 1 سكر', $this->catalog))
        ->toBe([
            ['product_id' => 1, 'quantity' => 2.0],
            ['product_id' => 3, 'quantity' => 1.0],
        ]);
});

test('فصل بفاصلة منقوطة (2 حليب; 1 سكر)', function () {
    expect($this->parser->parse('2 حليب; 1 سكر', $this->catalog))
        ->toBe([
            ['product_id' => 1, 'quantity' => 2.0],
            ['product_id' => 3, 'quantity' => 1.0],
        ]);
});

test('فصل بأسطر جديدة (2 حليب\n1 سكر)', function () {
    expect($this->parser->parse("2 حليب\n1 سكر", $this->catalog))
        ->toBe([
            ['product_id' => 1, 'quantity' => 2.0],
            ['product_id' => 3, 'quantity' => 1.0],
        ]);
});

// ─── تجميع الأسطر المتكررة ───────────────────────────────────────────

test('تجميع المنتج المكرر (2 حليب، 1 حليب) → كمية 3', function () {
    expect($this->parser->parse('2 حليب، 1 حليب', $this->catalog))
        ->toBe([['product_id' => 1, 'quantity' => 3.0]]);
});

// ─── كمية ملتصقة بلا مسافة ← لا كمية (كمية 1) ─────────────────────────

test('كمية بدون مسافة (1.5سكر) → تُعامل اسماً بمطابقة السكر', function () {
    expect($this->parser->parse('1.5سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 1.0]]);
});

test('رقم ملتصق بلا مسافة (2سكر) → تُعامل اسماً بمطابقة السكر', function () {
    expect($this->parser->parse('2سكر', $this->catalog))
        ->toBe([['product_id' => 3, 'quantity' => 1.0]]);
});