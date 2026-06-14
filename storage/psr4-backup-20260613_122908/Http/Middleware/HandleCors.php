<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\HandleCors as Middleware;

class HandleCors extends Middleware
{
    /**
     * The URIs that should be excluded from CORS.
     *
     * @var array
     */
    protected $except = [];

    public function handle($request, $next)
    {
        return parent::handle($request, $next);
    }
}
