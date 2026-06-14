<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

/**
 * Trait HandlesApiUploads
 *
 * يتولى هذا الـ Trait كل منطق معالجة ورفع وحذف الملفات
 */
trait HandlesApiUploads
{
    /**
     * معالجة رفع كل الملفات الموجودة في الطلب
     */
    protected function handleFileUploads(Request $request, $item): void
    {
        $fileFields = $this->getFileFields();

        // إذا لم تكن هناك حقول ملفات محددة، تخطى
        if (empty($fileFields)) {
            return;
        }

        foreach ($request->allFiles() as $field => $file) {
            // تخطي الحقول غير المسموح بها
            if (!in_array($field, $fileFields) || is_null($file)) {
                continue;
            }

            // التحقق من صلاحية الملف
            if (!$this->validateFileUpload($file, $field)) {
                throw ValidationException::withMessages([
                    $field => "ملف غير صالح أو يتجاوز الحجم المسموح ({$this->getMaxFileSize()}KB)",
                ]);
            }

            try {
                // حذف الملف القديم إن وجد
                if ($item->{$field}) {
                    Storage::disk($this->getStorageDisk())->delete($item->{$field});
                }

                // رفع الملف الجديد
                $path = $file->store($this->getUploadPath($field), $this->getStorageDisk());

                // تحديث السجل
                $item->{$field} = $path;
                $item->save();

                Log::info("File uploaded successfully", [
                    'field' => $field,
                    'path' => $path,
                    'model' => get_class($item),
                    'id' => $item->id
                ]);
            } catch (\Exception $e) {
                Log::error("File upload failed", [
                    'field' => $field,
                    'error' => $e->getMessage(),
                    'model' => get_class($item),
                    'id' => $item->id
                ]);

                throw ValidationException::withMessages([
                    $field => "فشل رفع الملف. يرجى المحاولة مرة أخرى."
                ]);
            }
        }
    }

    /**
     * حذف كل الملفات المرتبطة بالمودل
     */
    protected function deleteAssociatedFiles($item): void
    {
        $fileFields = $this->getFileFields();

        foreach ($fileFields as $field) {
            if ($item->{$field}) {
                try {
                    Storage::disk($this->getStorageDisk())->delete($item->{$field});

                    Log::info("File deleted successfully", [
                        'field' => $field,
                        'path' => $item->{$field},
                        'model' => get_class($item),
                        'id' => $item->id
                    ]);
                } catch (\Exception $e) {
                    Log::warning("File deletion failed", [
                        'field' => $field,
                        'path' => $item->{$field},
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }
    }

    /**
     * التحقق من صلاحية الملف المرفوع
     */
    protected function validateFileUpload(UploadedFile $file, string $field): bool
    {
        return $file->isValid()
            && in_array(strtolower($file->extension()), $this->getAllowedMimeTypes())
            && $file->getSize() <= $this->getMaxFileSize() * 1024;
    }

    // --- دوال مجردة (Abstract) ---
    // يتوقع من الكلاس (BaseApiController) أن يوفر هذه الدوال

    abstract protected function getAllowedMimeTypes(): array;
    abstract protected function getMaxFileSize(): int;
    abstract protected function getUploadPath(string $field): string;
    abstract protected function getFileFields(): array;
    abstract protected function getStorageDisk(): string;
}
