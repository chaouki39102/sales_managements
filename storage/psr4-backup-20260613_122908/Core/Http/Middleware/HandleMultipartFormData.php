<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleMultipartFormData
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if this is a multipart form data request
        if ($request->header('Content-Type') && str_contains($request->header('Content-Type'), 'multipart/form-data')) {
            // Parse the raw input manually if needed
            $rawInput = $request->getContent();

            // If the request body is empty but we have files, try to parse the form data
            if (empty($request->all()) && !empty($request->allFiles())) {
                // This will force Laravel to parse the multipart form data
                $request->merge($request->post());
            }
        }

        return $next($request);
    }
}
