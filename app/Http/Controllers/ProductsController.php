<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('subCategory.category')
            ->where('is_active', true)
            ->whereHas('subCategory', fn ($q) => $q->where('is_active', true)
                ->whereHas('category', fn ($q2) => $q2->where('is_active', true)));

        if ($categoryId = $request->query('categoryId')) {
            $query->whereHas('subCategory', fn ($q) => $q->where('category_id', $categoryId));
        }

        if ($subCategoryId = $request->query('subCategoryId')) {
            $query->where('sub_category_id', $subCategoryId);
        }

        $products = $query->orderByDesc('popularity_rating')->get();

        return response()->json($products->map(fn (Product $p) => self::mapProduct($p))->values()->all());
    }

    public function show(string $id): JsonResponse
    {
        $product = Product::with('subCategory.category')
            ->where('is_active', true)
            ->whereHas('subCategory', fn ($q) => $q->where('is_active', true)
                ->whereHas('category', fn ($q2) => $q2->where('is_active', true)))
            ->findOrFail($id);

        return response()->json(self::mapProduct($product));
    }

    public static function mapProduct(Product $p): array
    {
        return [
            'id'               => $p->id,
            'sku'              => $p->sku,
            'partNumber'       => $p->part_number,
            'name'             => $p->name,
            'nameRu'           => $p->name_ru,
            'description'      => $p->description,
            'color'            => $p->color,
            'categoryId'       => $p->subCategory?->category_id ?? '',
            'categoryName'     => $p->subCategory?->category?->name ?? '',
            'subCategoryId'    => $p->sub_category_id,
            'subCategoryName'  => $p->subCategory?->name ?? '',
            'price'            => (float) $p->price,
            'stockQuantity'    => $p->stock_quantity,
            'popularityRating' => $p->popularity_rating,
            'imageUrl'         => $p->image_url,
        ];
    }
}
