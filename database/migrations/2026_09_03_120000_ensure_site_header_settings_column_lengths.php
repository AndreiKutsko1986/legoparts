<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE site_header_settings MODIFY hero_subtitle VARCHAR(1000) NOT NULL DEFAULT ''");
    }

    public function down(): void
    {
        // Intentionally left empty: reverting column length could truncate live content.
    }
};
