<?php

namespace App\Http\Middleware;

use App\Services\AdminAccessValidator;
use App\Support\AdminAuthentication;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminApiKeyMiddleware
{
    public function __construct(private AdminAccessValidator $validator) {}

    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->getPathInfo();

        if (!str_starts_with(strtolower($path), '/api/admin')) {
            return $next($request);
        }

        if (str_starts_with(strtolower($path), '/api/admin/auth')) {
            return $next($request);
        }

        $providedKey = $request->header(AdminAuthentication::KEY_HEADER);

        if (empty($providedKey)) {
            $providedKey = $request->cookies->get(AdminAuthentication::COOKIE_NAME);
        }

        if (!$this->validator->isAuthorized($providedKey ?: null)) {
            return response()->json(['message' => 'Неверный API-ключ администратора.'], 401);
        }

        return $next($request);
    }
}
