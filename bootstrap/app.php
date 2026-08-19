<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        then: function () {
            \Illuminate\Support\Facades\Route::middleware([])
                ->group(base_path('routes/media.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // If behind a load balancer or reverse proxy, set its IP here instead of '*'
        // e.g. $middleware->trustProxies(at: '203.0.113.5');
        // On shared hosting with no proxy, this line can be removed entirely.
        $middleware->trustProxies(at: '127.0.0.1');

        $middleware->alias([
            'admin.auth' => \App\Http\Middleware\AdminApiKeyMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (
            \Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e,
            \Illuminate\Http\Request $request
        ) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Not found.'], 404);
            }
        });

        $exceptions->render(function (
            \Illuminate\Validation\ValidationException $e,
            \Illuminate\Http\Request $request
        ) {
            if ($request->is('api/*')) {
                $first = collect($e->errors())->flatten()->first() ?? 'Validation error.';
                return response()->json(['message' => $first], 422);
            }
        });
    })->create();
