<?php

namespace App\Core\Attributes;

use Attribute;

/**
 * Attribute لتحديد أن الموديل يجب مراقبته لإبطال الكاش.
 * يستهدف الكلاسات فقط (Attribute::TARGET_CLASS).
 */
#[Attribute(Attribute::TARGET_CLASS)]
class Cacheable
{
    // لا حاجة لأي محتوى هنا، هو مجرد علامة
}
