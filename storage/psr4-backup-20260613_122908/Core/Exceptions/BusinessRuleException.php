<?php

namespace App\Core\Exceptions;

use Exception;

/**
 * Business Rule Exception
 *
 * استثناء مخصص لأخطاء قواعد العمل (Business Rules Violations)
 *
 * **متى تستخدمه:**
 * - عندما تمنع عملية بسبب قاعدة عمل (ليس خطأ صلاحيات)
 * - مثل: منع حذف زبون له فواتير
 * - مثل: منع تعديل سند مقفل
 * - مثل: منع بيع منتج نفذ من المخزون
 *
 * **الفرق بين الاستثناءات:**
 * - AuthorizationException (403): المستخدم ليس لديه صلاحية
 * - ValidationException (422): البيانات المُدخلة غير صحيحة
 * - BusinessRuleException (409/400): العملية تخالف قاعدة عمل
 *
 * @package App\Core\Exceptions
 */
class BusinessRuleException extends Exception
{
    /**
     * HTTP Status Code الافتراضي
     * 409 Conflict: الأنسب لأخطاء قواعد العمل
     */
    protected $code = 409;

    /**
     * @param string $message رسالة الخطأ
     * @param int $code كود HTTP (409 افتراضياً)
     * @param \Throwable|null $previous
     */
    public function __construct(string $message = "Business rule violation", int $code = 409, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }

    /**
     * رسالة خطأ مُنسقة للمستخدم
     */
    public function getUserMessage(): string
    {
        return $this->message;
    }

    /**
     * بيانات إضافية للـ Response
     */
    public function getContext(): array
    {
        return [
            'type' => 'BUSINESS_RULE_VIOLATION',
            'message' => $this->message,
            'code' => $this->code,
        ];
    }
}
