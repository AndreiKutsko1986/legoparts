<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_header_settings', function (Blueprint $table) {
            $table->string('promo_banner_image_url', 1000)->nullable()->after('hero_subtitle');
            $table->string('promo_banner_text', 1000)->default('')->after('promo_banner_image_url');
        });
    }

    public function down(): void
    {
        Schema::table('site_header_settings', function (Blueprint $table) {
            $table->dropColumn(['promo_banner_image_url', 'promo_banner_text']);
        });
    }
};
