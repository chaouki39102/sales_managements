<?php

use App\Http\Middleware\SetCompanyContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    // bootstrap/app.php
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
        $middleware->alias([
            'company'       => \App\Http\Middleware\SetCompanyContext::class,
            'api.auth'      => \App\Http\Middleware\ApiAuthenticate::class,   // ← اختياري مع sanctum
            'super.admin'   => \App\Http\Middleware\SuperAdminOnly::class,    // ← جديد
            'portal.auth'   => \App\Http\Middleware\PortalAuthenticate::class, // ← بوابة الزبائن
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
