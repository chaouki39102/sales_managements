<?php

namespace App\Core\Traits;

use Illuminate\Validation\Rule;

/**
 * Dynamic validation rules generation
 */
trait ValidationRules
{
    /**
     * Get store validation rules
     */
    public static function getStoreRules(): array
    {
        $rules = static::getValidationRules(false);
        return static::enhanceRules($rules, 'store');
    }

    /**
     * Get update validation rules
     */
    public static function getUpdateRules($id = null): array
    {
        $rules = static::getValidationRules(true);
        return static::enhanceRules($rules, 'update', $id);
    }

    /**
     * Enhance rules with unique checks
     */
    protected static function enhanceRules(array $rules, string $operation, $id = null): array
    {
        $table = (new static)->getTable();

        foreach ($rules as $field => &$fieldRules) {
            // Handle unique rule
            if (in_array('unique', $fieldRules)) {
                $key = array_search('unique', $fieldRules);
                unset($fieldRules[$key]);

                if ($operation === 'update' && $id) {
                    $fieldRules[] = Rule::unique($table, $field)->ignore($id);
                } else {
                    $fieldRules[] = Rule::unique($table, $field);
                }
            }

            // Handle exists rule with soft deletes
            foreach ($fieldRules as $key => $rule) {
                if (is_string($rule) && str_starts_with($rule, 'exists:')) {
                    $parts = explode(',', str_replace('exists:', '', $rule));
                    $relatedTable = $parts[0];
                    $relatedField = $parts[1] ?? 'id';

                    // Check if related model uses soft deletes
                    $fieldRules[$key] = Rule::exists($relatedTable, $relatedField)
                        ->whereNull('deleted_at');
                }
            }
        }

        return $rules;
    }

    /**
     * Get validation messages
     */
    public static function getValidationMessages(): array
    {
        return [
            'required' => 'حقل :attribute مطلوب',
            'unique' => 'قيمة :attribute مستخدمة مسبقاً',
            'exists' => 'القيمة المختارة لـ :attribute غير صالحة',
            'email' => 'يجب أن يكون :attribute بريد إلكتروني صحيح',
            'max' => 'يجب ألا يتجاوز :attribute :max حرف',
            'min' => 'يجب أن يكون :attribute على الأقل :min',
            'numeric' => 'يجب أن يكون :attribute رقماً',
            'integer' => 'يجب أن يكون :attribute رقماً صحيحاً',
            'date' => 'يجب أن يكون :attribute تاريخاً صحيحاً',
            'boolean' => 'يجب أن تكون قيمة :attribute صح أو خطأ',
            'array' => 'يجب أن يكون :attribute مصفوفة',
        ];
    }
}
