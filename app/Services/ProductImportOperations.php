<?php

namespace App\Services;

use App\Models\Product;
use App\Models\SubCategory;
use App\Support\ProductColors;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProductImportOperations
{
    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{createdCount: int, updatedCount: int, failedCount: int, errors: string[]}
     */
    public static function importRows(array $rows): array
    {
        $created = 0;
        $updated = 0;
        $failed  = 0;
        $errors  = [];

        /** @var Collection<int, SubCategory> $subCategories */
        $subCategories = SubCategory::with('category')->get();

        foreach ($rows as $index => $row) {
            $line = $index + 1;
            $sku  = trim((string) ($row['sku'] ?? ''));

            if ($sku === '') {
                $failed++;
                $errors[] = "Строка {$line}: SKU обязателен.";
                continue;
            }

            $product = self::findExistingProduct($row, $sku);

            $subCategoryId = self::resolveSubCategoryId($row, $subCategories, $product);
            if ($subCategoryId === null) {
                $failed++;
                $errors[] = "Строка {$line}: не удалось определить подкатегорию.";
                continue;
            }

            if ($product) {
                $conflict = Product::where('sku', $sku)->where('id', '!=', $product->id)->exists();
                if ($conflict) {
                    $failed++;
                    $errors[] = "Строка {$line}: SKU «{$sku}» уже используется другим товаром.";
                    continue;
                }

                self::applyRowToProduct($product, $row, $subCategoryId, true);
                $product->save();
                $updated++;
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                $failed++;
                $errors[] = "Строка {$line}: для нового товара укажите название (EN).";
                continue;
            }

            if (Product::where('sku', $sku)->exists()) {
                $failed++;
                $errors[] = "Строка {$line}: SKU «{$sku}» уже используется.";
                continue;
            }

            $product = new Product([
                'id'               => (string) Str::uuid(),
                'sub_category_id'  => $subCategoryId,
                'sku'              => $sku,
                'part_number'      => self::stringValue($row, 'partNumber'),
                'name'             => $name,
                'name_ru'          => self::stringValue($row, 'nameRu'),
                'description'      => self::stringValue($row, 'description'),
                'color'            => ProductColors::normalize(self::nullableStringValue($row, 'color')),
                'price'            => self::floatValue($row, 'price', 0),
                'initial_quantity' => self::intValue($row, 'initialQuantity', 0),
                'stock_quantity'   => self::intValue($row, 'stockQuantity', 0),
                'sold_quantity'    => 0,
                'popularity_rating' => self::intValue($row, 'popularityRating', 0),
                'image_url'        => self::nullableStringValue($row, 'imageUrl'),
                'is_active'        => self::boolValue($row, 'isActive', true),
                'created_at'       => now(),
            ]);
            $product->save();
            $created++;
        }

        return [
            'createdCount' => $created,
            'updatedCount' => $updated,
            'failedCount'  => $failed,
            'errors'       => $errors,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function findExistingProduct(array $row, string $sku): ?Product
    {
        $id = trim((string) ($row['id'] ?? ''));
        if ($id !== '') {
            $byId = Product::find($id);
            if ($byId) {
                return $byId;
            }
        }

        return Product::where('sku', $sku)->first();
    }

    /**
     * @param  Collection<int, SubCategory>  $subCategories
     */
    private static function resolveSubCategoryId(array $row, Collection $subCategories, ?Product $product): ?string
    {
        $subCategoryName = self::normalizeName(self::stringValue($row, 'subCategoryName'));
        $categoryName    = self::normalizeName(self::stringValue($row, 'categoryName'));

        if ($subCategoryName !== '') {
            $matches = $subCategories->filter(function (SubCategory $subCategory) use ($subCategoryName, $categoryName) {
                if (self::normalizeName($subCategory->name) !== $subCategoryName) {
                    return false;
                }

                if ($categoryName === '') {
                    return true;
                }

                return self::normalizeName($subCategory->category?->name ?? '') === $categoryName;
            });

            if ($matches->count() === 1) {
                return $matches->first()->id;
            }

            if ($matches->count() > 1 && $categoryName === '') {
                return null;
            }

            if ($matches->count() > 0) {
                return $matches->first()->id;
            }
        }

        return $product?->sub_category_id;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function applyRowToProduct(Product $product, array $row, string $subCategoryId, bool $isUpdate): void
    {
        $product->sub_category_id = $subCategoryId;
        $product->sku             = trim((string) ($row['sku'] ?? $product->sku));

        if (self::hasValue($row, 'partNumber')) {
            $product->part_number = self::stringValue($row, 'partNumber');
        }

        if (self::hasValue($row, 'name')) {
            $product->name = trim((string) $row['name']);
        }

        if (self::hasValue($row, 'nameRu')) {
            $product->name_ru = self::stringValue($row, 'nameRu');
        }

        if (self::hasValue($row, 'description')) {
            $product->description = self::stringValue($row, 'description');
        }

        if (self::hasValue($row, 'color')) {
            $product->color = ProductColors::normalize(self::nullableStringValue($row, 'color'));
        }

        if (self::hasValue($row, 'price')) {
            $product->price = self::floatValue($row, 'price', (float) $product->price);
        }

        if (self::hasValue($row, 'initialQuantity')) {
            $product->initial_quantity = self::intValue($row, 'initialQuantity', $product->initial_quantity);
        }

        if (self::hasValue($row, 'stockQuantity')) {
            $product->stock_quantity = self::intValue($row, 'stockQuantity', $product->stock_quantity);
        }

        if (self::hasValue($row, 'popularityRating')) {
            $product->popularity_rating = self::intValue($row, 'popularityRating', $product->popularity_rating);
        }

        if (self::hasValue($row, 'imageUrl')) {
            $product->image_url = self::nullableStringValue($row, 'imageUrl');
        }

        if (self::hasValue($row, 'isActive')) {
            $product->is_active = self::boolValue($row, 'isActive', (bool) $product->is_active);
        } elseif (!$isUpdate) {
            $product->is_active = true;
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function hasValue(array $row, string $key): bool
    {
        if (!array_key_exists($key, $row)) {
            return false;
        }

        $value = $row[$key];
        if ($value === null) {
            return false;
        }

        if (is_string($value) && trim($value) === '') {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function stringValue(array $row, string $key): string
    {
        return trim((string) ($row[$key] ?? ''));
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function nullableStringValue(array $row, string $key): ?string
    {
        $value = trim((string) ($row[$key] ?? ''));

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function intValue(array $row, string $key, int $default): int
    {
        if (!self::hasValue($row, $key)) {
            return $default;
        }

        return (int) $row[$key];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function floatValue(array $row, string $key, float $default): float
    {
        if (!self::hasValue($row, $key)) {
            return $default;
        }

        return (float) $row[$key];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function boolValue(array $row, string $key, bool $default): bool
    {
        if (!self::hasValue($row, $key)) {
            return $default;
        }

        $value = $row[$key];
        if (is_bool($value)) {
            return $value;
        }

        $normalized = mb_strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'y', 'да', 'активен', 'active'], true);
    }

    private static function normalizeName(string $value): string
    {
        return mb_strtolower(trim($value));
    }
}
