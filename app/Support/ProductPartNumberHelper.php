<?php

namespace App\Support;

class ProductPartNumberHelper
{
    public static function resolve(?string $partNumber, string $sku, string $description): string
    {
        if ($partNumber !== null && trim($partNumber) !== '') {
            return trim($partNumber);
        }

        return self::fromSku($sku) ?? self::fromDescription($description) ?? '';
    }

    public static function fromSku(string $sku): ?string
    {
        if (trim($sku) === '') {
            return null;
        }

        if (preg_match('/^RB-(.+?)-\d+$/i', trim($sku), $m)) {
            return $m[1];
        }

        return null;
    }

    public static function fromDescription(string $description): ?string
    {
        if (trim($description) === '') {
            return null;
        }

        if (preg_match('/Артикул Rebrickable:\s*(\S+)/', $description, $m)) {
            return $m[1];
        }

        return null;
    }
}
