<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\SubCategory;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::with(['subCategories' => function ($q) {
            $q->where('is_active', true)->orderBy('name');
        }])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($categories->map(fn (Category $cat) => [
            'id'            => $cat->id,
            'name'          => $cat->name,
            'slug'          => $cat->slug,
            'description'   => $cat->description,
            'subCategories' => $cat->subCategories->map(fn (SubCategory $sub) => [
                'id'          => $sub->id,
                'name'        => $sub->name,
                'slug'        => $sub->slug,
                'description' => $sub->description,
            ])->values()->all(),
        ])->values()->all());
    }
}
