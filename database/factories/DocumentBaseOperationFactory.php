<?php

namespace Database\Factories;

use App\Models\DocumentBaseOperation;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentBaseOperationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['sale', 'purchase', 'return', 'transfer', 'inventory']),
            'label' => $this->faker->randomElement(['بيع', 'شراء', 'إرجاع', 'نقل', 'جرد']),
            'description' => $this->faker->sentence(),
            'active' => true,
            'display_order' => $this->faker->numberBetween(1, 10),
        ];
    }

    public function sale(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'sale',
            'label' => 'بيع',
        ]);
    }

    public function purchase(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'purchase',
            'label' => 'شراء',
        ]);
    }
}