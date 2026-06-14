<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Audit::query()->with('user:id,name,email')->latest();

        if ($event = $request->get('event')) {
            $query->where('event', $event);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                  ->orWhere('auditable_type', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }
        if ($dateFrom = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $activities = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data'  => $activities->items(),
            'meta'  => [
                'current_page' => $activities->currentPage(),
                'last_page'    => $activities->lastPage(),
                'per_page'     => $activities->perPage(),
                'total'        => $activities->total(),
                'from'         => $activities->firstItem(),
                'to'           => $activities->lastItem(),
            ],
            'links' => [
                'first' => $activities->url(1),
                'last'  => $activities->url($activities->lastPage()),
                'prev'  => $activities->previousPageUrl(),
                'next'  => $activities->nextPageUrl(),
            ],
        ]);
    }

    public function show($id): JsonResponse
    {
        $activity = Audit::with('user:id,name,email')->findOrFail($id);
        return response()->json(['data' => $activity]);
    }
}
