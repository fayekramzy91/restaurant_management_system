<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class MenuItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name'        => fake()->words(2, true),
            'description' => fake()->sentence(),
            'price'       => fake()->randomFloat(2, 5, 200),
            'status'      => 'available',
            'is_addon'    => false,
        ];
    }

    public function addon(): static
    {
        return $this->state(['is_addon' => true]);
    }

    public function outOfStock(): static
    {
        return $this->state(['status' => 'out_of_stock']);
    }
}
