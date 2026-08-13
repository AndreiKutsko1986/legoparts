<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\Pagination;
use App\Support\ProductColors;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class AdminProductsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page     = max(1, (int) $request->query('page', 1));
        $pageSize = min(Pagination::MAX_PAGE_SIZE, max(1, (int) $request->query('pageSize', Pagination::DEFAULT_PAGE_SIZE)));

        $skip = 0;
        $take = $pageSize;
        if (!Pagination::tryGetValues($page, $pageSize, $skip, $take)) {
            return response()->json(['message' => Pagination::errorMessage()], 422);
        }

        $query  = Product::with('subCategory.category');
        $total  = $query->count();
        $products = $query->orderByDesc('created_at')->skip($skip)->take($take)->get();

        return response()->json(
            $products->map(fn (Product $p) => $this->mapProduct($p))->values()->all()
        )->header('X-Total-Count', $total);
    }

    public function show(string $id): JsonResponse
    {
        $product = Product::with('subCategory.category')->findOrFail($id);
        return response()->json($this->mapProduct($product));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subCategoryId'    => 'required|string|exists:sub_categories,id',
            'sku'              => 'required|string|max:200',
            'partNumber'       => 'nullable|string|max:200',
            'name'             => 'required|string|max:200',
            'nameRu'           => 'nullable|string|max:200',
            'description'      => 'nullable|string|max:4000',
            'color'            => 'nullable|string|max:200',
            'price'            => 'required|numeric|min:0',
            'initialQuantity'  => 'required|integer|min:0',
            'stockQuantity'    => 'required|integer|min:0',
            'popularityRating' => 'nullable|integer|min:0|max:9999',
            'imageUrl'         => 'nullable|string|max:1000',
            'isActive'         => 'nullable|boolean',
        ]);

        $sku = trim($data['sku']);
        if (Product::where('sku', $sku)->exists()) {
            return response()->json(['message' => "SKU «{$sku}» уже используется."], 409);
        }

        $product = new Product([
            'id'               => (string) Str::uuid(),
            'sub_category_id'  => $data['subCategoryId'],
            'sku'              => $sku,
            'part_number'      => isset($data['partNumber']) ? trim($data['partNumber']) : '',
            'name'             => trim($data['name']),
            'name_ru'          => isset($data['nameRu']) ? trim($data['nameRu']) : '',
            'description'      => isset($data['description']) ? trim($data['description']) : '',
            'color'            => ProductColors::normalize($data['color'] ?? null),
            'price'            => (float) $data['price'],
            'initial_quantity' => (int) $data['initialQuantity'],
            'stock_quantity'   => (int) $data['stockQuantity'],
            'sold_quantity'    => 0,
            'popularity_rating' => (int) ($data['popularityRating'] ?? 0),
            'image_url'        => isset($data['imageUrl']) && trim($data['imageUrl']) !== '' ? trim($data['imageUrl']) : null,
            'is_active'        => $data['isActive'] ?? true,
            'created_at'       => now(),
        ]);
        $product->save();
        $product->load('subCategory.category');

        return response()->json($this->mapProduct($product), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $product = Product::with('subCategory.category')->findOrFail($id);

        $data = $request->validate([
            'subCategoryId'    => 'required|string|exists:sub_categories,id',
            'sku'              => 'required|string|max:200',
            'partNumber'       => 'nullable|string|max:200',
            'name'             => 'required|string|max:200',
            'nameRu'           => 'nullable|string|max:200',
            'description'      => 'nullable|string|max:4000',
            'color'            => 'nullable|string|max:200',
            'price'            => 'required|numeric|min:0',
            'initialQuantity'  => 'required|integer|min:0',
            'stockQuantity'    => 'required|integer|min:0',
            'popularityRating' => 'nullable|integer|min:0|max:9999',
            'imageUrl'         => 'nullable|string|max:1000',
            'isActive'         => 'required|boolean',
        ]);

        $sku = trim($data['sku']);
        if (Product::where('sku', $sku)->where('id', '!=', $id)->exists()) {
            return response()->json(['message' => "SKU «{$sku}» уже используется."], 409);
        }

        $product->sub_category_id   = $data['subCategoryId'];
        $product->sku               = $sku;
        $product->part_number       = isset($data['partNumber']) ? trim($data['partNumber']) : '';
        $product->name              = trim($data['name']);
        $product->name_ru           = isset($data['nameRu']) ? trim($data['nameRu']) : '';
        $product->description       = isset($data['description']) ? trim($data['description']) : '';
        $product->color             = ProductColors::normalize($data['color'] ?? null);
        $product->price             = (float) $data['price'];
        $product->initial_quantity  = (int) $data['initialQuantity'];
        $product->stock_quantity    = (int) $data['stockQuantity'];
        $product->popularity_rating = (int) ($data['popularityRating'] ?? 0);
        $product->image_url         = isset($data['imageUrl']) && trim($data['imageUrl']) !== '' ? trim($data['imageUrl']) : null;
        $product->is_active         = $data['isActive'];
        $product->save();
        $product->load('subCategory.category');

        return response()->json($this->mapProduct($product));
    }

    public function destroy(string $id): Response|JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return response()->json(['message' => 'Товар удалён.']);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Product $p) {
            $p->delete();
            return null;
        });
    }

    public function bulkActivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Product $p) {
            $p->is_active = true;
            $p->save();
            return null;
        });
    }

    public function bulkDeactivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Product $p) {
            $p->is_active = false;
            $p->save();
            return null;
        });
    }

    public function bulkUpdateFields(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'                  => 'required|array|min:1|max:200',
            'ids.*'                => 'string',
            'updateColor'          => 'required|boolean',
            'color'                => 'nullable|string|max:200',
            'updateStockQuantity'  => 'required|boolean',
            'stockQuantity'        => 'nullable|integer|min:0',
            'updatePopularityRating' => 'required|boolean',
            'popularityRating'     => 'nullable|integer|min:0|max:9999',
        ]);

        $updateColor          = (bool) $data['updateColor'];
        $updateStock          = (bool) $data['updateStockQuantity'];
        $updatePopularity     = (bool) $data['updatePopularityRating'];
        $normalizedColor      = $updateColor ? ProductColors::normalize($data['color'] ?? null) : null;
        $stockQuantity        = $updateStock ? (int) ($data['stockQuantity'] ?? 0) : null;
        $popularityRating     = $updatePopularity ? (int) ($data['popularityRating'] ?? 0) : null;

        $processed = 0;
        $failed    = 0;
        $errors    = [];

        foreach ($data['ids'] as $id) {
            $p = Product::find($id);
            if (!$p) {
                $failed++;
                $errors[] = "Товар {$id} не найден.";
                continue;
            }

            if ($updateColor && $normalizedColor !== null) {
                $p->color = $normalizedColor;
            }
            if ($updateStock && $stockQuantity !== null) {
                $p->stock_quantity = $stockQuantity;
            }
            if ($updatePopularity && $popularityRating !== null) {
                $p->popularity_rating = $popularityRating;
            }

            $p->save();
            $processed++;
        }

        return response()->json(['processedCount' => $processed, 'failedCount' => $failed, 'errors' => $errors]);
    }

    private function mapProduct(Product $p): array
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
            'initialQuantity'  => $p->initial_quantity,
            'soldQuantity'     => $p->sold_quantity,
            'stockQuantity'    => $p->stock_quantity,
            'popularityRating' => $p->popularity_rating,
            'imageUrl'         => $p->image_url,
            'isActive'         => (bool) $p->is_active,
            'createdAt'        => $p->created_at->toIso8601String(),
        ];
    }

    private function bulkAction(Request $request, callable $action): JsonResponse
    {
        $ids = $request->input('ids', []);

        if (!is_array($ids) || empty($ids) || count($ids) > 200) {
            return response()->json(['message' => 'Список ID должен содержать от 1 до 200 элементов.'], 422);
        }

        $processed = 0;
        $failed    = 0;
        $errors    = [];

        foreach ($ids as $id) {
            $p = Product::find($id);
            if (!$p) {
                $failed++;
                $errors[] = "Товар {$id} не найден.";
                continue;
            }
            $err = $action($p);
            if ($err) {
                $failed++;
                $errors[] = $err;
            } else {
                $processed++;
            }
        }

        return response()->json(['processedCount' => $processed, 'failedCount' => $failed, 'errors' => $errors]);
    }
}
