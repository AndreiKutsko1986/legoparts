<?php

namespace App\Http\Controllers;

use App\Models\SiteHeaderSettings;
use Illuminate\Http\JsonResponse;

class SiteHeaderController extends Controller
{
    public function index(): JsonResponse
    {
        $s = SiteHeaderSettings::firstOrCreate(
            ['id' => SiteHeaderSettings::SINGLETON_ID],
            SiteHeaderSettings::defaults()
        );

        return response()->json(self::mapSettings($s));
    }

    public static function mapSettings(SiteHeaderSettings $s): array
    {
        return [
            'brandName'    => $s->brand_name,
            'heroTitle'    => $s->hero_title,
            'heroSubtitle' => $s->hero_subtitle,
            'brandIconUrl' => $s->brand_icon_url,
            'heroImageUrl' => $s->hero_image_url,
            'tabTitle'     => $s->tab_title,
            'faviconUrl'   => $s->favicon_url,
        ];
    }
}
