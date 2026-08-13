<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    public $timestamps = false;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'sub_category_id', 'sku', 'part_number', 'name', 'name_ru',
        'description', 'color', 'price', 'initial_quantity', 'sold_quantity',
        'stock_quantity', 'popularity_rating', 'image_url', 'is_active', 'created_at',
    ];

    protected $casts = [
        'price'             => 'decimal:2',
        'initial_quantity'  => 'integer',
        'sold_quantity'     => 'integer',
        'stock_quantity'    => 'integer',
        'popularity_rating' => 'integer',
        'is_active'         => 'boolean',
        'created_at'        => 'datetime',
    ];

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(SubCategory::class);
    }
}
