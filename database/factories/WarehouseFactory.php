<?php

namespace Database\Factories;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

class WarehouseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'المخزن الرئيسي',
            'code' => 'WH-001',
            'address' => $this->faker->address,
            'phone' => $this->faker->phoneNumber,
            'is_primary' => true,
            'is_active' => true,
        ];
    }

    public function main(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'المخزن الرئيسي',
            'code' => 'WH-001',
            'is_primary' => true,
        ]);
    }

    public function branch(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'مخزن الفرع',
            'code' => $this->faker->unique()->numerify('WH-###'),
            'is_primary' => false,
        ]);
    }
}