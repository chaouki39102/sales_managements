<?php

namespace Database\Factories;

use App\Models\Family;
use Illuminate\Database\Eloquent\Factories\Factory;

class FamilyFactory extends Factory
{
    public function definition(): array
    {
        $families = [
            'ألبان ومنتجات ألبان',
            'زيوت ونباتات',
            'مشروبات',
            'مُعلبات',
            'قهوة وشاي',
            'حلويات ومُقبلات',
            'حبوب وبقوليات',
            'مُنتجات مُجمدة',
            'توابل و بهارات',
            'مُنتجات تنظيف',
            'ورق ومستلزمات',
            'أدوية و صيدلية',
        ];

        return [
            'name' => $this->faker->randomElement($families),
            'code' => $this->faker->unique()->numerify('FAM-###'),
            'description' => $this->faker->sentence(),
            'parent_id' => null,
            'active' => true,
            'display_order' => $this->faker->numberBetween(1, 20),
        ];
    }

    public function dairy(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'ألبان ومنتجات ألبان',
            'code' => 'FAM-001',
        ]);
    }

    public function beverages(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'مشروبات',
            'code' => 'FAM-003',
        ]);
    }

    public function withParent(): static
    {
        return $this->state(fn(array $attributes) => [
            'parent_id' => Family::factory(),
        ]);
    }
}