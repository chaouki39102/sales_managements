<?php

namespace App\Core\Providers;

use App\Core\Console\Commands\MakeCompleteCrudCommand;
use Illuminate\Support\ServiceProvider;
use App\Core\Console\Commands\MakeResourceCrudCommand;

class CrudGeneratorServiceProvider extends ServiceProvider
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
        if ($this->app->runningInConsole()) {
            $this->commands([
                MakeResourceCrudCommand::class,
                MakeCompleteCrudCommand::class,
            ]);
        }
    }
}
