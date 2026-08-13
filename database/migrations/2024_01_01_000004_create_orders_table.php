<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number')->unique();
            $table->string('customer_name');
            $table->string('customer_email')->default('');
            $table->string('customer_phone')->nullable();
            $table->text('shipping_address');
            $table->text('notes')->nullable();
            $table->string('status')->default('Pending');
            $table->decimal('total_amount', 18, 2)->default(0);
            $table->timestamp('created_at');

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
