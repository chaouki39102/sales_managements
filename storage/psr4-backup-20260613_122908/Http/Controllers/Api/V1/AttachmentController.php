<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\AttachmentResource;
use App\Services\AttachmentService;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttachmentController extends BaseApiController
{
    protected string $resourceName = 'attachment';
    protected ?string $resourceClass = AttachmentResource::class;

    public function __construct(private AttachmentService $attachmentService)
    {
        parent::__construct();
    }

    public function download(Request $request, int $id)
    {
        try {
            $attachment = $this->attachmentService->findById($id);
            return response()->download(
                storage_path('app/' . $this->attachmentService->getFilePath($attachment)),
                $attachment->file_name
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'download');
        }
    }

    protected function getService(): AttachmentService
    {
        return $this->attachmentService;
    }

    protected function getModelClass(): string
    {
        return Attachment::class;
    }
}