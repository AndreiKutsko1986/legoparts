<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SiteHeaderController;
use App\Models\SiteHeaderSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSiteHeaderController extends Controller
{
    public function index(): JsonResponse
    {
        $s = SiteHeaderSettings::firstOrCreate(
            ['id' => SiteHeaderSettings::SINGLETON_ID],
            SiteHeaderSettings::defaults()
        );

        return response()->json(SiteHeaderController::mapSettings($s));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brandName'    => 'required|string|max:200',
            'heroTitle'    => 'required|string|max:200',
            'heroSubtitle' => 'nullable|string|max:4000',
            'brandIconUrl' => 'nullable|string|max:1000',
            'heroImageUrl' => 'nullable|string|max:1000',
            'tabTitle'     => 'required|string|max:200',
            'faviconUrl'   => 'nullable|string|max:1000',
        ]);

        $s = SiteHeaderSettings::firstOrNew(
            ['id' => SiteHeaderSettings::SINGLETON_ID],
            SiteHeaderSettings::defaults()
        );

        if (!$s->exists) {
            $s->id = SiteHeaderSettings::SINGLETON_ID;
        }

        $s->brand_name    = trim($data['brandName']);
        $s->hero_title    = trim($data['heroTitle']);
        $s->hero_subtitle = isset($data['heroSubtitle']) ? trim($data['heroSubtitle']) : '';
        $s->brand_icon_url = isset($data['brandIconUrl']) && trim($data['brandIconUrl']) !== '' ? trim($data['brandIconUrl']) : null;
        $s->hero_image_url = isset($data['heroImageUrl']) && trim($data['heroImageUrl']) !== '' ? trim($data['heroImageUrl']) : null;
        $s->tab_title     = trim($data['tabTitle']);
        $s->favicon_url   = isset($data['faviconUrl']) && trim($data['faviconUrl']) !== '' ? trim($data['faviconUrl']) : null;
        $s->updated_at    = now();
        $s->save();

        return response()->json(SiteHeaderController::mapSettings($s));
    }
}
