<?php

namespace App\Support;

class AdminAuthentication
{
    public const COOKIE_NAME   = 'legoparts-admin-session';
    public const KEY_HEADER    = 'X-Admin-Key';
    public const COOKIE_MINUTES = 480; // 8 hours

    public static function cookieOptions(): array
    {
        return [
            'minutes'  => self::COOKIE_MINUTES,
            'path'     => '/',
            'domain'   => null,
            'secure'   => !app()->isLocal(),
            'httpOnly' => true,
            'sameSite' => 'Lax',
        ];
    }
}
