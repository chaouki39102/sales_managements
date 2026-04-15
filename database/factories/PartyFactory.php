<?php

namespace Database\Factories;

use App\Models\Party;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Party>
 */
class PartyFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\Illuminate\Database\Eloquent\Model>
     */
    protected $model = Party::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'party_type_id' => 1, // Assume customer type exists
            'name' => $this->faker->company,
            'commercial_name' => $this->faker->optional()->company,
            'code' => $this->faker->unique()->regexify('[A-Z]{2}[0-9]{4}'),
            'slug' => $this->faker->unique()->slug,
            'activity' => $this->faker->optional()->sentence,
            'rc' => $this->faker->optional()->regexify('RC[0-9]{6}'),
            'nif' => $this->faker->unique()->regexify('[0-9]{16}'),
            'nis' => $this->faker->optional()->regexify('[0-9]{15}'),
            'ai' => $this->faker->optional()->regexify('AI[0-9]{6}'),
            'legal_form_id' => null,
            'capital_amount' => $this->faker->optional()->randomFloat(2, 10000, 1000000),
            'rc_date' => $this->faker->optional()->date,
            'address' => $this->faker->address,
            'commune_id' => null,
            'wilaya_id' => null,
            'phone' => $this->faker->phoneNumber,
            'mobile' => $this->faker->optional()->phoneNumber,
            'fax' => $this->faker->optional()->phoneNumber,
            'email' => $this->faker->unique()->safeEmail,
            'bank_name' => $this->faker->optional()->company,
            'rib' => $this->faker->optional()->regexify('[0-9]{20}'),
            'initial_balance' => $this->faker->randomFloat(2, 0, 10000),
            'credit_limit' => $this->faker->randomFloat(2, 0, 50000),
            'default_price_level_id' => null,
            'credit_days' => $this->faker->optional()->numberBetween(0, 90),
            'is_tva_exempt' => $this->faker->boolean,
            'is_taxable' => $this->faker->boolean,
            'tax_option' => $this->faker->optional()->word,
            'cnas_number' => $this->faker->optional()->regexify('[0-9]{10}'),
            'tax_regime' => $this->faker->optional()->randomElement(['forfaitaire', 'réel']),
            'is_final_consumer' => $this->faker->boolean,
            'is_vat_registered' => $this->faker->boolean,
            'vat_registration_date' => $this->faker->optional()->date,
            'additional_data' => [],
            'active' => $this->faker->boolean(80),
        ];
    }
}