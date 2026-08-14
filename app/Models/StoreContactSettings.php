<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreContactSettings extends Model
{
    public const SINGLETON_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    public $timestamps = false;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'store_contact_settings';

    protected $fillable = [
        'id', 'store_name', 'email', 'phone', 'address', 'business_hours', 'updated_at',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    public static function defaults(): array
    {
        return [
            'id'             => self::SINGLETON_ID,
            'store_name'     => 'Legoparts',
            'email'          => 'hello@legoparts.local',
            'phone'          => '+375 44 7972716',
            'address'        => 'г. Минск',
            'business_hours' => '',
            'updated_at'     => now(),
        ];
    }
}
