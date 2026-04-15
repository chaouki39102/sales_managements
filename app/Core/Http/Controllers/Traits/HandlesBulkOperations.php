<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;

/**
 * Trait HandlesBulkOperations
 *
 * يوفر عمليات جماعية (Bulk Operations) للـ API
 * - Bulk Delete
 * - Bulk Update
 * - Bulk Restore
 */
trait HandlesBulkOperations
{
    /**
     * حذف عدة عناصر دفعة واحدة (Soft Delete)
     *
     * Expected Request Body:
     * {
     *   "ids": [1, 2, 3, 4]
     * }
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            // التحقق من البيانات
            $validator = Validator::make($request->all(), [
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer|exists:' . (new $this->model)->getTable() . ',id',
            ], [
                'ids.required' => 'يجب تحديد العناصر المراد حذفها',
                'ids.array' => 'صيغة البيانات غير صحيحة',
                'ids.min' => 'يجب تحديد عنصر واحد على الأقل',
                'ids.*.exists' => 'أحد العناصر المحددة غير موجود',
            ]);

            if ($validator->fails()) {
                throw new ValidationException($validator);
            }

            $ids = $request->input('ids');

            return DB::transaction(function () use ($ids) {
                // التحقق من الصلاحيات لكل عنصر
                $items = $this->model::whereIn('id', $ids)->get();

                foreach ($items as $item) {
                    $this->authorizeAction('delete', $item);
                }

                // حذف العناصر
                $deletedCount = $this->model::whereIn('id', $ids)->delete();

                // مسح الكاش وإطلاق الأحداث
                $this->clearModelCache();

                foreach ($items as $item) {
                    $this->logOperation('bulk_delete', $item);
                    Event::dispatch("{$this->resourceName}.deleted", $item);
                }

                return $this->successResponse([
                    'deleted_count' => $deletedCount,
                    'deleted_ids' => $ids,
                ], "تم حذف {$deletedCount} من {$this->resourceName} بنجاح");
            });

        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->validator->errors()->first(),
                422,
                'VALIDATION_ERROR'
            );
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->errorResponse(
                'ليس لديك صلاحية لحذف بعض العناصر المحددة',
                403,
                'AUTHORIZATION_ERROR'
            );
        } catch (\Throwable $e) {
            $this->handleUnexpectedException($e, 'bulkDelete');
            return $this->errorResponse('فشل الحذف الجماعي', 500);
        }
    }

    /**
     * تحديث عدة عناصر دفعة واحدة
     *
     * Expected Request Body:
     * {
     *   "ids": [1, 2, 3],
     *   "data": {
     *     "status": "active",
     *     "category_id": 5
     *   }
     * }
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        try {
            // التحقق من البيانات الأساسية
            $validator = Validator::make($request->all(), [
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer|exists:' . (new $this->model)->getTable() . ',id',
                'data' => 'required|array|min:1',
            ], [
                'ids.required' => 'يجب تحديد العناصر المراد تحديثها',
                'ids.array' => 'صيغة البيانات غير صحيحة',
                'ids.min' => 'يجب تحديد عنصر واحد على الأقل',
                'ids.*.exists' => 'أحد العناصر المحددة غير موجود',
                'data.required' => 'يجب تحديد البيانات المراد تحديثها',
                'data.array' => 'صيغة البيانات غير صحيحة',
                'data.min' => 'يجب تحديد حقل واحد على الأقل للتحديث',
            ]);

            if ($validator->fails()) {
                throw new ValidationException($validator);
            }

            $ids = $request->input('ids');
            $updateData = $request->input('data');

            return DB::transaction(function () use ($ids, $updateData, $request) {
                // جلب العناصر والتحقق من الصلاحيات
                $items = $this->model::whereIn('id', $ids)->get();

                foreach ($items as $item) {
                    $this->authorizeAction('update', $item);
                }

                // ✅ تمرير التحديث عبر الـ Service إن وجد لضمان تنفيذ الـ Hooks وقواعد العمل
                // إذا لم يكن الكنترولر يعرّف getService()، نستخدم update مباشر كـ fallback
                if (method_exists($this, 'getService')) {
                    $service = $this->getService();
                    foreach ($items as $item) {
                        $service->update($item, $updateData, $request);
                    }
                    $updatedCount = $items->count();
                } else {
                    $updatedCount = $this->model::whereIn('id', $ids)->update($updateData);
                }

                // مسح الكاش وإطلاق الأحداث
                $this->clearModelCache();

                // إعادة جلب العناصر المحدثة
                $updatedItems = $this->model::whereIn('id', $ids)->get();

                foreach ($updatedItems as $item) {
                    $this->logOperation('bulk_update', $item, ['updated_fields' => array_keys($updateData)]);
                    Event::dispatch("{$this->resourceName}.updated", $item);
                }

                return $this->successResponse([
                    'updated_count' => $updatedCount,
                    'updated_ids' => $ids,
                    'updated_data' => $updateData,
                ], "تم تحديث {$updatedCount} من {$this->resourceName} بنجاح");
            });

        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->validator->errors()->first(),
                422,
                'VALIDATION_ERROR'
            );
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->errorResponse(
                'ليس لديك صلاحية لتحديث بعض العناصر المحددة',
                403,
                'AUTHORIZATION_ERROR'
            );
        } catch (\Throwable $e) {
            $this->handleUnexpectedException($e, 'bulkUpdate');
            return $this->errorResponse('فشل التحديث الجماعي', 500);
        }
    }

    /**
     * استعادة عدة عناصر محذوفة دفعة واحدة
     *
     * Expected Request Body:
     * {
     *   "ids": [1, 2, 3, 4]
     * }
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkRestore(Request $request): JsonResponse
    {
        try {
            // التحقق من أن الموديل يدعم Soft Deletes
            if (!method_exists($this->model, 'withTrashed')) {
                return $this->errorResponse(
                    'هذا المورد لا يدعم الاستعادة',
                    400,
                    'FEATURE_NOT_SUPPORTED'
                );
            }

            // التحقق من البيانات
            $validator = Validator::make($request->all(), [
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer',
            ], [
                'ids.required' => 'يجب تحديد العناصر المراد استعادتها',
                'ids.array' => 'صيغة البيانات غير صحيحة',
                'ids.min' => 'يجب تحديد عنصر واحد على الأقل',
            ]);

            if ($validator->fails()) {
                throw new ValidationException($validator);
            }

            $ids = $request->input('ids');

            return DB::transaction(function () use ($ids) {
                // جلب العناصر المحذوفة والتحقق من الصلاحيات
                $items = $this->model::onlyTrashed()->whereIn('id', $ids)->get();

                if ($items->isEmpty()) {
                    return $this->errorResponse(
                        'لم يتم العثور على عناصر محذوفة بالمعرفات المحددة',
                        404,
                        'NOT_FOUND'
                    );
                }

                foreach ($items as $item) {
                    $this->authorizeAction('restore', $item);
                }

                // استعادة العناصر
                $restoredCount = $this->model::onlyTrashed()->whereIn('id', $ids)->restore();

                // مسح الكاش وإطلاق الأحداث
                $this->clearModelCache();

                // إعادة جلب العناصر المستعادة
                $restoredItems = $this->model::whereIn('id', $ids)->get();

                foreach ($restoredItems as $item) {
                    $this->logOperation('bulk_restore', $item);
                    Event::dispatch("{$this->resourceName}.restored", $item);
                }

                return $this->successResponse([
                    'restored_count' => $restoredCount,
                    'restored_ids' => $ids,
                ], "تم استعادة {$restoredCount} من {$this->resourceName} بنجاح");
            });

        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->validator->errors()->first(),
                422,
                'VALIDATION_ERROR'
            );
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->errorResponse(
                'ليس لديك صلاحية لاستعادة بعض العناصر المحددة',
                403,
                'AUTHORIZATION_ERROR'
            );
        } catch (\Throwable $e) {
            $this->handleUnexpectedException($e, 'bulkRestore');
            return $this->errorResponse('فشل الاستعادة الجماعية', 500);
        }
    }

    /**
     * حذف نهائي لعدة عناصر دفعة واحدة (Force Delete)
     *
     * Expected Request Body:
     * {
     *   "ids": [1, 2, 3, 4]
     * }
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkForceDelete(Request $request): JsonResponse
    {
        try {
            // التحقق من أن الموديل يدعم Soft Deletes
            if (!method_exists($this->model, 'withTrashed')) {
                return $this->errorResponse(
                    'هذا المورد لا يدعم الحذف النهائي',
                    400,
                    'FEATURE_NOT_SUPPORTED'
                );
            }

            // التحقق من البيانات
            $validator = Validator::make($request->all(), [
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer',
            ], [
                'ids.required' => 'يجب تحديد العناصر المراد حذفها نهائياً',
                'ids.array' => 'صيغة البيانات غير صحيحة',
                'ids.min' => 'يجب تحديد عنصر واحد على الأقل',
            ]);

            if ($validator->fails()) {
                throw new ValidationException($validator);
            }

            $ids = $request->input('ids');

            return DB::transaction(function () use ($ids) {
                // جلب العناصر (بما فيها المحذوفة) والتحقق من الصلاحيات
                $items = $this->model::withTrashed()->whereIn('id', $ids)->get();

                if ($items->isEmpty()) {
                    return $this->errorResponse(
                        'لم يتم العثور على عناصر بالمعرفات المحددة',
                        404,
                        'NOT_FOUND'
                    );
                }

                foreach ($items as $item) {
                    $this->authorizeAction('forceDelete', $item);

                    // حذف الملفات المرتبطة
                    if (method_exists($this, 'deleteAssociatedFiles')) {
                        $this->deleteAssociatedFiles($item);
                    }
                }

                // الحذف النهائي
                $deletedCount = $this->model::withTrashed()->whereIn('id', $ids)->forceDelete();

                // مسح الكاش وإطلاق الأحداث
                $this->clearModelCache();

                foreach ($items as $item) {
                    $this->logOperation('bulk_force_delete', $item);
                    Event::dispatch("{$this->resourceName}.force_deleted", $item);
                }

                return $this->successResponse([
                    'deleted_count' => $deletedCount,
                    'deleted_ids' => $ids,
                ], "تم الحذف النهائي لـ {$deletedCount} من {$this->resourceName} بنجاح");
            });

        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->validator->errors()->first(),
                422,
                'VALIDATION_ERROR'
            );
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->errorResponse(
                'ليس لديك صلاحية لحذف بعض العناصر المحددة نهائياً',
                403,
                'AUTHORIZATION_ERROR'
            );
        } catch (\Throwable $e) {
            $this->handleUnexpectedException($e, 'bulkForceDelete');
            return $this->errorResponse('فشل الحذف النهائي الجماعي', 500);
        }
    }

    // --- ملاحظة: الدوال التالية مُعرَّفة في BaseApiController ---
    // authorizeAction, clearModelCache, logOperation,
    // handleUnexpectedException, successResponse, errorResponse
}
