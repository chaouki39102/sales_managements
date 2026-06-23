<?php
// ══════════════════════════════════════════════════════════════════
// app/Http/Controllers/Api/PosSessionController.php
// ══════════════════════════════════════════════════════════════════
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosSession;
use App\Models\PosSessionPayment;
use App\Models\PosSessionProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PosSessionController extends Controller
{
    // ── GET /{company}/pos-sessions/current ───────────────────────
    // الجلسة المفتوحة للمستخدم الحالي في هذه الشركة
    public function current(Request $request): JsonResponse
    {
        $session = PosSession::forCompany($request->company->id)
            ->open()
            ->where('user_id', Auth::id())
            ->with(['user:id,name', 'warehouse:id,name', 'payments.paymentMode', 'products'])
            ->latest('opened_at')
            ->first();

        return response()->json(['data' => $session]);
    }

    // ── POST /{company}/pos-sessions ──────────────────────────────
    // فتح جلسة جديدة
    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'warehouse_id'   => 'required|integer|exists:warehouses,id',
            'fiscal_year_id' => 'required|integer|exists:fiscal_years,id',
            'opening_cash'   => 'required|numeric|min:0',
            'opening_note'   => 'nullable|string|max:255',
        ]);

        // منع فتح جلستين في نفس الوقت
        $existing = PosSession::forCompany($request->company->id)
            ->open()
            ->where('user_id', Auth::id())
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'لديك جلسة مفتوحة بالفعل',
                'data'    => $existing,
            ], 409);
        }

        $session = PosSession::create([
            'company_id'     => $request->company->id,
            'user_id'        => Auth::id(),
            'warehouse_id'   => $data['warehouse_id'],
            'fiscal_year_id' => $data['fiscal_year_id'],
            'opened_at'      => now(),
            'opening_cash'   => $data['opening_cash'],
            'opening_note'   => $data['opening_note'] ?? null,
            'status'         => 'open',
        ]);

        return response()->json([
            'message' => 'تم فتح الجلسة',
            'data'    => $session->load('warehouse:id,name'),
        ], 201);
    }

    // ── POST /{company}/pos-sessions/{session}/increment ─────────
    // تسجيل بيع جديد — يُستدعى من الفرونتند بعد كل فاتورة
    public function increment(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->findOpenSession($request, $sessionId);

        $data = $request->validate([
            'invoice_total'       => 'required|numeric|min:0',
            'total_ht'            => 'required|numeric|min:0',
            'total_tva'           => 'required|numeric|min:0',
            'total_fiscal_stamp'  => 'required|numeric|min:0',
            'total_discount'      => 'required|numeric|min:0',
            'is_return'           => 'boolean',
            // وسائل الدفع: [{payment_mode_id, amount}]
            'payments'            => 'nullable|array',
            'payments.*.payment_mode_id' => 'required|integer',
            'payments.*.amount'          => 'required|numeric|min:0',
            // المنتجات: [{product_id, product_name, quantity, total_ht, total_ttc}]
            'items'               => 'nullable|array',
            'items.*.product_id'  => 'required|integer',
            'items.*.product_name'=> 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0',
            'items.*.total_ht'    => 'required|numeric|min:0',
            'items.*.total_ttc'   => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($session, $data) {
            $isReturn = $data['is_return'] ?? false;
            $amount   = $data['invoice_total'];

            // ── تحديث الإجماليات ──────────────────────────────────
            if ($isReturn) {
                $session->increment('returns_count');
                $session->increment('returns_total', $amount);
            } else {
                $session->increment('invoices_count');
                $session->increment('gross_sales', $amount);
                if ($amount > $session->highest_invoice) {
                    $session->update(['highest_invoice' => $amount]);
                }
            }

            $session->increment('total_tva',          $data['total_tva']);
            $session->increment('total_fiscal_stamp', $data['total_fiscal_stamp']);
            $session->increment('total_discount',     $data['total_discount']);

            // net_sales يُحدَّث دائماً
            $session->update([
                'net_sales' => $session->gross_sales - $session->returns_total,
            ]);

            // ── وسائل الدفع ───────────────────────────────────────
            foreach ($data['payments'] ?? [] as $p) {
                $modeId = $p['payment_mode_id'];
                $pamt   = $p['amount'];

                PosSessionPayment::updateOrCreate(
                    ['pos_session_id' => $session->id, 'payment_mode_id' => $modeId],
                    ['amount' => DB::raw("amount + {$pamt}"), 'count' => DB::raw('count + 1')],
                );

                // تحديث أعمدة الاختصار
                $modeCode = \App\Models\PaymentMode::find($modeId)?->code ?? '';
                $colMap = [
                    'cash' => 'cash_collected', 'cib' => 'cib_collected',
                    'ccp'  => 'ccp_collected',  'bank' => 'bank_collected',
                    'credit' => 'credit_total',
                ];
                if (isset($colMap[$modeCode])) {
                    $session->increment($colMap[$modeCode], $pamt);
                }
            }

            // ── المنتجات ──────────────────────────────────────────
            foreach ($data['items'] ?? [] as $item) {
                PosSessionProduct::updateOrCreate(
                    ['pos_session_id' => $session->id, 'product_id' => $item['product_id']],
                    [
                        'product_name'  => $item['product_name'],
                        'quantity_sold' => DB::raw("quantity_sold + {$item['quantity']}"),
                        'total_ht'      => DB::raw("total_ht + {$item['total_ht']}"),
                        'total_ttc'     => DB::raw("total_ttc + {$item['total_ttc']}"),
                    ],
                );
            }
        });

        return response()->json(['data' => $session->fresh()]);
    }

    // ── POST /{company}/pos-sessions/{session}/close ──────────────
    // إغلاق الجلسة مع جرد الصندوق
    public function close(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->findOpenSession($request, $sessionId);

        $data = $request->validate([
            'closing_cash_counted' => 'required|numeric|min:0',
            'closing_note'         => 'nullable|string|max:1000',
        ]);

        $expected   = $session->opening_cash + $session->cash_collected;
        $counted    = $data['closing_cash_counted'];
        $difference = $counted - $expected;

        $session->update([
            'closed_at'             => now(),
            'closing_cash_counted'  => $counted,
            'closing_cash_expected' => $expected,
            'cash_difference'       => $difference,
            'closing_note'          => $data['closing_note'] ?? null,
            'status'                => 'closed',
        ]);

        return response()->json([
            'message' => 'تم إغلاق الجلسة',
            'data'    => $session->load(['payments.paymentMode', 'products']),
        ]);
    }

    // ── GET /{company}/pos-sessions ───────────────────────────────
    // قائمة الجلسات (للمدير)
    public function index(Request $request): JsonResponse
    {
        $sessions = PosSession::forCompany($request->company->id)
            ->with(['user:id,name', 'warehouse:id,name'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->user_id, fn($q) => $q->where('user_id', $request->user_id))
            ->when($request->date_from, fn($q) => $q->whereDate('opened_at', '>=', $request->date_from))
            ->when($request->date_to,   fn($q) => $q->whereDate('opened_at', '<=', $request->date_to))
            ->orderByDesc('opened_at')
            ->paginate($request->per_page ?? 20);

        return response()->json($sessions);
    }

    // ── GET /{company}/pos-sessions/{session} ─────────────────────
    public function show(Request $request, int $sessionId): JsonResponse
    {
        $session = PosSession::forCompany($request->company->id)
            ->with(['user:id,name', 'warehouse:id,name', 'payments.paymentMode', 'products.product:id,name'])
            ->findOrFail($sessionId);

        return response()->json(['data' => $this->formatSession($session)]);
    }

    // ── Helpers ───────────────────────────────────────────────────
    private function findOpenSession(Request $request, int $id): PosSession
    {
        return PosSession::forCompany($request->company->id)
            ->open()
            ->where('user_id', Auth::id())
            ->findOrFail($id);
    }

    private function formatSession(PosSession $s): array
    {
        return [
            'id'                    => $s->id,
            'status'                => $s->status,
            'opened_at'             => $s->opened_at,
            'closed_at'             => $s->closed_at,
            'duration'              => $s->duration,
            'user'                  => $s->user,
            'warehouse'             => $s->warehouse,
            'opening_cash'          => $s->opening_cash,
            'opening_note'          => $s->opening_note,
            'invoices_count'        => $s->invoices_count,
            'returns_count'         => $s->returns_count,
            'gross_sales'           => $s->gross_sales,
            'returns_total'         => $s->returns_total,
            'net_sales'             => $s->net_sales,
            'total_tva'             => $s->total_tva,
            'total_fiscal_stamp'    => $s->total_fiscal_stamp,
            'total_discount'        => $s->total_discount,
            'highest_invoice'       => $s->highest_invoice,
            'avg_invoice'           => $s->invoices_count > 0
                                        ? round($s->net_sales / $s->invoices_count, 2) : 0,
            'cash_collected'        => $s->cash_collected,
            'cib_collected'         => $s->cib_collected,
            'ccp_collected'         => $s->ccp_collected,
            'bank_collected'        => $s->bank_collected,
            'credit_total'          => $s->credit_total,
            'closing_cash_counted'  => $s->closing_cash_counted,
            'closing_cash_expected' => $s->closing_cash_expected,
            'cash_difference'       => $s->cash_difference,
            'closing_note'          => $s->closing_note,
            'payments'              => $s->payments,
            'top_products'          => $s->products->sortByDesc('total_ttc')->take(10)->values(),
        ];
    }
}
