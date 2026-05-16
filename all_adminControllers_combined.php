<?php

// دمج تلقائي لكل ملفات الـ Controllers



// ===== ملف: AdminActivityController.php =====
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




// ===== ملف: AdminCompanyController.php =====
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

    public function show(Company $company): JsonResponse
    {
        $company->loadCount('users')->load('owner:id,name,email');
        return response()->json([
            'data' => new CompanyResource($company)
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:100',
            'plan' => 'required|in:free,starter,professional,enterprise',
            'max_users'      => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
        ]);

        $company = Company::create($data + ['owner_id' => auth()->id()]);
        return response()->json([
            'data' => new CompanyResource($company)
        ], 201);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:100',
            'active' => 'sometimes|boolean',
        ]);

        $company->update($data);
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function destroy(Company $company): JsonResponse
    {
        $company->delete();
        return response()->json(null, 204);
    }

    public function suspend(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $company->suspend($data['reason'], auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function unsuspend(Company $company): JsonResponse
    {
        $company->unsuspend();
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function activate(Company $company): JsonResponse
    {
        $company->activate();
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function deactivate(Company $company): JsonResponse
    {
        $company->deactivate(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function verify(Company $company): JsonResponse
    {
        $company->verify(auth()->id());
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function unverify(Company $company): JsonResponse
    {
        $company->unverify();
        return response()->json(['message' => 'تم إلغاء التوثيق']);
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['required', 'string', 'in:free,starter,professional,enterprise'],
            'max_users'      => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
        ]);

        $customLimits = array_filter([
            'max_users'      => $data['max_users']      ?? null,
            'max_warehouses' => $data['max_warehouses'] ?? null,
            'max_products'   => $data['max_products']   ?? null,
        ]);

        $company->upgradePlan($data['plan'], $customLimits ?: null);
        return response()->json([
            'data' => new CompanyResource($company->fresh())
        ]);
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:5000']);
        $company->update(['notes' => $data['notes']]);
        return response()->json(['message' => 'تم تحديث الملاحظات']);
    }

    public function users(Request $request, Company $company): JsonResponse
    {
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

    public function addUser(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|max:50',
        ]);

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

    public function removeUser(Company $company, User $user): JsonResponse
    {
        $company->users()->detach($user->id);
        return response()->json(['message' => 'تم إزالة المستخدم من الشركة']);
    }

    public function toggleUserStatus(Company $company, User $user): JsonResponse
    {
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
}




// ===== ملف: AdminDashboardController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $companiesTotal     = DB::table('companies')->whereNull('deleted_at')->count();
        $companiesActive    = DB::table('companies')->whereNull('deleted_at')->where('active', true)->whereNull('suspended_at')->count();
        $companiesSuspended = DB::table('companies')->whereNull('deleted_at')->whereNotNull('suspended_at')->count();
        $companiesVerified  = DB::table('companies')->whereNull('deleted_at')->whereNotNull('verified_at')->count();

        $byPlan = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        $usersTotal        = DB::table('users')->whereNull('deleted_at')->count();
        $usersActive       = DB::table('users')->whereNull('deleted_at')->where('active', true)->count();
        $usersNewThisMonth = DB::table('users')
            ->whereNull('deleted_at')
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();

        $recentCompanies = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'slug', 'email', 'phone', 'plan', 'active', 'suspended_at', 'verified_at', 'owner_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($co) {
                $co->users_count = DB::table('company_user')->where('company_id', $co->id)->where('active', true)->count();
                $co->is_suspended = !is_null($co->suspended_at);
                $co->owner = $co->owner_id
                    ? DB::table('users')->where('id', $co->owner_id)->select('id', 'name', 'email')->first()
                    : null;
                return $co;
            });

        $recentUsers = DB::table('users')
            ->whereNull('deleted_at')
            ->select('id', 'name', 'email', 'active', 'created_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'companies' => [
                    'total'     => $companiesTotal,
                    'active'    => $companiesActive,
                    'suspended' => $companiesSuspended,
                    'verified'  => $companiesVerified,
                    'by_plan'   => $byPlan,
                ],
                'users' => [
                    'total'          => $usersTotal,
                    'active'         => $usersActive,
                    'new_this_month' => $usersNewThisMonth,
                ],
                'recent_companies' => $recentCompanies,
                'recent_users'     => $recentUsers,
            ],
        ]);
    }
}




// ===== ملف: AdminImpersonateController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminImpersonateController extends Controller
{
    use ApiResponders;

    /**
     * بدء جلسة impersonation كمستخدم آخر
     */
    public function start(User $user): JsonResponse
    {
        if ($user->hasRole(User::ROLE_SUPER_ADMIN)) {
            return $this->errorResponse('لا يمكن انتحال هوية مدير النظام', 422, 'AUTHORIZATION_ERROR');
        }

        try {
            $adminToken = auth()->user()->currentAccessToken()->token ?? null;
            session(['impersonating_as' => $user->id, 'admin_token' => $adminToken]);

            $token = $user->createToken('impersonate_' . auth()->id(), ['impersonated'])->plainTextToken;

            return $this->successResponse([
                'token'      => $token,
                'user'       => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ],
                'message'    => "أنت تتصفح النظام كـ [{$user->name}]",
            ], 'تم الدخول بهوية المستخدم');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل انتحال الهوية', 500, 'SERVER_ERROR');
        }
    }

    /**
     * إنهاء جلسة impersonation والعودة للحساب الأصلي
     */
    public function stop(): JsonResponse
    {
        try {
            auth()->user()->tokens()->where('name', 'like', 'impersonate_%')->delete();
            session()->forget(['impersonating_as', 'admin_token']);

            return $this->successResponse(null, 'تم العودة لحسابك الأصلي');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الخروج', 500, 'SERVER_ERROR');
        }
    }
}




// ===== ملف: AdminMaintenanceController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class AdminMaintenanceController extends Controller
{
    /**
     * حالة وضع الصيانة الحالية.
     */
    public function status(): JsonResponse
    {
        $down = app()->isDownForMaintenance();
        return response()->json([
            'data' => [
                'maintenance_mode' => $down,
                'message' => $down ? (Cache::get('maintenance.message') ?? 'النظام تحت الصيانة') : null,
            ]
        ]);
    }

    /**
     * تفعيل وضع الصيانة.
     */
    public function enable(): JsonResponse
    {
        $message = request()->input('message', 'النظام تحت الصيانة حالياً، يرجى المحاولة لاحقاً');
        Artisan::call('down', [
            '--message' => $message,
            '--retry' => 60,
        ]);
        return response()->json(['message' => 'تم تفعيل وضع الصيانة']);
    }

    /**
     * إلغاء وضع الصيانة.
     */
    public function disable(): JsonResponse
    {
        Artisan::call('up');
        return response()->json(['message' => 'تم إلغاء وضع الصيانة']);
    }

    /**
     * مسح الكاش العام.
     */
    public function clearCache(): JsonResponse
    {
        Artisan::call('optimize:clear');
        return response()->json(['message' => 'تم مسح الكاش بنجاح']);
    }
}




// ===== ملف: AdminPlanController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPlanController extends Controller
{
    // تعريف الخطط الثابتة
    private const PLANS = [
        'free'         => ['label' => 'مجاني',    'max_users' => 1,   'max_products' => 100,   'max_warehouses' => 1],
        'starter'      => ['label' => 'مبتدئ',    'max_users' => 5,   'max_products' => 500,   'max_warehouses' => 1],
        'professional' => ['label' => 'احترافي',  'max_users' => 15,  'max_products' => 5000,  'max_warehouses' => 5],
        'enterprise'   => ['label' => 'مؤسسة',    'max_users' => 50,  'max_products' => 0,     'max_warehouses' => 20],
        'custom'       => ['label' => 'مخصص',     'max_users' => 0,   'max_products' => 0,     'max_warehouses' => 0],
    ];

    // GET /admin/plans
    public function index(): JsonResponse
    {
        // احسب عدد الشركات في كل خطة
        $counts = DB::table('companies')
            ->whereNull('deleted_at')
            ->select('plan', DB::raw('count(*) as total'))
            ->groupBy('plan')
            ->pluck('total', 'plan')
            ->toArray();

        $plans = collect(self::PLANS)->map(function ($plan, $key) use ($counts) {
            return [
                'key'            => $key,
                'label'          => $plan['label'],
                'max_users'      => $plan['max_users'],
                'max_products'   => $plan['max_products'],
                'max_warehouses' => $plan['max_warehouses'],
                'companies_count'=> $counts[$key] ?? 0,
            ];
        })->values();

        return response()->json(['data' => $plans]);
    }

    // GET /admin/plans/{plan}
    public function show(string $plan): JsonResponse
    {
        if (!isset(self::PLANS[$plan])) {
            return response()->json(['message' => 'الخطة غير موجودة'], 404);
        }

        $count = DB::table('companies')
            ->whereNull('deleted_at')
            ->where('plan', $plan)
            ->count();

        return response()->json([
            'data' => array_merge(
                ['key' => $plan, 'companies_count' => $count],
                self::PLANS[$plan]
            ),
        ]);
    }

    // POST /admin/plans (للمستقبل — حالياً الخطط ثابتة)
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'الخطط ثابتة في هذا الإصدار'], 422);
    }

    // PUT /admin/plans/{plan}
    public function update(Request $request, string $plan): JsonResponse
    {
        return response()->json(['message' => 'الخطط ثابتة في هذا الإصدار'], 422);
    }
}




// ===== ملف: AdminSeedController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\CompanyRoleService;
use Database\Seeders\GlobalRolesAndPermissionsSeeder;
use Database\Seeders\WilayaCommuneSeeder;
use Database\Seeders\CompanySeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AdminSeedController
 * ══════════════════════════════════════════════════════════════════
 * Routes (كلها تحت middleware auth:sanctum + super.admin):
 *
 *   POST /api/v1/admin/seed/global
 *       ← تشغيل GlobalSeeder (ولايات + صلاحيات + super-admin)
 *       ← آمن للتكرار (firstOrCreate / upsert / truncate+reinsert)
 *
 *   POST /api/v1/admin/seed/wilayas
 *       ← إعادة بذر الولايات والبلديات فقط
 *
 *   POST /api/v1/admin/seed/permissions
 *       ← إعادة مزامنة الصلاحيات ودور super-admin فقط
 *
 *   POST /api/v1/admin/companies/{company}/seed
 *       ← بذر بيانات شركة محددة كاملاً (idempotent)
 *
 *   POST /api/v1/admin/companies/{company}/seed/{seeder}
 *       ← بذر جدول واحد لشركة محددة
 * ══════════════════════════════════════════════════════════════════
 */
class AdminSeedController extends Controller
{
    // خريطة السيدرات المتاحة لكل شركة
    private const COMPANY_SEEDERS = [
        'currencies'                  => [\Database\Seeders\CurrencySeeder::class,                 'currencies'],
        'tvas'                        => [\Database\Seeders\TvaSeeder::class,                      'tvas'],
        'units'                       => [\Database\Seeders\UnitSeeder::class,                     'units'],
        'legal-forms'                 => [\Database\Seeders\LegalFormSeeder::class,                'legal_forms'],
        'fiscal-stamps'               => [\Database\Seeders\FiscalStampSeeder::class,              'fiscal_stamps'],
        'price-levels'                => [\Database\Seeders\PriceLevelSeeder::class,               'price_levels'],
        'party-types'                 => [\Database\Seeders\PartyTypeSeeder::class,                'party_types'],
        'product-types'               => [\Database\Seeders\ProductTypeSeeder::class,              'product_types'],
        'genders'                     => [\Database\Seeders\GenderSeeder::class,                   'genders'],
        'stock-movement-types'        => [\Database\Seeders\StockMovementTypeSeeder::class,        'stock_movement_types'],
        'treasury-account-types'      => [\Database\Seeders\TreasuryAccountTypeSeeder::class,      'treasury_account_types'],
        'document-base-operations'    => [\Database\Seeders\DocumentBaseOperationSeeder::class,    'document_base_operations'],
        'document-statuses'           => [\Database\Seeders\DocumentStatusSeeder::class,           'document_statuses'],
        'inventory-valuation-methods' => [\Database\Seeders\InventoryValuationMethodSeeder::class, 'inventory_valuation_methods'],
        'document-types'              => [\Database\Seeders\DocumentTypeSeeder::class,             'document_types'],
        'warehouses'                  => [\Database\Seeders\WarehouseSeeder::class,                'warehouses'],
        'treasury-accounts'           => [\Database\Seeders\TreasuryAccountSeeder::class,          'treasury_accounts'],
        'payment-modes'               => [\Database\Seeders\PaymentModeSeeder::class,              'payment_modes'],
        'expense-categories'          => [\Database\Seeders\ExpenseCategorySeeder::class,          'expense_categories'],
        'numbering-series'            => [\Database\Seeders\NumberingSeriesSeeder::class,          'numbering_series'],
    ];

    public function __construct(private readonly CompanyRoleService $roleService)
    {
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/global
    // ─────────────────────────────────────────────────────────────

    public function seedGlobal(): JsonResponse
    {
        try {
            DB::transaction(function () {
                // 1. ولايات + بلديات
                (new WilayaCommuneSeeder())->run();

                // 2. صلاحيات + دور super-admin
                app(GlobalRolesAndPermissionsSeeder::class)->run();
            });

            return response()->json([
                'message'      => 'تم تطبيق البيانات العالمية بنجاح',
                'wilayas'      => DB::table('wilayas')->count(),
                'communes'     => DB::table('communes')->count(),
                'permissions'  => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('GlobalSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/wilayas
    // ─────────────────────────────────────────────────────────────

    public function seedWilayas(): JsonResponse
    {
        try {
            (new WilayaCommuneSeeder())->run();

            return response()->json([
                'message'  => 'تم تحديث الولايات والبلديات',
                'wilayas'  => DB::table('wilayas')->count(),
                'communes' => DB::table('communes')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('WilayaSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/seed/permissions
    // ─────────────────────────────────────────────────────────────

    public function seedPermissions(): JsonResponse
    {
        try {
            app(GlobalRolesAndPermissionsSeeder::class)->run();

            return response()->json([
                'message'     => 'تم تحديث الصلاحيات ودور super-admin',
                'permissions' => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('PermissionSeed failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/companies/{company}/seed
    // ─────────────────────────────────────────────────────────────

    public function seedCompany(Company $company): JsonResponse
    {
        config(['seeding.company_id' => $company->id]);

        $applied = [];
        $skipped = [];

        try {
            DB::transaction(function () use ($company, &$applied, &$skipped) {
                foreach (self::COMPANY_SEEDERS as $key => [$class, $table]) {
                    if (DB::table($table)->where('company_id', $company->id)->exists()) {
                        $skipped[] = $key;
                        continue;
                    }

                    (new $class)->run();
                    $applied[] = $key;
                }

                // السنة المالية
                if (!DB::table('fiscal_years')->where('company_id', $company->id)->exists()) {
                    $this->seedFiscalYear($company->id);
                    $applied[] = 'fiscal-year';
                } else {
                    $skipped[] = 'fiscal-year';
                }

                // أدوار الشركة
                $this->roleService->seedRoles($company->id);
                $applied[] = 'roles';

                // تعيين admin للمالك
                $this->assignOwnerRole($company);
            });

            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

            return response()->json([
                'message' => 'تم تطبيق جميع بيانات الشركة بنجاح',
                'applied' => $applied,
                'skipped' => $skipped,
            ]);
        } catch (\Throwable $e) {
            Log::error("CompanySeed failed for #{$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => 'فشل: ' . $e->getMessage(),
                'applied' => $applied,
                'skipped' => $skipped,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/companies/{company}/seed/{seeder}
    // ─────────────────────────────────────────────────────────────

    public function seedCompanySingle(Company $company, string $seeder): JsonResponse
    {
        if (!isset(self::COMPANY_SEEDERS[$seeder])) {
            return response()->json([
                'message'   => "seeder غير معروف: {$seeder}",
                'available' => array_keys(self::COMPANY_SEEDERS),
            ], 404);
        }

        [$class, $table] = self::COMPANY_SEEDERS[$seeder];

        if (DB::table($table)->where('company_id', $company->id)->exists()) {
            return response()->json([
                'message' => 'البيانات موجودة مسبقاً للشركة',
                'skipped' => true,
            ]);
        }

        config(['seeding.company_id' => $company->id]);

        try {
            DB::transaction(fn () => (new $class)->run());

            return response()->json(['message' => "تم تطبيق {$seeder} بنجاح"]);
        } catch (\Throwable $e) {
            Log::error("Seed [{$seeder}] failed for #{$company->id}: " . $e->getMessage());
            return response()->json([
                'message' => 'فشل: ' . $e->getMessage(),
                'seeder'  => $seeder,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function seedFiscalYear(int $companyId): void
    {
        $year = now()->year;
        DB::table('fiscal_years')->insert([
            'company_id' => $companyId,
            'name'       => "Exercice {$year}",
            'start_date' => "{$year}-01-01",
            'end_date'   => "{$year}-12-31",
            'is_closed'  => false,
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function assignOwnerRole(Company $company): void
    {
        if (!$company->owner_id) return;

        $owner = \App\Models\User::find($company->owner_id);
        if (!$owner) return;

        $adminRole = \Spatie\Permission\Models\Role::where('name', 'admin')
            ->where('company_id', $company->id)
            ->first();

        if ($adminRole && !$owner->hasRole($adminRole)) {
            $owner->assignRole($adminRole);
        }
    }
}




// ===== ملف: AdminSystemBootController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Database\Seeders\GlobalRolesAndPermissionsSeeder;
use Database\Seeders\WilayaCommuneSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AdminSystemBootController
 * ══════════════════════════════════════════════════════════════════
 * يُستخدم في مودال الإعداد الأول للسوبر أدمن (SystemBootModal)
 *
 * Routes (تحت middleware super.admin):
 *   GET  /api/v1/admin/system/status          ← حالة النظام
 *   POST /api/v1/admin/system/boot            ← تثبيت كامل دفعة واحدة
 *   POST /api/v1/admin/system/boot/wilayas    ← ولايات + بلديات فقط
 *   POST /api/v1/admin/system/boot/permissions← صلاحيات + super-admin فقط
 * ══════════════════════════════════════════════════════════════════
 */
class AdminSystemBootController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // GET /api/v1/admin/system/status
    // يُعيد حالة كل مكوّن عالمي — الواجهة تقرأها وتعرض ما يلزم
    // ─────────────────────────────────────────────────────────────
    public function status(): JsonResponse
    {
        $wilayasCount     = DB::table('wilayas')->count();
        $communesCount    = DB::table('communes')->count();
        $permissionsCount = \Spatie\Permission\Models\Permission::whereNull('company_id')->count();
        $superAdminRole   = \Spatie\Permission\Models\Role::where('name', 'super-admin')
                                ->whereNull('company_id')->exists();
        $superAdminUser   = \App\Models\User::whereHas('roles', fn($q) =>
                                $q->where('name', 'super-admin')->whereNull('company_id')
                            )->exists();

        $isReady = $wilayasCount >= 48
                && $communesCount > 0
                && $permissionsCount > 0
                && $superAdminRole
                && $superAdminUser;

        return response()->json([
            'is_ready'    => $isReady,
            'components'  => [
                [
                    'key'     => 'wilayas',
                    'label'   => 'الولايات والبلديات',
                    'icon'    => 'ti-map-pin',
                    'done'    => $wilayasCount >= 48,
                    'count'   => "{$wilayasCount} ولاية / {$communesCount} بلدية",
                ],
                [
                    'key'     => 'permissions',
                    'label'   => 'الصلاحيات العالمية',
                    'icon'    => 'ti-shield-check',
                    'done'    => $permissionsCount > 0,
                    'count'   => "{$permissionsCount} صلاحية",
                ],
                [
                    'key'     => 'super_admin_role',
                    'label'   => 'دور مدير النظام',
                    'icon'    => 'ti-crown',
                    'done'    => $superAdminRole,
                    'count'   => $superAdminRole ? 'مُعدّ' : 'غير موجود',
                ],
                [
                    'key'     => 'super_admin_user',
                    'label'   => 'حساب مدير النظام',
                    'icon'    => 'ti-user-shield',
                    'done'    => $superAdminUser,
                    'count'   => $superAdminUser ? 'مُعيَّن' : 'غير مُعيَّن',
                ],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot
    // تثبيت كل البيانات العالمية دفعة واحدة (idempotent)
    // ─────────────────────────────────────────────────────────────
    public function boot(): JsonResponse
    {
        $results = [];

        try {
            // 1. ولايات + بلديات
            $results['wilayas'] = $this->runWilayas();

            // 2. صلاحيات + دور super-admin + تعيين للمستخدم
            $results['permissions'] = $this->runPermissions();

            return response()->json([
                'message' => 'تم إعداد النظام بنجاح',
                'results' => $results,
            ]);
        } catch (\Throwable $e) {
            Log::error('SystemBoot failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'فشل الإعداد: ' . $e->getMessage(),
                'results' => $results,
            ], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot/wilayas
    // ─────────────────────────────────────────────────────────────
    public function bootWilayas(): JsonResponse
    {
        try {
            $result = $this->runWilayas();
            return response()->json(['message' => 'تم تثبيت الولايات والبلديات', ...$result]);
        } catch (\Throwable $e) {
            Log::error('WilayaBoot failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/v1/admin/system/boot/permissions
    // ─────────────────────────────────────────────────────────────
    public function bootPermissions(): JsonResponse
    {
        try {
            $result = $this->runPermissions();
            return response()->json(['message' => 'تم تحديث الصلاحيات', ...$result]);
        } catch (\Throwable $e) {
            Log::error('PermissionBoot failed: ' . $e->getMessage());
            return response()->json(['message' => 'فشل: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function runWilayas(): array
    {
        (new WilayaCommuneSeeder())->run();

        return [
            'wilayas'  => DB::table('wilayas')->count(),
            'communes' => DB::table('communes')->count(),
        ];
    }

    private function runPermissions(): array
    {
        app(GlobalRolesAndPermissionsSeeder::class)->run();

        return [
            'permissions' => \Spatie\Permission\Models\Permission::whereNull('company_id')->count(),
        ];
    }
}




// ===== ملف: AdminSystemSettingsController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSystemSettingsController extends Controller
{
    protected string $cacheKey = 'system_settings';

    public function index(): JsonResponse
    {
        $settings = Cache::remember($this->cacheKey, 3600, function () {
            return DB::table('settings')
                ->whereNull('company_id')
                ->pluck('value', 'key')
                ->toArray();
        });

        return response()->json([
            'data' => $settings
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string'
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['settings'] as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key, 'company_id' => null],
                    [
                        'value'      => $value,
                        'group'      => 'system',
                        'type'       => 'string',
                        'is_public'  => false,
                        'is_editable'=> true,
                        'updated_at' => now(),
                    ]
                );
            }
        });

        Cache::forget($this->cacheKey);
        return response()->json(['message' => 'تم تحديث الإعدادات']);
    }
}




// ===== ملف: AdminUserController.php =====
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

    public function companies(User $user): JsonResponse
    {
        $companies = $user->companies()->withPivot(['role', 'active'])->get();
        return response()->json([
            'data' => CompanyResource::collection($companies)
        ]);
    }
}




// ===== ملف: CompanyController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin Company Controller
 *
 * جميع العمليات هنا مقتصرة على Super Admin فقط.
 * يمدد BaseApiController لاستخدام أدوات الاستجابة الموحدة ومعالجة الأخطاء.
 */
class CompanyController extends BaseApiController
{
    protected string $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(private CompanyService $companyService)
    {
       // parent::__construct();
    }

    /**
     * إحصائيات عامة عن كل الشركات
     */
    public function stats(): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            return $this->successResponse(
                $this->companyService->getStats(),
                'إحصائيات جميع الشركات'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'stats');
        }
    }

    public function suspend(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['reason' => 'required|string|max:500']);
            $company->suspend($data['reason'], auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تعليق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unsuspend();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم رفع التعليق عن شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function deactivate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->deactivate(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إيقاف تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivate');
        }
    }

    public function activate(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->activate();
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم إعادة تفعيل شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activate');
        }
    }

    public function verify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->verify(auth()->id());
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم توثيق شركة [{$company->name}]"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $company->unverify();
            return $this->successResponse(null, 'تم إلغاء توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);
            $customLimits = array_filter([
                'max_users'      => $data['max_users'] ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products'] ?? null,
            ]);
            $company->upgradePlan($data['plan'], $customLimits ?: null);
            return $this->successResponse(
                new CompanyResource($company->fresh()),
                "تم تغيير خطة [{$company->name}] إلى {$data['plan']}"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePlan');
        }
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('superAdmin', Company::class);
            $data = $request->validate(['notes' => 'nullable|string|max:5000']);
            $company->update(['notes' => $data['notes']]);
            return $this->successResponse(null, 'تم تحديث الملاحظات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateNotes');
        }
    }

    // ======================  تجاوز (override) getService() و getModelClass() ======================
    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }
}




// ===== ملف: GlobalSeedController.php =====
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Database\Seeders\WilayaCommuneSeeder;

/**
 * GlobalSeedController
 *
 * خاص بالـ Super Admin فقط. يزرع البيانات المشتركة بين جميع الشركات
 * (حالياً: الولايات والبلديات) مرة واحدة على مستوى النظام.
 */
class GlobalSeedController extends Controller
{
    public function __construct()
    {
        // التأكد من أن المستخدم Super Admin (أو نعتمد على middleware في الـ route)
        $this->middleware('role:super-admin');
    }

    /**
     * تشغيل سيدر عالمي (wilayas-communes فقط حالياً).
     */
    public function run(string $seeder): JsonResponse
    {
        if ($seeder !== 'wilayas-communes') {
            return response()->json(['message' => 'seeder غير معروف'], 404);
        }

        // الولاية الواحدة على الأقل تعني أن البيانات الجغرافية موجودة
        if (DB::table('wilayas')->exists()) {
            return response()->json(['message' => 'البيانات الجغرافية موجودة مسبقاً']);
        }

        try {
            DB::transaction(function () {
                (new WilayaCommuneSeeder())->run();
            });

            return response()->json(['message' => 'تم زرع البيانات الجغرافية (58 ولاية + البلديات) بنجاح']);
        } catch (\Throwable $e) {
            logger()->error('Global seed فشل: ' . $e->getMessage());
            return response()->json(['message' => 'فشل الزرع: ' . $e->getMessage()], 500);
        }
    }
}


