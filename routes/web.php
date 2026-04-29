<?php

use App\Http\Controllers\Admin\AreaController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MenuItemController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\TableController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Kitchen\KitchenController;
use App\Http\Controllers\POS\CustomerController as POSCustomerController;
use App\Http\Controllers\POS\OrderController;
use App\Http\Controllers\POS\POSController;
use App\Http\Controllers\ProfileController;
use App\Models\Table;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Public ────────────────────────────────────────────────────────────────────
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => false,
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::get('/dashboard', fn () => redirect()->route('admin.dashboard'))
    ->middleware('auth')
    ->name('dashboard');

// ── Admin ─────────────────────────────────────────────────────────────────────
Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {

    Route::get('/', [DashboardController::class, 'index'])
        ->middleware('permission:dashboard.view')
        ->name('dashboard');

    Route::resource('branches', BranchController::class)
        ->middleware('permission:admin.branches');

    Route::resource('categories', CategoryController::class)
        ->middleware('permission:admin.categories');

    Route::resource('menu-items', MenuItemController::class)
        ->middleware('permission:admin.categories');

    Route::resource('areas', AreaController::class)
        ->middleware('permission:admin.areas');

    Route::resource('tables', TableController::class)
        ->middleware('permission:admin.tables');

    Route::middleware('permission:reports.view')->group(function () {
        Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order}', [AdminOrderController::class, 'update'])->name('orders.update');
        Route::post('orders/{order}/cancel', [AdminOrderController::class, 'cancel'])->name('orders.cancel');
    });

    Route::get('customers', [AdminCustomerController::class, 'index'])
        ->middleware('permission:customers.view')
        ->name('customers.index');

    Route::middleware('permission:admin.settings')->group(function () {
        Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
        Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
        Route::post('payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
        Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
        Route::delete('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy');
    });

    Route::middleware('permission:admin.users')->group(function () {
        Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
        Route::post('users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    });

});

// ── Kitchen ───────────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    Route::get('/kitchen', [KitchenController::class, 'index'])
        ->middleware('permission:kitchen.view')
        ->name('kitchen.index');

    Route::post('/kitchen/order/{order}/start', [KitchenController::class, 'startPreparing'])
        ->middleware('permission:kitchen.update')
        ->name('kitchen.start');

    Route::post('/kitchen/order/{order}/ready', [KitchenController::class, 'markAsReady'])
        ->middleware('permission:kitchen.update')
        ->name('kitchen.ready');
});

// ── POS ───────────────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    // Legacy waiter redirects — no permission gate needed (they just redirect)
    Route::get('/waiter', fn () => redirect()->route('pos.index'))->name('waiter.index');
    Route::get('/waiter/table/{table}', fn (Table $table) => redirect()->route('pos.table', $table))->name('waiter.table');

    Route::get('/pos', [POSController::class, 'index'])
        ->middleware('permission:orders.view')
        ->name('pos.index');

    Route::get('/pos/table/{table}', [POSController::class, 'newTableOrder'])
        ->middleware('permission:orders.create')
        ->name('pos.table');

    Route::get('/pos/order/{order}', [POSController::class, 'manageOrder'])
        ->middleware('permission:orders.view')
        ->name('pos.order');

    Route::post('/pos/new-order', [POSController::class, 'createOrder'])
        ->middleware('permission:orders.create')
        ->name('pos.new-order');

    Route::get('/pos/checkout/{order}', [POSController::class, 'checkout'])
        ->middleware('permission:payments.process')
        ->name('pos.checkout');

    Route::post('/pos/payment/{order}', [POSController::class, 'processPayment'])
        ->middleware('permission:payments.process')
        ->name('pos.process-payment');

    Route::get('/pos/customers/search', [POSCustomerController::class, 'search'])
        ->middleware('permission:customers.view')
        ->name('pos.customers.search');

    Route::post('/pos/customers', [POSCustomerController::class, 'store'])
        ->middleware('permission:customers.create')
        ->name('pos.customers.store');

    // Order mutations
    Route::post('/orders', [OrderController::class, 'store'])
        ->middleware('permission:orders.create')
        ->name('orders.store');

    Route::middleware('permission:orders.update')->group(function () {
        Route::post('/orders/{order}/add-item', [OrderController::class, 'addItem'])->name('orders.add-item');
        Route::put('/orders/{order}/items/{item}', [OrderController::class, 'updateItem'])->name('orders.update-item');
        Route::put('/orders/{order}/items/{item}/addons', [OrderController::class, 'updateItemAddons'])->name('orders.update-item-addons');
        Route::delete('/orders/{order}/items/{item}', [OrderController::class, 'removeItem'])->name('orders.remove-item');
    });

    Route::post('/orders/{order}/complete', [OrderController::class, 'complete'])
        ->middleware('permission:payments.process')
        ->name('orders.complete');
});

// ── Profile ───────────────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
