<?php

namespace App\Providers;

use App\Listeners\DataAuditSubscriber;
use App\Listeners\DocumentAuditSubscriber;
use App\Listeners\NotificationEventSubscriber;
use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Product;
use App\Models\StockMovement;
use App\Observers\CommercialDocumentLineObserver;
use App\Observers\CommercialDocumentObserver;
use App\Observers\ProductObserver;
use App\Observers\StockMovementObserver;
use Illuminate\Support\Facades\Event;
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
        StockMovement::observe(StockMovementObserver::class);
        CommercialDocumentLine::observe(CommercialDocumentLineObserver::class);
        CommercialDocument::observe(CommercialDocumentObserver::class);
        Product::observe(ProductObserver::class);

        Event::subscribe(DataAuditSubscriber::class);
        Event::subscribe(DocumentAuditSubscriber::class);
        Event::subscribe(NotificationEventSubscriber::class);
    }
}
