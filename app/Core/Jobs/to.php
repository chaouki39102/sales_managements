<?php

namespace App\Core\Jobs;

use App\Core\Exports\GenericExport;
use App\Core\Notifications\ExportReadyNotification;
use App\Core\Services\ApiListService;
use App\Core\Services\ModelConfigService;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;


class to be exported.
     * @param array $queryParams The query parameters (filters, sorts) from the original request.
     * @param User $user The user who initiated the export.
     * @param array $exportOptions Additional options like format and columns.
     */
    public function __construct(
        public string $modelClass,
        public array $queryParams,
        public User $user,
        public array $exportOptions = []
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // 1. Reconstruct the request and build the query
        $request = new Request($this->queryParams);
        $config = ModelConfigService::getResolvedConfig($this->modelClass);

        // buildQuery تُرجع Spatie\QueryBuilder — نحوّله إلى Eloquent Builder لـ GenericExport
        $spatieBuilder = ApiListService::buildQuery($this->modelClass, $config, $request);
        $queryBuilder  = $spatieBuilder->getEloquentBuilder();

        // 2. Prepare export details
        $format = $this->exportOptions['format'] ?? 'xlsx';
        $columns = $this->exportOptions['columns'] ?? null;
        $resourceName = strtolower(class_basename($this->modelClass));
        $fileName = sprintf('exports/%s-%s-%s.%s',
            $resourceName,
            $this->user->id,
            now()->format('Y-m-d_His'),
            $format
        );

        // 3. Generate and store the export file
        Excel::store(
            new GenericExport($queryBuilder, 1000, $columns),
            $fileName,
            'public' // Using public disk for easy URL generation
        );

        // 4. Notify the user with the download link
        $downloadUrl = Storage::disk('public')->url($fileName);
        $this->user->notify(new ExportReadyNotification($downloadUrl, $resourceName));
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        // You can notify the user that the export failed
        // $this->user->notify(new ExportFailedNotification($exception->getMessage()));
        report($exception);
    }
}
