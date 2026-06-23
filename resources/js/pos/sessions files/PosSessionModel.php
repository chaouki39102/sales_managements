<?php
// ══════════════════════════════════════════════════════════════════
// app/Models/PosSession.php
// ══════════════════════════════════════════════════════════════════
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSession extends Model
{
    protected $fillable = [
        'company_id', 'user_id', 'warehouse_id', 'fiscal_year_id',
        'opened_at', 'closed_at',
        'opening_cash', 'opening_note',
        'invoices_count', 'returns_count',
        'gross_sales', 'returns_total', 'net_sales',
        'total_tva', 'total_fiscal_stamp', 'total_discount',
        'highest_invoice',
        'cash_collected', 'cib_collected', 'ccp_collected',
        'bank_collected', 'credit_total',
        'closing_cash_counted', 'closing_cash_expected',
        'cash_difference', 'closing_note', 'manager_note', 'status',
    ];

    protected $casts = [
        'opened_at'              => 'datetime',
        'closed_at'              => 'datetime',
        'opening_cash'           => 'decimal:2',
        'gross_sales'            => 'decimal:2',
        'returns_total'          => 'decimal:2',
        'net_sales'              => 'decimal:2',
        'total_tva'              => 'decimal:2',
        'total_fiscal_stamp'     => 'decimal:2',
        'total_discount'         => 'decimal:2',
        'highest_invoice'        => 'decimal:2',
        'cash_collected'         => 'decimal:2',
        'cib_collected'          => 'decimal:2',
        'ccp_collected'          => 'decimal:2',
        'bank_collected'         => 'decimal:2',
        'credit_total'           => 'decimal:2',
        'closing_cash_counted'   => 'decimal:2',
        'closing_cash_expected'  => 'decimal:2',
        'cash_difference'        => 'decimal:2',
    ];

    // ── Relations ─────────────────────────────────────────────────
    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function user(): BelongsTo      { return $this->belongsTo(User::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function fiscalYear(): BelongsTo{ return $this->belongsTo(FiscalYear::class); }
    public function payments(): HasMany    { return $this->hasMany(PosSessionPayment::class); }
    public function products(): HasMany    { return $this->hasMany(PosSessionProduct::class); }

    // ── Scopes ────────────────────────────────────────────────────
    public function scopeOpen($q)     { return $q->where('status', 'open'); }
    public function scopeForCompany($q, int $companyId) {
        return $q->where('company_id', $companyId);
    }

    // ── Helpers ───────────────────────────────────────────────────
    public function isOpen(): bool   { return $this->status === 'open'; }
    public function isClosed(): bool { return $this->status === 'closed'; }

    public function getDurationAttribute(): string
    {
        $start = $this->opened_at;
        $end   = $this->closed_at ?? now();
        $mins  = (int) $start->diffInMinutes($end);
        $h = intdiv($mins, 60);
        $m = $mins % 60;
        return $h > 0 ? "{$h}س {$m}د" : "{$m}د";
    }
}

// ══════════════════════════════════════════════════════════════════
// app/Models/PosSessionPayment.php
// ══════════════════════════════════════════════════════════════════
// (ملف منفصل في الواقع — مدمج هنا للإيجاز)
namespace App\Models;
class PosSessionPayment extends Model
{
    protected $fillable = ['pos_session_id', 'payment_mode_id', 'amount', 'count'];
    protected $casts    = ['amount' => 'decimal:2'];
    public function paymentMode(): BelongsTo { return $this->belongsTo(PaymentMode::class); }
}

namespace App\Models;
class PosSessionProduct extends Model
{
    protected $fillable = ['pos_session_id', 'product_id', 'product_name', 'quantity_sold', 'total_ht', 'total_ttc'];
    protected $casts    = ['quantity_sold' => 'decimal:3', 'total_ht' => 'decimal:2', 'total_ttc' => 'decimal:2'];
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
