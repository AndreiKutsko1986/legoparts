<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('site_header_settings', function (Blueprint $table) {
            $table->string('footer_disclaimer', 1000)->default('')->after('hero_subtitle');
        });
    }

    public function down(): void
    {
        Schema::table('site_header_settings', function (Blueprint $table) {
            $table->dropColumn('footer_disclaimer');
        });
    }
};
