<?php

namespace App\Http\Controllers;

use App\Services\OrderOperations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdersController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'customerName'      => 'required|string|max:200',
            'customerEmail'     => 'required|email|max:200',
            'customerPhone'     => 'nullable|string|max:50',
            'shippingAddress'   => 'required|string|max:1000',
            'notes'             => 'nullable|string|max:4000',
            'items'             => 'required|array|min:1|max:200',
            'items.*.productId' => 'required|string',
            'items.*.quantity'  => 'required|integer|min:1',
        ]);

        [$order, $error] = OrderOperations::createOrder($request->all());

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json(OrderOperations::mapOrder($order), 201);
    }
}
