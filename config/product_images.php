<?php

return [
    'default_provider' => env('PRODUCT_IMAGES_DEFAULT_PROVIDER', 'local'),

    'max_file_size' => (int) env('PRODUCT_IMAGES_MAX_FILE_SIZE', 5 * 1024 * 1024),

    'allowed_content_types' => [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon',
    ],

    'local' => [
        'root_path'       => env('PRODUCT_IMAGES_LOCAL_ROOT_PATH', 'uploads/products'),
        'request_path'    => env('PRODUCT_IMAGES_LOCAL_REQUEST_PATH', '/media/products'),
        'public_base_url' => env('PRODUCT_IMAGES_LOCAL_PUBLIC_BASE_URL', 'http://localhost:8000/media/products'),
    ],

    's3' => [
        'enabled'          => env('S3_ENABLED', false),
        'service_url'      => env('S3_SERVICE_URL', ''),
        'bucket'           => env('S3_BUCKET', ''),
        'access_key'       => env('S3_ACCESS_KEY', ''),
        'secret_key'       => env('S3_SECRET_KEY', ''),
        'key_prefix'       => env('S3_KEY_PREFIX', 'products'),
        'cdn_base_url'     => env('S3_CDN_BASE_URL', ''),
        'force_path_style' => env('S3_FORCE_PATH_STYLE', true),
    ],
];
