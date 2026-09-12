<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\Attachment;
use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentService extends \App\Core\Services\BaseService
{
    protected string $model = Attachment::class;
    protected string $resourceName = 'attachment';
    protected array $defaultWith = ['uploadedBy'];
    protected function getResourceName(): string { return $this->resourceName; }

    /** أقصى حجم مسموح للملف (بايت). */
    public const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    /** الامتدادات المسموحة — محفوظات وصور ووثائق مكتبية. */
    public const ALLOWED_EXTENSIONS = [
        'png', 'jpg', 'jpeg', 'gif', 'webp',
        'pdf', 'doc', 'docx', 'xls', 'xlsx',
        'txt',
    ];

    public function getFilePath(Attachment $attachment): string
    {
        return $attachment->file_path;
    }

    protected function beforeCreate(array $data, ?Request $request = null): array
    {
        if (!$request || !$request->hasFile('file')) {
            throw new BusinessRuleException('الملف مطلوب للإرفاق.', 422);
        }

        $file = $request->file('file');
        if (!$file instanceof UploadedFile) {
            throw new BusinessRuleException('الملف المُرفق غير صالح.', 422);
        }

        if ($file->getError() !== UPLOAD_ERR_OK) {
            throw new BusinessRuleException('تعذر استلام الملف من المتصفح.', 422);
        }

        $this->assertFileAllowed($file);
        $this->assertAttachableAllowed($data);

        $extension = strtolower($file->getClientOriginalExtension());
        $companyId = $data['company_id'] ?? $this->getCurrentCompanyId();

        $storedPath = $file->storeAs(
            'attachments/' . $companyId,
            Str::uuid() . '.' . $extension,
            'public'
        );

        if ($storedPath === false) {
            throw new BusinessRuleException('تعذر تخزين الملف على الخادم.', 422);
        }

        $data['file_name']      = $file->getClientOriginalName();
        $data['file_path']      = $storedPath;
        $data['file_type']      = $file->getMimeType() ?: 'application/octet-stream';
        $data['file_extension'] = $extension;
        $data['file_size']      = $file->getSize();
        $data['disk']           = 'public';
        $data['company_id']     = $companyId;
        $data['uploaded_by']    = $data['uploaded_by'] ?? auth()->id();
        $data['is_public']      = $data['is_public'] ?? false;

        // القيم الداخلية لا يجب أن تصل إلى model::create
        unset($data['file']);

        return $data;
    }

    protected function assertFileAllowed(UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new BusinessRuleException(
                'صيغة الملف غير مسموحة. الصيغ المقبولة: ' . implode('، ', self::ALLOWED_EXTENSIONS) . '.',
                422
            );
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new BusinessRuleException('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت).', 422);
        }
    }

    protected function assertAttachableAllowed(array $data): void
    {
        $type = $data['attachable_type'] ?? null;
        $id   = $data['attachable_id'] ?? null;

        if (!$type || $id === null || $id === '') {
            throw new BusinessRuleException('يجب تحديد نوع ومعرّف السجل الذي يُرفق به الملف.', 422);
        }

        if (!class_exists($type) || !is_subclass_of($type, Model::class)) {
            throw new BusinessRuleException('نوع الإرفاق غير صالح.', 422);
        }

        if (!in_array(HasCompany::class, class_uses_recursive($type), true)) {
            throw new BusinessRuleException('نوع الإرفاق غير مسموح به.', 422);
        }

        // CompanyScope يطبّق تلقائياً هنا: سجل من شركة أخرى يفشل في العثور عليه
        $attachable = (new $type())->newQuery()->find((int) $id);

        if (!$attachable) {
            throw new BusinessRuleException('السجل الذي يُرفق به الملف غير موجود أو لا يتبع نفس الشركة.', 422);
        }
    }

    protected function afterDelete(Model $item): void
    {
        if (!$item instanceof Attachment) {
            return;
        }

        if ($item->disk && $item->file_path) {
            Storage::disk($item->disk)->delete($item->file_path);
        }

        parent::afterDelete($item);
    }
}