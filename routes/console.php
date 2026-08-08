<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Backup schedule (upgrade 2)
|--------------------------------------------------------------------------
|
| Daily backup at 03:00 (server local time) + a weekly full backup labelled
| "weekly" on Sundays at 03:15. Run with the scheduler:
|   - Windows: php artisan schedule:work   (always-on console window)
|   - Linux:   * * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
|
| The daily label keeps 2.1's retention of N files; backups are never pruned
| below retention_keep.
*/

Schedule::command('app:backup')->dailyAt('03:00');

Schedule::command('app:backup --label=weekly')->weeklyOn(7, '03:15');
