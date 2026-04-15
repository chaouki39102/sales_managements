<?php

namespace Database\Factories;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;

class CurrencyFactory extends Factory
{
    protected function getUniqueCode(): string
    {
        do {
            $code = $this->faker->unique()->bothify('CUR###');
        } while (Currency::where('code', $code)->exists());
        
        return $code;
    }

    public function definition(): array
    {
        return [
            'name' => $this->faker->word() . ' Currency',
            'code' => $this->getUniqueCode(),
            'symbol' => $this->faker->currencyCode(),
            'decimal_places' => 2,
            'is_base_currency' => false,
            'active' => true,
        ];
    }

    public function base(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'Dinar Algérien',
            'code' => 'DZD',
            'symbol' => 'د.ج',
            'is_base_currency' => true,
        ]);
    }
}