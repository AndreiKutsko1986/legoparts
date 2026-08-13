<?php

namespace App\Providers;

use App\Services\AdminAccessValidator;
use App\Services\ProductImages\LocalDiskProductImageStorage;
use App\Services\ProductImages\ProductImageStorageFactory;
use App\Services\ProductImages\ProductImageUploadValidator;
use App\Services\ProductImages\S3ProductImageStorage;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ProductImageUploadValidator::class);
        $this->app->singleton(LocalDiskProductImageStorage::class);
        $this->app->bind(S3ProductImageStorage::class);
        $this->app->singleton(ProductImageStorageFactory::class);
        $this->app->singleton(AdminAccessValidator::class);
    }

    public function boot(): void
    {
        RateLimiter::for('admin-auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip() ?? 'unknown');
        });

        RateLimiter::for('contact', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip() ?? 'unknown');
        });

        RateLimiter::for('orders', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip() ?? 'unknown');
        });
    }
}
