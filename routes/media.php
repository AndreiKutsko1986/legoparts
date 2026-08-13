<?php

use Illuminate\Support\Facades\Route;

Route::get('/media/products/{filename}', function (string $filename) {
    $rootPath = config('product_images.local.root_path', 'uploads/products');
    $base = str_starts_with($rootPath, '/') ? $rootPath : base_path($rootPath);
    $path = $base . DIRECTORY_SEPARATOR . basename($filename);

    if (!file_exists($path)) {
        abort(404);
    }

    $mime = mime_content_type($path) ?: 'application/octet-stream';

    return response()->file($path, ['Content-Type' => $mime]);
})->where('filename', '[^/]+');
