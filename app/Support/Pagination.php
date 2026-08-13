<?php

namespace App\Support;

class Pagination
{
    public const DEFAULT_PAGE_SIZE = 50;
    public const MAX_PAGE_SIZE = 100;

    public static function tryGetValues(int $page, int $pageSize, int &$skip, int &$take): bool
    {
        $skip = 0;
        $take = $pageSize;

        if ($page < 1 || $pageSize < 1 || $pageSize > self::MAX_PAGE_SIZE) {
            return false;
        }

        $skip = ($page - 1) * $pageSize;
        return true;
    }

    public static function errorMessage(): string
    {
        return 'page должен быть положительным, а pageSize — от 1 до ' . self::MAX_PAGE_SIZE . '.';
    }
}
