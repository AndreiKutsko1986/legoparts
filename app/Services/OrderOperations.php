<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderOperations
{
    public static function mapOrder(Order $order): array
    {
        $order->loadMissing('items');

        return [
            'id'              => $order->id,
            'orderNumber'     => $order->order_number,
            'customerName'    => $order->customer_name,
            'customerEmail'   => $order->customer_email,
            'customerPhone'   => $order->customer_phone,
            'shippingAddress' => $order->shipping_address,
            'notes'           => $order->notes,
            'status'          => $order->status,
            'totalAmount'     => (float) $order->total_amount,
            'createdAt'       => $order->created_at->toIso8601String(),
            'items'           => $order->items->map(fn (OrderItem $item) => [
                'productId'   => $item->product_id,
                'productName' => $item->product_name,
                'productSku'  => $item->product_sku,
                'quantity'    => $item->quantity,
                'unitPrice'   => (float) $item->unit_price,
                'lineTotal'   => $item->line_total,
            ])->values()->all(),
        ];
    }

    public static function createOrder(array $data): array
    {
        $qtyByProduct = self::aggregateQuantities($data['items'] ?? []);

        foreach ($qtyByProduct as $qty) {
            if ($qty <= 0) {
                return [null, 'Количество должно быть больше нуля.'];
            }
        }

        DB::statement('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        return DB::transaction(function () use ($data, $qtyByProduct) {
            $productIds = array_keys($qtyByProduct);

            $products = Product::whereIn('id', $productIds)
                ->where('is_active', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($productIds)) {
                return [null, 'Один или несколько товаров не найдены.'];
            }

            foreach ($qtyByProduct as $productId => $quantity) {
                $product = $products[$productId];
                if ($product->stock_quantity < $quantity) {
                    return [null, "Недостаточно «{$product->name}» на складе: доступно {$product->stock_quantity}, запрошено {$quantity}."];
                }
            }

            $order = new Order([
                'id'               => (string) Str::uuid(),
                'order_number'     => self::generateOrderNumber(),
                'customer_name'    => trim($data['customerName']),
                'customer_email'   => trim($data['customerEmail']),
                'customer_phone'   => isset($data['customerPhone']) && trim($data['customerPhone']) !== '' ? trim($data['customerPhone']) : null,
                'shipping_address' => trim($data['shippingAddress']),
                'notes'            => isset($data['notes']) && trim($data['notes']) !== '' ? trim($data['notes']) : null,
                'status'           => 'Pending',
                'created_at'       => now(),
            ]);

            $total = 0.0;
            $items = [];

            foreach ($qtyByProduct as $productId => $quantity) {
                $product = $products[$productId];
                $product->stock_quantity -= $quantity;
                $product->save();

                $lineTotal = (float) $product->price * $quantity;
                $total    += $lineTotal;

                $items[] = new OrderItem([
                    'id'           => (string) Str::uuid(),
                    'order_id'     => $order->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'product_sku'  => $product->sku,
                    'quantity'     => $quantity,
                    'unit_price'   => $product->price,
                ]);
            }

            $order->total_amount = $total;
            $order->save();

            foreach ($items as $item) {
                $item->save();
            }

            $order->setRelation('items', collect($items));
            return [$order, null];
        });
    }

    public static function createAdminOrder(array $data): array
    {
        $qtyByProduct = self::aggregateQuantities($data['items'] ?? []);

        foreach ($qtyByProduct as $qty) {
            if ($qty <= 0) {
                return [null, 'Количество должно быть больше нуля.'];
            }
        }

        DB::statement('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        return DB::transaction(function () use ($data, $qtyByProduct) {
            $productIds = array_keys($qtyByProduct);

            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($productIds)) {
                return [null, 'Один или несколько товаров не найдены.'];
            }

            foreach ($qtyByProduct as $productId => $quantity) {
                $product = $products[$productId];
                if ($product->stock_quantity < $quantity) {
                    $name = trim($product->name_ru) !== '' ? trim($product->name_ru) : $product->name;
                    return [null, "Недостаточно «{$name}» на складе: доступно {$product->stock_quantity}, запрошено {$quantity}."];
                }
            }

            $markAsCompleted = (bool) ($data['markAsCompleted'] ?? false);

            $order = new Order([
                'id'               => (string) Str::uuid(),
                'order_number'     => self::generateOrderNumber(),
                'customer_name'    => isset($data['customerName']) && trim($data['customerName']) !== '' ? trim($data['customerName']) : 'Покупатель',
                'customer_email'   => '',
                'shipping_address' => 'Продажа вне сайта',
                'notes'            => isset($data['notes']) && trim($data['notes']) !== '' ? trim($data['notes']) : null,
                'status'           => $markAsCompleted ? 'Delivered' : 'Pending',
                'created_at'       => now(),
            ]);

            $total = 0.0;
            $items = [];

            foreach ($qtyByProduct as $productId => $quantity) {
                $product = $products[$productId];
                $product->stock_quantity -= $quantity;
                $product->save();

                $total += (float) $product->price * $quantity;

                $items[] = new OrderItem([
                    'id'           => (string) Str::uuid(),
                    'order_id'     => $order->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'product_sku'  => $product->sku,
                    'quantity'     => $quantity,
                    'unit_price'   => $product->price,
                ]);
            }

            if ($markAsCompleted) {
                foreach ($items as $item) {
                    $product = $products[$item->product_id];
                    $product->sold_quantity += $item->quantity;
                    $product->save();
                }
            }

            $order->total_amount = $total;
            $order->save();

            foreach ($items as $item) {
                $item->save();
            }

            $order->setRelation('items', collect($items));
            return [$order, null];
        });
    }

    public static function updateStatus(string $orderId, string $newStatus): array
    {
        DB::statement('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        return DB::transaction(function () use ($orderId, $newStatus) {
            $order = Order::with('items')->lockForUpdate()->find($orderId);

            if (!$order) {
                return [null, 'Заказ не найден.'];
            }

            $previousStatus = $order->status;

            if ($previousStatus === $newStatus) {
                return [$order, null];
            }

            if ($previousStatus === 'Delivered') {
                return [null, 'Нельзя изменить статус доставленного заказа.'];
            }

            if ($newStatus === 'Cancelled') {
                if (in_array($previousStatus, ['Shipped', 'Delivered'], true)) {
                    return [null, 'Нельзя отменить заказ после отправки или доставки.'];
                }
                if ($previousStatus !== 'Cancelled') {
                    self::restoreStock($order);
                }
            } elseif ($previousStatus === 'Cancelled') {
                return [null, 'Нельзя изменить статус отменённого заказа.'];
            } elseif ($newStatus === 'Delivered') {
                self::recordSoldQuantities($order);
            }

            $order->status = $newStatus;
            $order->save();

            return [$order, null];
        });
    }

    private static function recordSoldQuantities(Order $order): void
    {
        $productIds = $order->items->pluck('product_id')->unique()->all();
        $products   = Product::whereIn('id', $productIds)->get()->keyBy('id');

        foreach ($order->items as $item) {
            if (isset($products[$item->product_id])) {
                $products[$item->product_id]->sold_quantity += $item->quantity;
                $products[$item->product_id]->save();
            }
        }
    }

    private static function restoreStock(Order $order): void
    {
        $productIds = $order->items->pluck('product_id')->unique()->all();
        $products   = Product::whereIn('id', $productIds)->get()->keyBy('id');

        foreach ($order->items as $item) {
            if (isset($products[$item->product_id])) {
                $products[$item->product_id]->stock_quantity += $item->quantity;
                $products[$item->product_id]->save();
            }
        }
    }

    private static function aggregateQuantities(array $items): array
    {
        $result = [];
        foreach ($items as $item) {
            $pid = $item['productId'] ?? null;
            $qty = (int) ($item['quantity'] ?? 0);
            if ($pid !== null) {
                $result[$pid] = ($result[$pid] ?? 0) + $qty;
            }
        }
        return $result;
    }

    private static function generateOrderNumber(): string
    {
        $date = date('Ymd');
        $rand = strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 8));
        return "LP-{$date}-{$rand}";
    }
}
