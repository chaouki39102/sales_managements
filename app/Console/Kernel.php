<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        // يمكنك تسجيل الأوامر هنا مباشرة كخيار بديل
        \App\Core\Console\Commands\CacheWarmupCommand::class,
        \App\Core\Console\Commands\GenerateRequestsFromModel::class,
        \App\Core\Console\Commands\GenerateStandardizedModel::class,
        \App\Core\Console\Commands\MigrationToModel::class,
        \App\Core\Console\Commands\MigrationToModelAdvanced::class,
        
        \App\Core\Console\Commands\MakeResourceCrudCommand::class,


    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // كل يوم في الساعة 8 صباحاً
        $schedule->command('cache:warmup --all')
            ->daily()
            ->at('08:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        // ✅ Auto-load commands from directories
        $this->load(__DIR__ . '/Commands');
        $this->load(__DIR__ . '/../Core/Console/Commands');

        require base_path('routes/console.php');
    }
}
