<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * BackupController — إدارة النسخ الاحتياطي من داخل الإعدادات.
 *
 * المسارات داخل {company} وتتطلب صلاحية can:update_company (مالك/مدير)،
 * لأن ملف النسخة يحتوي على قاعدة بيانات الشركة كاملة.
 *
 * عمليات النسخ الاحتياطي تُنفَّذ على مستوى النظام (وليست خاصة بشركة معينة)
 * عبر BackupService — هذا هو SSOT الوحيد لقراءة/كتابة ملفات storage/app/backups.
 */
class BackupController extends BaseApiController
{
    protected string $resourceName = 'backup';

    public function __construct(private BackupService $backupService)
    {
        parent::__construct();
    }

    /**
     * قائمة ملفات النسخ الاحتياطي.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            return $this->successResponse(
                $this->backupService->list(),
                'تم جلب قائمة النسخ الاحتياطي بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * إنشاء نسخة احتياطية جديدة.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $label = (string) $request->input('label', '');
            $keep  = $request->has('keep') ? (int) $request->input('keep') : null;

            $created = $this->backupService->backup($label !== '' ? $label : null, $keep);

            return $this->successResponse($created, 'تم إنشاء النسخة الاحتياطية بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * التحقق من سلامة نسخة (المجموع الاختباري sha256).
     */
    public function verify(Request $request, string $file): JsonResponse
    {
        try {
            return $this->successResponse(
                $this->backupService->verify($file),
                'النسخة الاحتياطية سليمة'
            );
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * تنزيل ملف النسخة الاحتياطية.
     */
    public function download(Request $request, string $file)
    {
        try {
            $path = $this->backupService->resolveForDownload($file);
            return response()->download($path, basename($file));
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * استعادة نسخة احتياطية (يستبدل قاعدة البيانات الحالية).
     *
     * الاسم doRestore لتجنب تعارض الوراثة مع BaseApiController::restore($id).
     */
    public function doRestore(Request $request, string $file): JsonResponse
    {
        try {
            $confirmed = (bool) $request->input('confirmed', false);
            $safety    = $this->backupService->restore($file, $confirmed);

            return $this->successResponse([
                'file'   => $file,
                'safety' => $safety !== '' ? basename($safety) : '',
            ], 'تمت الاستعادة بنجاح — سيتم إعادة تحميل التطبيق');
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * حذف نسخة احتياطية (+ ملف المجموع الاختباري).
     *
     * التوقيع يطابق BaseApiController::destroy($id) — تقييد نوع المعامل يكسر LSP.
     */
    public function destroy($file): JsonResponse
    {
        try {
            $this->backupService->delete((string) $file);
            return $this->successResponse(null, 'تم حذف النسخة الاحتياطية بنجاح');
        } catch (\Throwable $e) {
            return $this->backupError($e);
        }
    }

    /**
     * ترجمة أخطاء BackupService (RuntimeException) إلى ردود JSON عربية واضحة.
     */
    protected function backupError(\Throwable $e): JsonResponse
    {
        if ($e instanceof RuntimeException) {
            $msg = $e->getMessage();

            return match (true) {
                str_contains($msg, 'not found')          => $this->errorResponse(
                    'ملف النسخة الاحتياطية غير موجود.',
                    404,
                    'BACKUP_NOT_FOUND'
                ),
                str_contains($msg, 'Refusing to restore') => $this->errorResponse(
                    'يجب تأكيد الاستعادة — سيتم استبدال قاعدة البيانات الحالية.',
                    422,
                    'BACKUP_CONFIRM_REQUIRED'
                ),
                str_contains($msg, 'checksum'),
                str_contains($msg, 'corrupt'),
                str_contains($msg, 'Missing checksum')    => $this->errorResponse(
                    'النسخة الاحتياطية تالفة (المجموع الاختباري لا يطابق) — تم رفض العملية.',
                    422,
                    'BACKUP_CORRUPT'
                ),
                str_contains($msg, 'Decryption'),
                str_contains($msg, 'encrypted backup')    => $this->errorResponse(
                    'لا يمكن فك تشفير النسخة — مفتاح التشفير غير صحيح أو الملف تالف.',
                    422,
                    'BACKUP_DECRYPT_FAILED'
                ),
                default                                  => $this->errorResponse(
                    $msg,
                    422,
                    'BACKUP_ERROR'
                ),
            };
        }

        return $this->handleError($e, 'backup');
    }
}
