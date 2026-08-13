<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SubCategory;
use App\Support\Pagination;
use App\Support\SlugHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class AdminSubCategoriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page       = max(1, (int) $request->query('page', 1));
        $pageSize   = min(Pagination::MAX_PAGE_SIZE, max(1, (int) $request->query('pageSize', Pagination::DEFAULT_PAGE_SIZE)));
        $activeOnly = $request->boolean('activeOnly');
        $categoryId = $request->query('categoryId');

        $skip = 0;
        $take = $pageSize;
        if (!Pagination::tryGetValues($page, $pageSize, $skip, $take)) {
            return response()->json(['message' => Pagination::errorMessage()], 422);
        }

        $query = SubCategory::withCount('products')->with('category');
        if ($activeOnly) {
            $query->where('is_active', true);
        }
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        $total = $query->count();
        $subs  = $query->orderBy('name')->skip($skip)->take($take)->get();

        return response()->json(
            $subs->map(fn (SubCategory $s) => $this->mapSubCategory($s))->values()->all()
        )->header('X-Total-Count', $total);
    }

    public function show(string $id): JsonResponse
    {
        $sub = SubCategory::withCount('products')->with('category')->findOrFail($id);
        return response()->json($this->mapSubCategory($sub));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'categoryId'  => 'required|string|exists:categories,id',
            'name'        => 'required|string|max:200',
            'slug'        => 'nullable|string|max:200',
            'description' => 'nullable|string|max:4000',
            'isActive'    => 'nullable|boolean',
        ]);

        $name = trim($data['name']);
        $slug = $this->uniqueSlug(
            isset($data['slug']) && trim($data['slug']) !== ''
                ? SlugHelper::create(trim($data['slug']))
                : SlugHelper::create($name),
            $data['categoryId']
        );

        $sub = new SubCategory([
            'id'          => (string) Str::uuid(),
            'category_id' => $data['categoryId'],
            'name'        => $name,
            'slug'        => $slug,
            'description' => isset($data['description']) ? trim($data['description']) : null,
            'is_active'   => $data['isActive'] ?? true,
            'created_at'  => now(),
        ]);
        $sub->save();
        $sub->products_count = 0;
        $sub->load('category');

        return response()->json($this->mapSubCategory($sub), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $sub = SubCategory::withCount('products')->with('category')->findOrFail($id);

        $data = $request->validate([
            'categoryId'  => 'required|string|exists:categories,id',
            'name'        => 'required|string|max:200',
            'slug'        => 'nullable|string|max:200',
            'description' => 'nullable|string|max:4000',
            'isActive'    => 'required|boolean',
        ]);

        $name = trim($data['name']);
        $slug = $this->uniqueSlug(
            isset($data['slug']) && trim($data['slug']) !== ''
                ? SlugHelper::create(trim($data['slug']))
                : SlugHelper::create($name),
            $data['categoryId'],
            $id
        );

        $sub->category_id = $data['categoryId'];
        $sub->name        = $name;
        $sub->slug        = $slug;
        $sub->description = isset($data['description']) ? trim($data['description']) : null;
        $sub->is_active   = $data['isActive'];
        $sub->save();
        $sub->load('category');

        return response()->json($this->mapSubCategory($sub));
    }

    public function destroy(string $id): Response|JsonResponse
    {
        $sub = SubCategory::withCount('products')->findOrFail($id);

        if ($sub->products_count > 0) {
            return response()->json(['message' => "Нельзя удалить подкатегорию «{$sub->name}»: она содержит товары."], 409);
        }

        $sub->delete();
        return response()->noContent();
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (SubCategory $sub) {
            if ($sub->products()->exists()) {
                return "Подкатегория «{$sub->name}» содержит товары.";
            }
            $sub->delete();
            return null;
        });
    }

    public function bulkActivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (SubCategory $sub) {
            $sub->is_active = true;
            $sub->save();
            return null;
        });
    }

    public function bulkDeactivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (SubCategory $sub) {
            $sub->is_active = false;
            $sub->save();
            return null;
        });
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
            $sub = SubCategory::find($id);
            if (!$sub) {
                $failed++;
                $errors[] = "Подкатегория {$id} не найдена.";
                continue;
            }
            $err = $action($sub);
            if ($err) {
                $failed++;
                $errors[] = $err;
            } else {
                $processed++;
            }
        }

        return response()->json(['processedCount' => $processed, 'failedCount' => $failed, 'errors' => $errors]);
    }

    private function mapSubCategory(SubCategory $sub): array
    {
        return [
            'id'           => $sub->id,
            'categoryId'   => $sub->category_id,
            'categoryName' => $sub->category?->name ?? '',
            'name'         => $sub->name,
            'slug'         => $sub->slug,
            'description'  => $sub->description,
            'isActive'     => (bool) $sub->is_active,
            'productCount' => $sub->products_count ?? 0,
            'createdAt'    => $sub->created_at->toIso8601String(),
        ];
    }

    private function uniqueSlug(string $slug, string $categoryId, ?string $excludeId = null): string
    {
        $base = $slug;
        $i    = 2;
        while (true) {
            $q = SubCategory::where('slug', $slug)->where('category_id', $categoryId);
            if ($excludeId) {
                $q->where('id', '!=', $excludeId);
            }
            if (!$q->exists()) {
                break;
            }
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
