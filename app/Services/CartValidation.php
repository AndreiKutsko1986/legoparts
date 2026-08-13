<?php

namespace App\Services;

use App\Models\Product;

class CartValidation
{
    public static function validate(?array $request): array
    {
        $items = $request['items'] ?? [];

        if (empty($items)) {
            return ['isValid' => false, 'errors' => ['Корзина пуста.'], 'lines' => []];
        }

        $qtyByProduct = [];
        foreach ($items as $item) {
            $pid = $item['productId'] ?? null;
            $qty = (int) ($item['quantity'] ?? 0);
            if ($pid === null) {
                continue;
            }
            $qtyByProduct[$pid] = ($qtyByProduct[$pid] ?? 0) + $qty;
        }

        foreach ($qtyByProduct as $qty) {
            if ($qty <= 0) {
                return ['isValid' => false, 'errors' => ['Количество должно быть больше нуля.'], 'lines' => []];
            }
        }

        $productIds = array_keys($qtyByProduct);

        $products = Product::with('subCategory.category')
            ->whereIn('id', $productIds)
            ->where('is_active', true)
            ->whereHas('subCategory', fn ($q) => $q->where('is_active', true)
                ->whereHas('category', fn ($q2) => $q2->where('is_active', true)))
            ->select('id', 'name', 'name_ru', 'stock_quantity')
            ->get()
            ->keyBy('id');

        $errors = [];
        $lines  = [];

        foreach ($qtyByProduct as $productId => $requestedQuantity) {
            if (!isset($products[$productId])) {
                $errors[] = 'Один или несколько товаров больше недоступны.';
                $lines[]  = [
                    'productId'         => $productId,
                    'productName'       => 'Товар недоступен',
                    'requestedQuantity' => $requestedQuantity,
                    'availableQuantity' => 0,
                    'isAvailable'       => false,
                ];
                continue;
            }

            $product     = $products[$productId];
            $displayName = self::productDisplayName($product->name_ru, $product->name);
            $isAvailable = $product->stock_quantity >= $requestedQuantity;

            if ($product->stock_quantity <= 0) {
                $errors[] = "«{$displayName}» закончился на складе.";
            } elseif (!$isAvailable) {
                $errors[] = "«{$displayName}»: на складе {$product->stock_quantity} шт., в корзине {$requestedQuantity}.";
            }

            $lines[] = [
                'productId'         => $productId,
                'productName'       => $displayName,
                'requestedQuantity' => $requestedQuantity,
                'availableQuantity' => $product->stock_quantity,
                'isAvailable'       => $isAvailable && $product->stock_quantity > 0,
            ];
        }

        return [
            'isValid' => empty($errors),
            'errors'  => $errors,
            'lines'   => $lines,
        ];
    }

    private static function productDisplayName(string $nameRu, string $name): string
    {
        return trim($nameRu) !== '' ? trim($nameRu) : $name;
    }
}
