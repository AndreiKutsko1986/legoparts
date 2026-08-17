<?php

return [
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
];
