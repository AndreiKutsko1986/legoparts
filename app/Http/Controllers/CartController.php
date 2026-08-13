<?php

namespace App\Http\Controllers;

use App\Services\CartValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function validate(Request $request): JsonResponse
    {
        $result = CartValidation::validate($request->json()->all());
        return response()->json($result);
    }
}
