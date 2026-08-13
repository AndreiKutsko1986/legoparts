<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_contact_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('store_name')->default('Legoparts');
            $table->string('email')->default('hello@legoparts.local');
            $table->string('phone')->default('+7 495 010-20-00');
            $table->string('address')->default('ул. Кирпичная, 42, г. Конструктив');
            $table->string('business_hours')->default('Пн–Пт 9:00–18:00, Сб 10:00–14:00');
            $table->timestamp('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_contact_settings');
    }
};
