<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCompanyController extends Controller
{
    private function findCompany(int $id): Company
    {
        return Company::withCount('users')->with('owner:id,name,email')->findOrFail($id);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->withCount('users')
            ->with('owner:id,name,email');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            match ($status) {
                'active'     => $query->where('active', true)->whereNull('suspended_at'),
                'suspended'  => $query->whereNotNull('suspended_at'),
                'inactive'   => $query->where('active', false),
                'verified'   => $query->whereNotNull('verified_at'),
                'unverified' => $query->whereNull('verified_at'),
                default      => null,
            };
        }

        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }

        $sortBy = in_array($request->get('sort_by'), ['name', 'created_at', 'users_count'])
                    ? $request->get('sort_by')
                    : 'created_at';
        $sortDir = $request->get('sort_dir', 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        $companies = $query->paginate($request->get('per_page', 20));
        $items = CompanyResource::collection($companies);

        return response()->json([
            'data'  => $items->collection,
            'meta'  => [
                'current_page' => $companies->currentPage(),
                'last_page'    => $companies->lastPage(),
                'per_page'     => $companies->perPage(),
                'total'        => $companies->total(),
                'from'         => $companies->firstItem(),
                'to'           => $companies->lastItem(),
            ],
            'links' => [
                'first' => $companies->url(1),
                'last'  => $companies->url($companies->lastPage()),
                'prev'  => $companies->previousPageUrl(),
                'next'  => $companies->nextPageUrl(),
            ],
        ]);
    }

    public function show(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        return response()->json([
            'data' => new CompanyResource($company)
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:100',
            'plan' => 'required|string|max:50',
            'max_users'      => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
        ]);

        $company = Company::create($data + ['owner_id' => auth()->id()]);
        return response()->json([
            'data' => new CompanyResource($company)
        ], 201);
    }

    public function update(Request $request, int $companyId): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:100',
            'active' => 'sometimes|boolean',
        ]);

        $company = $this->findCompany($companyId);
        $company->update($data);
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function destroy(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->delete();
        return response()->json(null, 204);
    }

    public function suspend(Request $request, int $companyId): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $company = $this->findCompany($companyId);
        $company->suspend($data['reason'], auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function unsuspend(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->unsuspend();
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function activate(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->activate();
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function deactivate(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->deactivate(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function verify(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->verify(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function unverify(int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->unverify();
        return response()->json(['message' => 'تم إلغاء التوثيق']);
    }

    public function changePlan(Request $request, int $companyId): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['required', 'string', 'max:50'],
            'max_users'      => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
        ]);

        $company = $this->findCompany($companyId);

        $customLimits = array_filter([
            'max_users'      => $data['max_users']      ?? null,
            'max_warehouses' => $data['max_warehouses'] ?? null,
            'max_products'   => $data['max_products']   ?? null,
        ]);

        $company->upgradePlan($data['plan'], $customLimits ?: null);
        return response()->json([
            'data' => new CompanyResource($company->fresh()->loadCount('users')->load('owner:id,name,email'))
        ]);
    }

    public function updateNotes(Request $request, int $companyId): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:5000']);
        $company = $this->findCompany($companyId);
        $company->update(['notes' => $data['notes']]);
        return response()->json(['message' => 'تم تحديث الملاحظات']);
    }

    public function users(Request $request, int $companyId): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $users = $company->users()
            ->withPivot(['role', 'active', 'created_at'])
            ->orderByPivot('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

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

    public function addUser(Request $request, int $companyId): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|max:50',
        ]);

        $company = $this->findCompany($companyId);

        if (DB::table('company_user')->where('company_id', $company->id)->where('user_id', $data['user_id'])->exists()) {
            return response()->json(['message' => 'المستخدم موجود بالفعل'], 422);
        }

        $company->users()->attach($data['user_id'], [
            'role'       => $data['role'] ?? 'member',
            'active'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'تمت إضافة المستخدم للشركة'], 201);
    }

    public function removeUser(int $companyId, User $user): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $company->users()->detach($user->id);
        return response()->json(['message' => 'تم إزالة المستخدم من الشركة']);
    }

    public function toggleUserStatus(int $companyId, User $user): JsonResponse
    {
        $company = $this->findCompany($companyId);
        $membership = DB::table('company_user')
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json(['message' => 'المستخدم ليس عضواً في هذه الشركة'], 404);
        }

        $newStatus = !$membership->active;
        DB::table('company_user')
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->update(['active' => $newStatus, 'updated_at' => now()]);

        return response()->json([
            'data'    => ['active' => $newStatus],
            'message' => $newStatus ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
        ]);
    }

    // ─── Bulk Actions ───────────────────────────────────────────────────

    public function bulkSuspend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:companies,id',
            'reason' => 'required|string|max:500',
        ]);

        $companies = Company::whereIn('id', $data['ids'])->whereNull('suspended_at')->get();
        $count = 0;
        foreach ($companies as $company) {
            $company->suspend($data['reason'], auth()->id());
            $count++;
        }
        return response()->json(['message' => "تم إيقاف {$count} شركة", 'count' => $count]);
    }

    public function bulkUnsuspend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:companies,id',
        ]);

        $companies = Company::whereIn('id', $data['ids'])->whereNotNull('suspended_at')->get();
        $count = 0;
        foreach ($companies as $company) {
            $company->unsuspend();
            $count++;
        }
        return response()->json(['message' => "تم إعادة تفعيل {$count} شركة", 'count' => $count]);
    }

    public function bulkVerify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:companies,id',
        ]);

        $companies = Company::whereIn('id', $data['ids'])->whereNull('verified_at')->get();
        $count = 0;
        foreach ($companies as $company) {
            $company->verify(auth()->id());
            $count++;
        }
        return response()->json(['message' => "تم توثيق {$count} شركة", 'count' => $count]);
    }

    public function bulkDeactivate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:companies,id',
        ]);

        $companies = Company::whereIn('id', $data['ids'])->where('active', true)->get();
        $count = 0;
        foreach ($companies as $company) {
            $company->deactivate(auth()->id());
            $count++;
        }
        return response()->json(['message' => "تم تعطيل {$count} شركة", 'count' => $count]);
    }

    public function bulkActivate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:companies,id',
        ]);

        $companies = Company::whereIn('id', $data['ids'])->where('active', false)->get();
        $count = 0;
        foreach ($companies as $company) {
            $company->activate();
            $count++;
        }
        return response()->json(['message' => "تم تفعيل {$count} شركة", 'count' => $count]);
    }

    public function export(Request $request): JsonResponse
    {
        $query = Company::query()->whereNull('deleted_at');

        if ($status = $request->get('status')) {
            match ($status) {
                'active'     => $query->where('active', true)->whereNull('suspended_at'),
                'suspended'  => $query->whereNotNull('suspended_at'),
                'inactive'   => $query->where('active', false),
                'verified'   => $query->whereNotNull('verified_at'),
                'unverified' => $query->whereNull('verified_at'),
                default      => null,
            };
        }
        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }

        $companies = $query->select('id', 'name', 'slug', 'email', 'phone', 'plan', 'active', 'suspended_at', 'verified_at', 'created_at')
            ->withCount('users')
            ->orderBy('created_at', 'desc')
            ->limit(5000)
            ->get();

        return response()->json([
            'data' => $companies->map(fn($c) => [
                'id'         => $c->id,
                'name'       => $c->name,
                'slug'       => $c->slug,
                'email'      => $c->email,
                'phone'      => $c->phone,
                'plan'       => $c->plan,
                'active'     => $c->active,
                'verified'   => !is_null($c->verified_at),
                'suspended'  => !is_null($c->suspended_at),
                'users_count' => $c->users_count,
                'created_at' => $c->created_at?->toIso8601String(),
            ]),
            'total' => $companies->count(),
        ]);
    }
}
