<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\BuilderController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\CartController;

/*
|--------------------------------------------------------------------------
| AquaScape API Routes — v1
| All business logic lives inside Oracle PL/SQL.
| Laravel controllers call procedures/functions and return JSON.
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Health check ─────────────────────────────────────────────────────
    Route::get('/ping', fn () => response()->json([
        'status'  => 'ok',
        'service' => 'AquaScape API',
        'db'      => 'Oracle XE',
    ]));

    // ── Products ──────────────────────────────────────────────────────────
    Route::prefix('products')->group(function () {
        Route::get('/',         [ProductController::class, 'index']);
        Route::get('/{id}',     [ProductController::class, 'show']);
        Route::post('/',        [ProductController::class, 'store']);
        Route::put('/{id}',     [ProductController::class, 'update']);
        Route::delete('/{id}',  [ProductController::class, 'destroy']);
        Route::get('/type/{type}', [ProductController::class, 'byType']);
    });

    // ── Inventory ─────────────────────────────────────────────────────────
    Route::prefix('inventory')->group(function () {
        Route::get('/',             [InventoryController::class, 'index']);
        Route::get('/low-stock',    [InventoryController::class, 'lowStock']);
        Route::get('/alerts',       [InventoryController::class, 'alerts']);
        Route::put('/alerts/{id}/resolve', [InventoryController::class, 'resolveAlert']);
        Route::post('/adjust',      [InventoryController::class, 'adjust']);
        Route::get('/movements',    [InventoryController::class, 'movements']);
    });

    // ── Aquarium Builder ─────────────────────────────────────────────────
    Route::prefix('builder')->group(function () {
        Route::post('/setup',                   [BuilderController::class, 'createSetup']);
        Route::get('/setup/{id}',               [BuilderController::class, 'getSetup']);
        Route::post('/setup/{id}/item',         [BuilderController::class, 'addItem']);
        Route::delete('/setup/{id}/item/{pid}', [BuilderController::class, 'removeItem']);
        Route::get('/setup/{id}/validate',      [BuilderController::class, 'validate']);
        Route::get('/setup/{id}/price',         [BuilderController::class, 'price']);
        Route::post('/setup/{id}/save',         [BuilderController::class, 'saveSetup']);
        Route::get('/setups',                   [BuilderController::class, 'listSetups']);
        Route::get('/compatibility',            [BuilderController::class, 'compatibilityRules']);
        Route::post('/compatibility',           [BuilderController::class, 'addCompatibilityRule']);
    });

    // ── Cart ──────────────────────────────────────────────────────────────
    Route::prefix('cart')->group(function () {
        Route::get('/{customerId}',              [CartController::class, 'index']);
        Route::post('/{customerId}/item',        [CartController::class, 'addItem']);
        Route::put('/{customerId}/item/{pid}',   [CartController::class, 'updateItem']);
        Route::delete('/{customerId}/item/{pid}',[CartController::class, 'removeItem']);
        Route::delete('/{customerId}',           [CartController::class, 'clear']);
    });

    // ── Orders ────────────────────────────────────────────────────────────
    Route::prefix('orders')->group(function () {
        Route::get('/',             [OrderController::class, 'index']);
        Route::get('/{id}',         [OrderController::class, 'show']);
        Route::post('/place',       [OrderController::class, 'placeOrder']);
        Route::put('/{id}/status',  [OrderController::class, 'updateStatus']);
        Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('/returns',     [OrderController::class, 'createReturn']);
        Route::put('/returns/{id}', [OrderController::class, 'processReturn']);
    });

    // ── Suppliers ─────────────────────────────────────────────────────────
    Route::prefix('suppliers')->group(function () {
        Route::get('/',                     [SupplierController::class, 'index']);
        Route::get('/{id}',                 [SupplierController::class, 'show']);
        Route::post('/',                    [SupplierController::class, 'store']);
        Route::put('/{id}',                 [SupplierController::class, 'update']);

        Route::prefix('po')->group(function () {
            Route::get('/',                 [SupplierController::class, 'listPOs']);
            Route::post('/',                [SupplierController::class, 'createPO']);
            Route::get('/{id}',             [SupplierController::class, 'showPO']);
            Route::post('/{id}/item',       [SupplierController::class, 'addPOItem']);
            Route::post('/{id}/submit',     [SupplierController::class, 'submitPO']);
            Route::post('/{id}/approve',    [SupplierController::class, 'approvePO']);
            Route::post('/{id}/receive',    [SupplierController::class, 'receivePO']);
        });
    });

    // ── Customers ─────────────────────────────────────────────────────────
    Route::prefix('customers')->group(function () {
        Route::get('/',         [CustomerController::class, 'index']);
        Route::get('/{id}',     [CustomerController::class, 'show']);
        Route::post('/',        [CustomerController::class, 'store']);
        Route::put('/{id}',     [CustomerController::class, 'update']);
    });

    // ── Reports & Analytics ───────────────────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::get('/dashboard',        [ReportController::class, 'dashboard']);
        Route::get('/monthly-sales',    [ReportController::class, 'monthlySales']);
        Route::get('/best-sellers',     [ReportController::class, 'bestSellers']);
        Route::get('/low-stock',        [ReportController::class, 'lowStock']);
        Route::get('/profit',           [ReportController::class, 'profitAnalysis']);
        Route::get('/popular-setups',   [ReportController::class, 'popularSetups']);
        Route::get('/fast-movers',      [ReportController::class, 'fastMovers']);
        Route::get('/compatibility',    [ReportController::class, 'compatibilityReport']);
        Route::get('/supplier-inv',     [ReportController::class, 'supplierInventory']);
        Route::get('/customer-history', [ReportController::class, 'customerHistory']);
        Route::get('/product-ratings',  [ReportController::class, 'productRatings']);
        Route::get('/audit-log',        [ReportController::class, 'auditLog']);
        Route::get('/stock-movements',  [ReportController::class, 'stockMovements']);
    });
});
