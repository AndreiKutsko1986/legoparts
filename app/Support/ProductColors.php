<?php

namespace App\Support;

class ProductColors
{
    public const DEFAULT = 'White';

    public static array $allowed = [
        'Red', 'Blue', 'Yellow', 'Green', 'White', 'Black',
        'Light Bluish Gray', 'Dark Bluish Gray', 'Orange', 'Dark Red',
        'Reddish Brown', 'Tan', 'Lime', 'Bright Pink', 'Dark Purple',
        'Medium Blue', 'Dark Turquoise', 'Transparent Red', 'Transparent Green',
        'Transparent Blue', 'Pearl Gold', 'Flat Silver', 'Chrome',
    ];

    private static array $aliases = [
        'Trans-Red'              => 'Transparent Red',
        'Trans-Green'            => 'Transparent Green',
        'Trans-Bright Green'     => 'Transparent Green',
        'Trans-Neon Green'       => 'Transparent Green',
        'Trans-Light Blue'       => 'Transparent Blue',
        'Trans-Clear'            => 'Transparent Blue',
        'Dark Brown'             => 'Reddish Brown',
        '[No Color/Any Color]'   => '',
    ];

    public static function normalize(?string $color): string
    {
        if ($color === null || trim($color) === '') {
            return '';
        }

        $trimmed = trim($color);

        if (array_key_exists($trimmed, self::$aliases)) {
            return self::$aliases[$trimmed];
        }

        foreach (self::$allowed as $allowed) {
            if (strcasecmp($trimmed, $allowed) === 0) {
                return $allowed;
            }
        }

        return self::DEFAULT;
    }

    public static function isAllowed(?string $color): bool
    {
        if ($color === null || trim($color) === '') {
            return false;
        }

        $trimmed = trim($color);
        foreach (self::$allowed as $allowed) {
            if (strcasecmp($trimmed, $allowed) === 0) {
                return true;
            }
        }

        return false;
    }

    public static function isRecognizedToken(?string $token): bool
    {
        if ($token === null || trim($token) === '') {
            return false;
        }

        $trimmed = trim($token);
        return self::isAllowed($trimmed) || array_key_exists($trimmed, self::$aliases);
    }
}
