<?php

namespace App\Support;

class SlugHelper
{
    public static function create(string $value): string
    {
        $slug = mb_strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim(preg_replace('/-{2,}/', '-', $slug), '-');

        return $slug === '' ? 'item' : $slug;
    }
}
