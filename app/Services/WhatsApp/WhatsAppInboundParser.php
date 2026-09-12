<?php

namespace App\Services\WhatsApp;

use App\Core\Exceptions\BusinessRuleException;

/**
 * WhatsAppInboundParser — تحويل نص طلب واتساب إلى قائمة أسطر منتجات.
 * ════════════════════════════════════════════════════════════════════════
 * محلّل خالص (بلا قاعدة بيانات / نماذج): يأخذ نص رسالة الزبون ومجموعة
 * منتجات جاهزة، ويعيد [{product_id, quantity}] أو يرفض الرسالة KAAAAMILA
 * عبر BusinessRuleException إن تعذّر قراءة أي سطر (لن يُنشأ طلب جزئي أبداً).
 *
 * بنية السطر المقبولة (بعد التطبيع):
 *   "2 حليب"          → كمية أولاً بمسافة
 *   "1.5 سكر"         → كمية عشرية (الفاصلة الفرنسية 1,5 تُحوَّل إلى 1.5)
 *   "3 x صابون"       → علامة × صريحة
 *   "حليب"            → بلا كمية → quantity 1
 *   "- 2 حليب"        → يجرّد علامات اللوائح (- • * ·) والترقيم (1. / 2).)
 *
 * الكمية تُقرأ بالأرقام العربي-الهندية/الفارسية وتُحوَّل إلى ASCII تلقائياً.
 * مطابقة المنتج: 1) الثبت/الباركود بالضبط → 2) الاسم مساوٍ تماماً → 3) أطول
 * اسم منتج (٢+ حروف) يظهر كسلسلة فرعية داخل السطر. الخطوات 1 و2 تتفوقان على
 * أي تطابق جزئي أطول لتجنّب "حليب مركز" أن تُظلل "حليب" عندما يكتب الزبون
 * "حليب" فقط.
 */
class WhatsAppInboundParser
{
    private const DIGIT_MAP = [
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
        '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
    ];

    private const ARABIC_NORMALIZE = [
        'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ٲ' => 'ا', 'ٳ' => 'ا',
        'ة' => 'ه', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي', '٦' => '6',
    ];

    private const LATIN_ACCENTS = [
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'á' => 'a', 'à' => 'a',
        'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'ç' => 'c', 'î' => 'i', 'ï' => 'i',
        'í' => 'i', 'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ú' => 'u', 'û' => 'u',
        'ù' => 'u', 'ü' => 'u',
    ];

    /**
     * @param  iterable  $products  كائنات أو مصفوفات بمفاتيح id/name/ref/barcode.
     * @return array<int, array{product_id: int, quantity: float}>
     *
     * @throws BusinessRuleException  عند تعذّر قراءة أي سطر أو عند عدم وجود
     *                                قاعدة مطابقة (لا يُنشأ طلب جزئي أبداً).
     */
    public function parse(string $text, iterable $products): array
    {
        $catalog = $this->buildCatalog($products);
        $lines   = $this->splitPhysicalLines($text);

        if (empty($lines)) {
            $this->reject('لم أتمكن من قراءة طلبك — اكتب مثلاً: 2 حليب، 1 سكر');
        }

        if (empty($catalog)) {
            $this->reject('لم يتم العثور على أي منتج متاح للبيع في هذا المتجر.');
        }

        // دمج المنتجات المكررة عبر الأسطر.
        $aggregated = [];

        foreach ($lines as $line) {
            [$qty, $needle] = $this->splitQuantity($line);

            $match = $this->matchProduct($needle, $catalog);
            if ($match === null) {
                $this->reject('تعذّرت قراءة السطر التالي من طلبك: «' . $line . '»');
            }

            $aggregated[$match['id']] = ($aggregated[$match['id']] ?? 0.0) + $qty;
        }

        $result = [];
        foreach ($aggregated as $pid => $qty) {
            $result[] = [
                'product_id' => (int) $pid,
                'quantity'   => round($qty, 4),
            ];
        }

        return $result;
    }

    // ═══════════════════════════════════════════════════════════════════
    // تقطيع النص إلى أسطر
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @return string[]
     */
    private function splitPhysicalLines(string $text): array
    {
        // عشري فاصلة عربية/لاتينية بين رقمين ("2,5"/"2٫5") → نقطة قبل أيّ قطع،
        // وإلا ستقسم الفاصلةُ العددَ إلى شطرين.
        $text = preg_replace('/(\d)[,٫](\d)/u', '$1.$2', $text) ?? $text;

        // مقسّمات العناصر: سطر جديد، فاصلة منقوطة، فاصلة عربية، فاصلة لاتينية.
        $parts = preg_split('/[\r\n]+|\s*[؛;]\s*|\s*،\s*|\s*,\s*/u', $text) ?: [];

        $lines = [];
        foreach ($parts as $raw) {
            $line = trim($this->normalizeText($raw));
            if ($line !== '') {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    /**
     * تطبيع نص (أرقام عربية-هندية → ASCII، تجريد الحركات/التطويل، توحيد
     * اللاتينية، أحرف صغيرة، ضغط مسافات).
     */
    private function normalizeText(string $text): string
    {
        $text = strtr($text, self::DIGIT_MAP);
        $text = preg_replace('/[\x{064B}-\x{0652}\x{0670}\x{0640}]/u', '', $text) ?? $text; // حركات + تطويل
        $text = strtr($text, self::ARABIC_NORMALIZE);
        $text = strtr($text, self::LATIN_ACCENTS);
        $text = mb_strtolower($text, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    // ═══════════════════════════════════════════════════════════════════
    // الكمية والمنتج
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @return array{0: float, 1: string}  [الكمية, بقية السطر (المنتج)]
     */
    private function splitQuantity(string $line): array
    {
        // علامات لوائح ("- 2 حليب" / "• 2 حليب")
        $line = preg_replace('/^[\s\-–—*•·]+/u', '', $line) ?? $line;
        // ترقيم قوائم ("1. حليب" / "2) حليب") — \s+ وليس \s* حتى لا تبتلع
        // النقطةَ من كمية عشرية ("1.5 سكر" يجب أن تبقى 1.5 لا أن تصير "5 سكر").
        $line = preg_replace('/^\d+[.)]\s+/u', '', $line) ?? $line;
        $line = trim($line);

        if ($line === '') {
            return [1.0, ''];
        }

        // كمية صريحة مع علامة: "3 x صابون" / "2×سكر"
        if (preg_match('/^(\d+(?:\.\d+)?)\s*[x×*]\s*(.+)$/u', $line, $m)) {
            return [(float) $m[1], trim($m[2])];
        }

        // كمية متبوعة بمسافة ثم منتج: "2 حليب"
        if (preg_match('/^(\d+(?:\.\d+)?)\s+(.+)$/u', $line, $m)) {
            return [(float) $m[1], trim($m[2])];
        }

        // كمية وحدها (بدون منتج) — سيفشل عند المطابقة.
        if (preg_match('/^(\d+(?:\.\d+)?)$/u', $line, $m)) {
            return [(float) $m[1], ''];
        }

        // لا كمية → السطر كاملاً هو اسم المنتج بكمية 1.
        return [1.0, $line];
    }

    /**
     * @param  array<int, array{id: int, name: string, ref: string, barcode: string}>  $catalog
     * @return array{id: int, name: string, ref: string, barcode: string}|null
     */
    private function matchProduct(string $needle, array $catalog): ?array
    {
        $needle = $this->normalizeText($needle);
        if ($needle === '') {
            return null;
        }

        // 1) الثبت / الباركود بالضبط
        foreach ($catalog as $entry) {
            if (($entry['ref'] !== '' && $needle === $entry['ref'])
                || ($entry['barcode'] !== '' && $needle === $entry['barcode'])) {
                return $entry;
            }
        }

        // 2) اسم المنتج مساوٍ تماماً للسطر
        foreach ($catalog as $entry) {
            if ($entry['name'] !== '' && $needle === $entry['name']) {
                return $entry;
            }
        }

        // 3) أطول اسم منتج يظهر كسلسلة فرعية داخل السطر
        $best = null;
        foreach ($catalog as $entry) {
            $name = $entry['name'];
            if ($name === '' || mb_strlen($name, 'UTF-8') < 2) {
                continue;
            }
            if (mb_strpos($needle, $name, 0, 'UTF-8') !== false
                && ($best === null || mb_strlen($name, 'UTF-8') > mb_strlen($best['name'], 'UTF-8'))) {
                $best = $entry;
            }
        }

        return $best;
    }

    // ═══════════════════════════════════════════════════════════════════
    // الفهرس
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @param  iterable  $products
     * @return array<int, array{id: int, name: string, ref: string, barcode: string}>
     */
    private function buildCatalog(iterable $products): array
    {
        $catalog = [];

        foreach ($products as $product) {
            if (is_object($product)) {
                $id      = (int) ($product->id ?? 0);
                $name    = (string) ($product->name ?? '');
                $ref     = (string) ($product->ref ?? '');
                $barcode = (string) ($product->barcode ?? '');
            } else {
                $id      = (int) ($product['id'] ?? 0);
                $name    = (string) ($product['name'] ?? '');
                $ref     = (string) ($product['ref'] ?? '');
                $barcode = (string) ($product['barcode'] ?? '');
            }

            if ($id <= 0) {
                continue;
            }

            $catalog[] = [
                'id'      => $id,
                'name'    => $this->normalizeText($name),
                'ref'     => $this->normalizeText($ref),
                'barcode' => $this->normalizeText($barcode),
            ];
        }

        return $catalog;
    }

    private function reject(string $message): never
    {
        throw new BusinessRuleException($message, 422);
    }
}