<?php

namespace App\Services;

use App\Models\Attachment;
use Illuminate\Http\Request;

class AttachmentService extends \App\Core\Services\BaseService
{
    protected string $model = Attachment::class;
    protected string $resourceName = 'attachment';
    protected array $defaultWith = ['uploadedBy'];
    protected function getResourceName(): string { return $this->resourceName; }
    

    public function getFilePath(Attachment $attachment): string
    {
        return $attachment->file_path;
    }
}
