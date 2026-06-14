<?php

namespace App\Core\Providers;

use Illuminate\Support\ServiceProvider;

class RouteCommandServiceProvider extends ServiceProvider
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


         // ✅ Register all commands in Core/Console/Commands directory
        if ($this->app->runningInConsole()) {
            $this->commands([
                \App\Core\Console\Commands\CacheWarmupCommand::class,
                \App\Core\Console\Commands\GenerateRequestsFromModel::class,
                \App\Core\Console\Commands\GenerateStandardizedModel::class,
                \App\Core\Console\Commands\MigrationToModel::class,
                \App\Core\Console\Commands\MigrationToModelAdvanced::class,
            ]);
        }
    }


}
