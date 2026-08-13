<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_header_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('brand_name')->default('Legoparts');
            $table->string('hero_title')->default('Каждая деталь. Каждый цвет.');
            $table->string('hero_subtitle')->default('');
            $table->string('brand_icon_url')->nullable();
            $table->string('hero_image_url')->nullable();
            $table->string('tab_title')->default('Legoparts — магазин деталей LEGO');
            $table->string('favicon_url')->nullable();
            $table->timestamp('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_header_settings');
    }
};
