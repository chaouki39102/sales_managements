<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\AttachmentResource;
use App\Services\AttachmentService;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends BaseApiController
{
    protected string $resourceName = 'attachment';
    protected ?string $resourceClass = AttachmentResource::class;

    public function __construct(private AttachmentService $attachmentService)
    {
        parent::__construct();
    }

    public function download(Request $request, $id)
    {
        try {
            $id = $this->extractId($id);
            $attachment = $this->attachmentService->findById($id);
            $path = Storage::disk($attachment->disk)->path($attachment->file_path);

            if ($path === false || !file_exists($path)) {
                return $this->errorResponse('الملف المطلوب غير موجود على الخادم.', 404);
            }

            return response()->download($path, $attachment->file_name);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'download');
        }
    }

    public function view(Request $request, $id)
    {
        try {
            $id = $this->extractId($id);
            $attachment = $this->attachmentService->findById($id);
            $path = Storage::disk($attachment->disk)->path($attachment->file_path);

            if ($path === false || !file_exists($path)) {
                return $this->errorResponse('الملف المطلوب غير موجود على الخادم.', 404);
            }

            $mime = $attachment->file_type ?: 'application/octet-stream';

            return response()->file($path, ['Content-Type' => $mime, 'Content-Disposition' => 'inline']);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'view');
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