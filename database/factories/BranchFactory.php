<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BranchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'    => fake()->city() . ' Branch',
            'address' => fake()->address(),
            'phone'   => fake()->phoneNumber(),
            'email'   => fake()->companyEmail(),
            'is_main' => false,
        ];
    }

    public function main(): static
    {
        return $this->state(['is_main' => true]);
    }
}
