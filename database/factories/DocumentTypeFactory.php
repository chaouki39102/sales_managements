<?php

namespace Database\Factories;

use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentTypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['فاتورة', 'عرض سعر', 'أمر شراء', 'إشعار دائن', 'إشعار مدين']),
            'name_latin' => $this->faker->randomElement(['Invoice', 'Quotation', 'Purchase Order', 'Credit Note', 'Debit Note']),
            'code' => $this->faker->unique()->randomElement(['invoice', 'quote', 'purchase_order', 'credit_note', 'debit_note']),
            'description' => $this->faker->sentence(),
            'document_base_operation_id' => 1,
            'affects_stock_direction' => $this->faker->randomElement([-1, 0, 1]),
            'affects_accounting' => true,
            'is_printable' => true,
            'active' => true,
            'display_order' => $this->faker->numberBetween(1, 10),
        ];
    }

    public function invoice(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'فاتورة',
            'name_latin' => 'Invoice',
            'code' => 'invoice',
            'affects_stock_direction' => -1,
        ]);
    }

    public function quote(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'عرض سعر',
            'name_latin' => 'Quotation',
            'code' => 'quote',
            'affects_stock_direction' => 0,
        ]);
    }
}