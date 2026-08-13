<?php

namespace App\Support;

class AdminKeyHelper
{
    public static function getRequiredApiKey(): string
    {
        $key = config('admin.api_key', '');

        if (empty(trim($key))) {
            throw new \RuntimeException('ADMIN_API_KEY must be configured.');
        }

        if (strlen($key) < 32) {
            throw new \RuntimeException('ADMIN_API_KEY must contain at least 32 characters.');
        }

        return $key;
    }

    public static function keysMatch(?string $provided, string $expected): bool
    {
        return hash_equals($expected, $provided ?? '');
    }
}
