<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Trait ApiAssetHelpers
 *
 * دوال مساعدة للتعامل مع الملفات والأصول
 */
trait ApiAssetHelpers
{
    /**
     * الحصول على رابط الملف الصحيح
     */
    protected function getAssetUrl(?string $path, string $default = '/images/no-image.png', string $disk = 'public'): string
    {
        if (empty($path)) {
            return asset($default);
        }

        $path = trim($path);

        return Cache::remember("asset_url:" . md5($path . $disk), 300, function () use ($path, $default, $disk) {
            try {
                // روابط كاملة
                if (filter_var($path, FILTER_VALIDATE_URL)) {
                    return $path;
                }

                // مسارات Storage
                if ($this->isStorageFile($path, $disk)) {
                    return Storage::disk($disk)->url($this->cleanAssetPath($path));
                }

                // مسارات Public
                if ($this->isPublicFile($path)) {
                    return asset($path);
                }

                // البحث الذكي
                return $this->findAssetFile($path, $disk) ?: asset($default);
            } catch (\Exception $e) {
                Log::warning('Asset URL generation failed', [
                    'path' => $path,
                    'error' => $e->getMessage()
                ]);
                return asset($default);
            }
        });
    }

    /**
     * نسخة آمنة للحصول على رابط الملف
     */
    protected function getSecureAssetUrl(
        ?string $path,
        string $default = '/images/no-image.png',
        string $disk = 'public',
        array $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf']
    ): string {
        if (empty($path)) {
            return asset($default);
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (!in_array($extension, $allowedExtensions)) {
            Log::warning('Disallowed file extension', [
                'path' => $path,
                'extension' => $extension
            ]);
            return asset($default);
        }

        return $this->getAssetUrl($path, $default, $disk);
    }

    /**
     * التحقق من وجود الملف
     */
    protected function assetExists(?string $path, string $disk = 'public'): bool
    {
        if (empty($path)) {
            return false;
        }

        return Cache::remember("asset_exists:" . md5($path . $disk), 300, function () use ($path, $disk) {
            if (filter_var($path, FILTER_VALIDATE_URL)) {
                return true;
            }

            return $this->isStorageFile($path, $disk)
                || $this->isPublicFile($path)
                || !is_null($this->findAssetFile($path, $disk));
        });
    }

    /**
     * التحقق من كون الملف في Storage
     */
    private function isStorageFile(string $path, string $disk): bool
    {
        $cleanPath = $this->cleanAssetPath($path);

        // دعم أقراص متعددة
        $disks = [$disk, 'public', 's3'];

        foreach ($disks as $d) {
            try {
                if (Storage::disk($d)->exists($cleanPath)) {
                    return true;
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return false;
    }

    /**
     * التحقق من كون الملف في Public
     */
    private function isPublicFile(string $path): bool
    {
        $cleanPath = $this->cleanAssetPath($path);
        return file_exists(public_path($cleanPath));
    }

    /**
     * البحث عن الملف في مسارات شائعة
     */
    private function findAssetFile(string $path, string $disk): ?string
    {
        $fileName = basename($path);
        $searchPaths = [
            "uploads/{$fileName}",
            "images/{$fileName}",
            "files/{$fileName}",
            "media/{$fileName}",
            "assets/{$fileName}",
            $fileName
        ];

        // البحث في Storage
        foreach ($searchPaths as $searchPath) {
            try {
                if (Storage::disk($disk)->exists($searchPath)) {
                    return Storage::disk($disk)->url($searchPath);
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        // البحث في Public
        foreach ($searchPaths as $searchPath) {
            if (file_exists(public_path($searchPath))) {
                return asset($searchPath);
            }
        }

        return null;
    }

    /**
     * تنظيف المسار
     */
    private function cleanAssetPath(string $path): string
    {
        return Str::replaceFirst('storage/', '', ltrim($path, '/'));
    }

    /**
     * حذف ملف بأمان
     */
    protected function deleteAssetSafely(?string $path, string $disk = 'public'): bool
    {
        if (empty($path)) {
            return false;
        }

        try {
            if ($this->isStorageFile($path, $disk)) {
                Storage::disk($disk)->delete($this->cleanAssetPath($path));

                // مسح الكاش
                Cache::forget("asset_url:" . md5($path . $disk));
                Cache::forget("asset_exists:" . md5($path . $disk));

                return true;
            }
        } catch (\Exception $e) {
            Log::error('Failed to delete asset', [
                'path' => $path,
                'disk' => $disk,
                'error' => $e->getMessage()
            ]);
        }

        return false;
    }

    /**
     * الحصول على حجم الملف (بالـ KB)
     */
    protected function getAssetSize(?string $path, string $disk = 'public'): ?int
    {
        if (empty($path) || !$this->isStorageFile($path, $disk)) {
            return null;
        }

        try {
            $bytes = Storage::disk($disk)->size($this->cleanAssetPath($path));
            return (int) ceil($bytes / 1024); // Convert to KB
        } catch (\Exception $e) {
            Log::warning('Failed to get asset size', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * الحصول على MIME Type
     */
    protected function getAssetMimeType(?string $path, string $disk = 'public'): ?string
    {
        if (empty($path) || !$this->isStorageFile($path, $disk)) {
            return null;
        }

        try {
            return Storage::disk($disk)->mimeType($this->cleanAssetPath($path));
        } catch (\Exception $e) {
            Log::warning('Failed to get asset MIME type', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
