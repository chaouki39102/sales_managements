<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AdminApprovalController extends Controller
{
    public function pending(Request $request): JsonResponse
    {
        $query = User::where('is_approved', false)
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'super-admin'));

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $paginated = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        $items = $paginated->getCollection()->map(fn(User $u) => [
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'created_at' => $u->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'data'  => $items,
            'meta'  => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
                'from'         => $paginated->firstItem(),
                'to'           => $paginated->lastItem(),
            ],
            'links' => [
                'first' => $paginated->url(1),
                'last'  => $paginated->url($paginated->lastPage()),
                'prev'  => $paginated->previousPageUrl(),
                'next'  => $paginated->nextPageUrl(),
            ],
        ]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('is_approved', false)->findOrFail($id);
        $user->update(['is_approved' => true]);

        try {
            app(MailConfigService::class)->apply();
            Mail::to($user->email)->send(new \App\Mail\AccountApproved($user));
        } catch (\Throwable $e) {
            Log::warning('Failed to send approval email to user #' . $user->id . ': ' . $e->getMessage());
        }

        return response()->json(['message' => 'تم تفعيل الحساب بنجاح']);
    }

    public function reject(int $id): JsonResponse
    {
        $user = User::where('is_approved', false)->findOrFail($id);

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json(['message' => 'تم رفض الحساب وحذفه']);
    }

    public function bulkApprove(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:users,id',
        ]);

        $users = User::whereIn('id', $data['ids'])
            ->where('is_approved', false)
            ->get();

        if ($users->isEmpty()) {
            return response()->json(['message' => 'لا يوجد مستخدمون قيد المراجعة'], 422);
        }

        $count = 0;
        foreach ($users as $user) {
            $user->update(['is_approved' => true]);
            $count++;
            try {
                app(MailConfigService::class)->apply();
                Mail::to($user->email)->send(new \App\Mail\AccountApproved($user));
            } catch (\Throwable $e) {
                Log::warning('Failed to send approval email to user #' . $user->id . ': ' . $e->getMessage());
            }
        }

        return response()->json(['message' => "تم تفعيل {$count} حساب بنجاح", 'count' => $count]);
    }

    public function bulkReject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:users,id',
        ]);

        $users = User::whereIn('id', $data['ids'])
            ->where('is_approved', false)
            ->get();

        if ($users->isEmpty()) {
            return response()->json(['message' => 'لا يوجد مستخدمون قيد المراجعة'], 422);
        }

        $count = 0;
        DB::transaction(function () use ($users, &$count) {
            foreach ($users as $user) {
                $user->tokens()->delete();
                $user->delete();
                $count++;
            }
        });

        return response()->json(['message' => "تم رفض وحذف {$count} حساب", 'count' => $count]);
    }
}
