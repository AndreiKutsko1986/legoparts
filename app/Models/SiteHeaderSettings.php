<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteHeaderSettings extends Model
{
    public const SINGLETON_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    public $timestamps = false;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $table = 'site_header_settings';

    protected $fillable = [
        'id', 'brand_name', 'hero_title', 'hero_subtitle',
        'brand_icon_url', 'hero_image_url', 'tab_title', 'favicon_url', 'updated_at',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    public static function defaults(): array
    {
        return [
            'id'           => self::SINGLETON_ID,
            'brand_name'   => 'Legoparts',
            'hero_title'   => 'Скопилось много деталей, которые ищут новых хозяем!',
            'hero_subtitle' => 'Обращаем ваше внимание на то, что данный интернет-сайт носит исключительно информационный характер и ни при каких условиях не является публичной офертой.',
            'tab_title'    => 'Legoparts — Распродажа Б.У. деталей LEGO',
            'updated_at'   => now(),
        ];
    }
}
