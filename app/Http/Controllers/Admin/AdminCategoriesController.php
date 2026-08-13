<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Support\Pagination;
use App\Support\SlugHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class AdminCategoriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page       = max(1, (int) $request->query('page', 1));
        $pageSize   = min(Pagination::MAX_PAGE_SIZE, max(1, (int) $request->query('pageSize', Pagination::DEFAULT_PAGE_SIZE)));
        $activeOnly = $request->boolean('activeOnly');

        $skip = 0;
        $take = $pageSize;
        if (!Pagination::tryGetValues($page, $pageSize, $skip, $take)) {
            return response()->json(['message' => Pagination::errorMessage()], 422);
        }

        $query = Category::withCount('subCategories');
        if ($activeOnly) {
            $query->where('is_active', true);
        }

        $total      = $query->count();
        $categories = $query->orderBy('name')->skip($skip)->take($take)->get();

        return response()->json(
            $categories->map(fn (Category $c) => $this->mapCategory($c))->values()->all()
        )->header('X-Total-Count', $total);
    }

    public function show(string $id): JsonResponse
    {
        $cat = Category::withCount('subCategories')->findOrFail($id);
        return response()->json($this->mapCategory($cat));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:200',
            'slug'        => 'nullable|string|max:200',
            'description' => 'nullable|string|max:4000',
            'isActive'    => 'nullable|boolean',
        ]);

        $name = trim($data['name']);
        $slug = $this->uniqueSlug(
            isset($data['slug']) && trim($data['slug']) !== ''
                ? SlugHelper::create(trim($data['slug']))
                : SlugHelper::create($name)
        );

        $cat = new Category([
            'id'          => (string) Str::uuid(),
            'name'        => $name,
            'slug'        => $slug,
            'description' => isset($data['description']) ? trim($data['description']) : null,
            'is_active'   => $data['isActive'] ?? true,
            'created_at'  => now(),
        ]);
        $cat->save();
        $cat->sub_categories_count = 0;

        return response()->json($this->mapCategory($cat), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $cat = Category::withCount('subCategories')->findOrFail($id);

        $data = $request->validate([
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
            $id
        );

        $cat->name        = $name;
        $cat->slug        = $slug;
        $cat->description = isset($data['description']) ? trim($data['description']) : null;
        $cat->is_active   = $data['isActive'];
        $cat->save();

        return response()->json($this->mapCategory($cat));
    }

    public function destroy(string $id): Response|JsonResponse
    {
        $cat = Category::withCount('subCategories')->findOrFail($id);

        if ($cat->sub_categories_count > 0) {
            return response()->json(['message' => "Нельзя удалить категорию «{$cat->name}»: она содержит подкатегории."], 409);
        }

        $cat->delete();
        return response()->noContent();
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Category $cat) {
            if ($cat->subCategories()->exists()) {
                return "Категория «{$cat->name}» содержит подкатегории.";
            }
            $cat->delete();
            return null;
        });
    }

    public function bulkActivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Category $cat) {
            $cat->is_active = true;
            $cat->save();
            return null;
        });
    }

    public function bulkDeactivate(Request $request): JsonResponse
    {
        return $this->bulkAction($request, function (Category $cat) {
            $cat->is_active = false;
            $cat->save();
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
            $cat = Category::find($id);
            if (!$cat) {
                $failed++;
                $errors[] = "Категория {$id} не найдена.";
                continue;
            }
            $err = $action($cat);
            if ($err) {
                $failed++;
                $errors[] = $err;
            } else {
                $processed++;
            }
        }

        return response()->json(['processedCount' => $processed, 'failedCount' => $failed, 'errors' => $errors]);
    }

    private function mapCategory(Category $cat): array
    {
        return [
            'id'               => $cat->id,
            'name'             => $cat->name,
            'slug'             => $cat->slug,
            'description'      => $cat->description,
            'isActive'         => (bool) $cat->is_active,
            'subCategoryCount' => $cat->sub_categories_count ?? 0,
            'createdAt'        => $cat->created_at->toIso8601String(),
        ];
    }

    private function uniqueSlug(string $slug, ?string $excludeId = null): string
    {
        $base = $slug;
        $i    = 2;
        $q    = Category::where('slug', $slug);
        if ($excludeId) {
            $q->where('id', '!=', $excludeId);
        }
        while ($q->exists()) {
            $slug = $base . '-' . $i++;
            $q    = Category::where('slug', $slug);
            if ($excludeId) {
                $q->where('id', '!=', $excludeId);
            }
        }
        return $slug;
    }
}
