<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sub_category_id');
            $table->string('sku')->unique();
            $table->string('part_number')->default('');
            $table->string('name');
            $table->string('name_ru')->default('');
            $table->text('description')->nullable()->default(null);
            $table->string('color')->default('White');
            $table->decimal('price', 18, 2)->default(0);
            $table->integer('initial_quantity')->default(0);
            $table->integer('sold_quantity')->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->integer('popularity_rating')->default(0);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at');

            $table->foreign('sub_category_id')->references('id')->on('sub_categories')->onDelete('restrict');
            $table->index('sub_category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
