<?php

namespace App\Providers;

use App\Models\CommercialDocumentLine;
use App\Models\StockMovement;
use App\Observers\CommercialDocumentLineObserver;
use App\Observers\StockMovementObserver;
use Illuminate\Support\ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // parent::boot();
        StockMovement::observe(StockMovementObserver::class);
        StockMovement::observe(StockMovementObserver::class);
        CommercialDocumentLine::observe(CommercialDocumentLineObserver::class);
    }
}
