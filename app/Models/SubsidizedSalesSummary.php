<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubsidizedSalesSummary extends Model
{
    use HasCompany;

    protected $table = 'subsidized_sales_summary';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'month',
        'regulated_product_config_id',
        'qty_sold',
        'purchase_price_avg',
        'actual_sell_price',
        'regulated_max_price',
        'margin_per_unit',
        'total_margin',
        'total_purchase_cost',
        'ifu_base',
        'ifu_amount',
        'price_violation',
        'computed_at',
    ];

    protected $casts = [
        'qty_sold'             => 'decimal:4',
        'purchase_price_avg'   => 'decimal:4',
        'actual_sell_price'    => 'decimal:4',
        'regulated_max_price'  => 'decimal:4',
        'margin_per_unit'      => 'decimal:4',
        'total_margin'         => 'decimal:4',
        'ifu_base'             => 'decimal:4',
        'ifu_amount'           => 'decimal:4',
        'price_violation'      => 'boolean',
        'computed_at'          => 'datetime',
    ];

    protected $appends = [
        'product_label',
        'weighted_avg_sell_price',
        'pmp',
        'total_revenue',
        'margin',
        'ifu_due',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function regulatedProductConfig(): BelongsTo
    {
        return $this->belongsTo(RegulatedProductConfig::class);
    }

    // ── Accessors ──────────────────────────────────────────────

    public function getProductLabelAttribute(): ?string
    {
        return $this->regulatedProductConfig?->label;
    }

    public function getWeightedAvgSellPriceAttribute(): float
    {
        return (float) $this->actual_sell_price;
    }

    public function getPmpAttribute(): float
    {
        return (float) $this->purchase_price_avg;
    }

    public function getTotalRevenueAttribute(): float
    {
        return (float) $this->qty_sold * (float) $this->actual_sell_price;
    }

    public function getMarginAttribute(): float
    {
        return (float) $this->total_margin;
    }

    public function getIfuDueAttribute(): float
    {
        return (float) $this->ifu_amount;
    }
}
