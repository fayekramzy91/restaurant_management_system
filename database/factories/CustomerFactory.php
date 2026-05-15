<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'           => fake()->name(),
            'phone'          => fake()->phoneNumber(),
            'email'          => fake()->optional()->safeEmail(),
            'address'        => fake()->optional()->address(),
            'wallet_balance' => 0,
        ];
    }
}
