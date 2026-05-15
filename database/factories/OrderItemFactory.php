<?php

namespace Database\Factories;

use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id'     => Order::factory(),
            'menu_item_id' => MenuItem::factory(),
            'quantity'     => fake()->numberBetween(1, 5),
            'price'        => fake()->randomFloat(2, 5, 100),
            'notes'        => null,
        ];
    }
}
