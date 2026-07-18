<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Resources\CompanyResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount('companies');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($request->has('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($role = $request->get('role')) {
            $query->where('role', $role);
        }

        $users = $query->latest()->paginate($request->get('per_page', 20));
        $items = UserResource::collection($users);

        return response()->json([
            'data'  => $items->collection,
            'meta'  => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'from'         => $users->firstItem(),
                'to'           => $users->lastItem(),
            ],
            'links' => [
                'first' => $users->url(1),
                'last'  => $users->url($users->lastPage()),
                'prev'  => $users->previousPageUrl(),
                'next'  => $users->nextPageUrl(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role'     => 'nullable|in:super_admin,admin,user',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role'     => $data['role'] ?? 'user',
            'active'   => true,
        ]);

        if ($request->filled('company_id')) {
            $user->companies()->attach($request->company_id, [
                'role'       => 'member',
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'data' => new UserResource($user)
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount('companies');
        return response()->json([
            'data' => new UserResource($user)
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role'  => 'nullable|in:super_admin,admin,user',
        ]);

        $user->update($data);
        return response()->json([
            'data' => new UserResource($user->fresh())
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'لا يمكنك حذف حسابك الخاص'], 422);
        }
        $user->delete();
        return response()->json(null, 204);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete();
        return response()->json(['message' => 'تم تغيير كلمة المرور وإلغاء جميع الجلسات']);
    }

    public function toggleActive(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'لا يمكنك تعطيل حسابك الخاص'], 422);
        }

        $user->update(['active' => !$user->active]);
        return response()->json([
            'data'    => new UserResource($user->fresh()),
            'message' => $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم'
        ]);
    }

    public function toggleApproval(User $user): JsonResponse
    {
        $user->update(['is_approved' => !$user->is_approved]);
        return response()->json([
            'data'    => new UserResource($user->fresh()),
            'message' => $user->is_approved ? 'تم تفعيل الحساب' : 'تم إلغاء تفعيل الحساب'
        ]);
    }

    public function companies(User $user): JsonResponse
    {
        $companies = $user->companies()->withPivot(['role', 'active'])->get();
        return response()->json([
            'data' => CompanyResource::collection($companies)
        ]);
    }
}
