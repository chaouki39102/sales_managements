<?php

namespace Database\Factories;

use App\Models\NumberingSeries;
use Illuminate\Database\Eloquent\Factories\Factory;

class NumberingSeriesFactory extends Factory
{
    public function definition(): array
    {
        return [
            'document_type_id' => 1,
            'warehouse_id' => 1,
            'prefix' => $this->faker->unique()->bothify('???'),
            'suffix' => null,
            'format' => '{PREFIX}/{YY}/{NUMBER:6}',
            'last_number' => 0,
            'start_number' => 1,
            'padding' => 6,
            'reset_yearly' => true,
            'reset_monthly' => false,
            'current_year' => date('Y'),
            'active' => true,
            'is_locked' => false,
        ];
    }
}