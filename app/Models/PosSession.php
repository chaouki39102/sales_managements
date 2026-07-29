<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSession extends Model
{
    protected $fillable = [
        'company_id', 'user_id', 'warehouse_id', 'fiscal_year_id',
        'opened_at', 'closed_at',
        'opening_cash', 'opening_note', 'device_name', 'device_ip', 'device_user_agent', 'device_browser_info',
        'invoices_count', 'returns_count',
        'gross_sales', 'returns_total', 'net_sales',
        'total_tva', 'total_fiscal_stamp', 'total_discount',
        'highest_invoice',
        'cash_collected', 'cib_collected', 'ccp_collected',
        'bank_collected', 'credit_total',
        'closing_cash_counted', 'closing_cash_expected',
        'cash_difference', 'closing_note', 'manager_note', 'status',
    ];

    protected $appends = ['duration'];

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
        'device_browser_info'    => 'array',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function user(): BelongsTo      { return $this->belongsTo(User::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function fiscalYear(): BelongsTo{ return $this->belongsTo(FiscalYear::class); }
    public function payments(): HasMany    { return $this->hasMany(PosSessionPayment::class); }
    public function products(): HasMany    { return $this->hasMany(PosSessionProduct::class); }

    public function scopeOpen($q)     { return $q->where('status', 'open'); }
    public function scopeForCompany($q, int $companyId) {
        return $q->where('company_id', $companyId);
    }

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
