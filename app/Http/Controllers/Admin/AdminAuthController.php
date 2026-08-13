<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Services\AdminAccessValidator;
use App\Support\AdminAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminAuthController extends Controller
{
    public function __construct(private AdminAccessValidator $validator) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login'    => 'required|string|max:200',
            'password' => 'required|string|max:200',
        ]);

        $user = AdminUser::where('login', $request->input('login'))
            ->where('is_active', true)
            ->first();

        if (!$user || !password_verify($request->input('password'), $user->password_hash)) {
            return response()->json(['message' => 'Неверный логин или пароль.'], 401);
        }

        $opts   = AdminAuthentication::cookieOptions();
        $cookie = cookie(
            AdminAuthentication::COOKIE_NAME,
            $user->api_key,
            $opts['minutes'],
            $opts['path'],
            $opts['domain'],
            $opts['secure'],
            $opts['httpOnly'],
            false,
            $opts['sameSite'],
        );

        return response()->json(['message' => 'Авторизован успешно.'])->withCookie($cookie);
    }

    public function verify(Request $request): JsonResponse
    {
        $providedKey = $request->cookies->get(AdminAuthentication::COOKIE_NAME);

        if (!$this->validator->isAuthorized($providedKey ?: null)) {
            return response()->json(['message' => 'Неверный API-ключ администратора.'], 401);
        }

        return response()->json(['message' => 'OK']);
    }

    public function logout(): Response
    {
        return response()->noContent()->withoutCookie(AdminAuthentication::COOKIE_NAME);
    }
}
