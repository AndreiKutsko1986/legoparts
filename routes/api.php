<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminCategoriesController;
use App\Http\Controllers\Admin\AdminContactController;
use App\Http\Controllers\Admin\AdminOrdersController;
use App\Http\Controllers\Admin\AdminProductImagesController;
use App\Http\Controllers\Admin\AdminProductsController;
use App\Http\Controllers\Admin\AdminSiteHeaderController;
use App\Http\Controllers\Admin\AdminSubCategoriesController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\ProductsController;
use App\Http\Controllers\SiteHeaderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/

Route::get('/site-header', [SiteHeaderController::class, 'index']);
Route::get('/catalog/categories', [CatalogController::class, 'categories']);
Route::get('/products', [ProductsController::class, 'index']);
Route::get('/products/{id}', [ProductsController::class, 'show']);
Route::post('/cart/validate', [CartController::class, 'validate']);
Route::post('/orders', [OrdersController::class, 'store'])->middleware('throttle:orders');
Route::get('/news', [NewsController::class, 'index']);
Route::get('/news/{slug}', [NewsController::class, 'show']);
Route::get('/contact', [ContactController::class, 'info']);
Route::post('/contact/messages', [ContactController::class, 'submit'])->middleware('throttle:contact');

/*
|--------------------------------------------------------------------------
| Admin API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->middleware('admin.auth')->group(function () {

    // Auth (middleware bypasses /api/admin/auth internally)
    Route::post('/auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:admin-auth');
    Route::post('/auth/verify', [AdminAuthController::class, 'verify']);
    Route::post('/auth/logout', [AdminAuthController::class, 'logout']);

    // Site header
    Route::get('/site-header', [AdminSiteHeaderController::class, 'index']);
    Route::put('/site-header', [AdminSiteHeaderController::class, 'update']);

    // Contact settings & messages
    Route::get('/contact', [AdminContactController::class, 'getSettings']);
    Route::put('/contact', [AdminContactController::class, 'updateSettings']);
    Route::get('/contact/messages', [AdminContactController::class, 'messages']);
    Route::get('/contact/messages/{id}/attachment', [AdminContactController::class, 'downloadAttachment']);

    // Categories
    Route::get('/categories', [AdminCategoriesController::class, 'index']);
    Route::post('/categories', [AdminCategoriesController::class, 'store']);
    Route::post('/categories/bulk/delete', [AdminCategoriesController::class, 'bulkDelete']);
    Route::post('/categories/bulk/activate', [AdminCategoriesController::class, 'bulkActivate']);
    Route::post('/categories/bulk/deactivate', [AdminCategoriesController::class, 'bulkDeactivate']);
    Route::get('/categories/{id}', [AdminCategoriesController::class, 'show']);
    Route::put('/categories/{id}', [AdminCategoriesController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoriesController::class, 'destroy']);

    // Subcategories
    Route::get('/subcategories', [AdminSubCategoriesController::class, 'index']);
    Route::post('/subcategories', [AdminSubCategoriesController::class, 'store']);
    Route::post('/subcategories/bulk/delete', [AdminSubCategoriesController::class, 'bulkDelete']);
    Route::post('/subcategories/bulk/activate', [AdminSubCategoriesController::class, 'bulkActivate']);
    Route::post('/subcategories/bulk/deactivate', [AdminSubCategoriesController::class, 'bulkDeactivate']);
    Route::get('/subcategories/{id}', [AdminSubCategoriesController::class, 'show']);
    Route::put('/subcategories/{id}', [AdminSubCategoriesController::class, 'update']);
    Route::delete('/subcategories/{id}', [AdminSubCategoriesController::class, 'destroy']);

    // Products
    Route::get('/products', [AdminProductsController::class, 'index']);
    Route::post('/products', [AdminProductsController::class, 'store']);
    Route::post('/products/bulk/delete', [AdminProductsController::class, 'bulkDelete']);
    Route::post('/products/bulk/activate', [AdminProductsController::class, 'bulkActivate']);
    Route::post('/products/bulk/deactivate', [AdminProductsController::class, 'bulkDeactivate']);
    Route::post('/products/bulk/update-fields', [AdminProductsController::class, 'bulkUpdateFields']);
    Route::get('/products/{id}', [AdminProductsController::class, 'show']);
    Route::put('/products/{id}', [AdminProductsController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductsController::class, 'destroy']);

    // Product images
    Route::post('/product-images/upload', [AdminProductImagesController::class, 'upload']);

    // Orders
    Route::get('/orders', [AdminOrdersController::class, 'index']);
    Route::post('/orders', [AdminOrdersController::class, 'store']);
    Route::get('/orders/{id}', [AdminOrdersController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrdersController::class, 'updateStatus']);
});
