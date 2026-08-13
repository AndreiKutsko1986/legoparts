<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderOperations;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrdersController extends Controller
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

        $status = $request->query('status');
        $query  = Order::with('items');

        if ($status) {
            $query->where('status', $status);
        }

        $total  = $query->count();
        $orders = $query->orderByDesc('created_at')->skip($skip)->take($take)->get();

        return response()->json(
            $orders->map(fn (Order $o) => OrderOperations::mapOrder($o))->values()->all()
        )->header('X-Total-Count', $total);
    }

    public function show(string $id): JsonResponse
    {
        $order = Order::with('items')->findOrFail($id);
        return response()->json(OrderOperations::mapOrder($order));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'customerName'      => 'nullable|string|max:200',
            'notes'             => 'nullable|string|max:4000',
            'markAsCompleted'   => 'nullable|boolean',
            'items'             => 'required|array|min:1|max:200',
            'items.*.productId' => 'required|string',
            'items.*.quantity'  => 'required|integer|min:1',
        ]);

        [$order, $error] = OrderOperations::createAdminOrder($request->all());

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json(OrderOperations::mapOrder($order), 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|string|in:Pending,Processing,Shipped,Delivered,Cancelled',
        ]);

        [$order, $error] = OrderOperations::updateStatus($id, $data['status']);

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json(OrderOperations::mapOrder($order));
    }
}
