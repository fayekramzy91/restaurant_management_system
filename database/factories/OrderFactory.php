<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'branch_id'    => Branch::factory(),
            'user_id'      => User::factory(),
            'table_id'     => null,
            'customer_id'  => null,
            'type'         => fake()->randomElement(['dine_in', 'takeaway', 'delivery']),
            'status'       => 'pending',
            'total_amount' => fake()->randomFloat(2, 10, 300),
            'notes'        => null,
            'private_notes' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(['status' => 'completed']);
    }

    public function cancelled(): static
    {
        return $this->state(['status' => 'cancelled']);
    }
}
