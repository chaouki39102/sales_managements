<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Barcode;
use App\Models\Product;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BarcodeService extends \App\Core\Services\BaseService
{
    protected string $model        = Barcode::class;
    protected string $resourceName = 'barcode';
    protected function getResourceName(): string { return $this->resourceName; }


    // barcodes.company_id  → companies        (cascadeOnDelete)
    // barcodes.product_id  → products         (cascadeOnDelete)
    // barcodes.variant_id  → product_variants (nullable, cascadeOnDelete)
    // barcodes.created_by  → users            (nullable)
    // الأنواع: primary | unit | box | supplier | etc.
    protected array $defaultWith = ['product', 'variant'];

    // =========================================================
    // Hooks
    // =========================================================

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data['company_id'] ??= $this->getCurrentCompanyId();
        $data['created_by'] ??= auth()->id();

        // منتج واحد لا يمكن أن يكون له أكثر من باركود primary
        if ($data['is_primary'] ?? false) {
            $this->ensureNoPrimaryExists(
                productId: $data['product_id'],
                variantId: $data['variant_id'] ?? null,
            );
        }

        // الباركود الأول للمنتج/variant يصبح primary تلقائياً
        if (!isset($data['is_primary'])) {
            $data['is_primary'] = !$this->productHasAnyBarcode(
                productId: $data['product_id'],
                variantId: $data['variant_id'] ?? null,
            );
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // Auto-sync products.barcode when this barcode is primary
        if ($item->is_primary && $item->product_id) {
            Product::where('id', $item->product_id)->update(['barcode' => $item->barcode]);
        }
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // product_id و company_id لا يتغيران أبداً بعد الإنشاء
        if (isset($data['product_id']) && (int) $data['product_id'] !== (int) $item->product_id) {
            throw new BusinessRuleException('لا يمكن تغيير المنتج المرتبط بالباركود بعد الإنشاء.', 422);
        }

        if (isset($data['company_id']) && (int) $data['company_id'] !== (int) $item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالباركود.', 422);
        }

        // إذا أراد المستخدم إزالة is_primary عن هذا الباركود
        // يجب أن يكون هناك باركود primary آخر وإلا نرفض
        if (isset($data['is_primary']) && !$data['is_primary'] && $item->is_primary) {
            $otherPrimaryExists = $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('id', '!=',    $item->id)
                ->where('is_primary',  true)
                ->exists();

            if (!$otherPrimaryExists) {
                throw new BusinessRuleException(
                    'لا يمكن إلغاء الباركود الرئيسي دون تعيين باركود رئيسي آخر.',
                    422
                );
            }
        }

        // إذا أراد المستخدم تعيين هذا الباركود primary
        // نتحقق مسبقاً قبل الدخول في Transaction
        if (($data['is_primary'] ?? false) && !$item->is_primary) {
            $this->ensureNoPrimaryExists(
                productId: $item->product_id,
                variantId: $item->variant_id,
                exceptId:  $item->id,
            );
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // نمنع تمرير هذين الحقلين إلى update() نهائياً
        unset($data['product_id'], $data['company_id']);

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // إذا أصبح هذا الباركود primary → نزيل is_primary عن البقية (داخل نفس Transaction)
        if ($item->is_primary) {
            $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('id', '!=',    $item->id)
                ->where('is_primary',  true)
                ->update(['is_primary' => false]);

            // Auto-sync products.barcode when this barcode is primary
            if ($item->product_id) {
                Product::where('id', $item->product_id)->update(['barcode' => $item->barcode]);
            }
        }

        // If is_primary was removed from this barcode, find new primary and sync
        if (!$item->is_primary && $item->product_id) {
            $newPrimary = $this->model::where('company_id', $item->company_id)
                ->where('product_id', $item->product_id)
                ->where('is_primary', true)
                ->first();
            Product::where('id', $item->product_id)
                ->update(['barcode' => $newPrimary?->barcode]);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        // لا يمكن حذف الباركود الرئيسي إذا كان هناك باركودات أخرى للمنتج
        if ($item->is_primary) {
            $othersExist = $this->model::where('company_id', $item->company_id)
                ->where('product_id', $item->product_id)
                ->where('id', '!=',   $item->id)
                ->exists();

            if ($othersExist) {
                throw new BusinessRuleException(
                    'لا يمكن حذف الباركود الرئيسي. عيّن باركوداً آخر كرئيسي أولاً.',
                    422
                );
            }
        }
    }

    protected function afterDelete(Model $item): void
    {
        // إذا حُذف الباركود الرئيسي (حالة: كان الوحيد ثم حُذف)
        // نُعيّن أقدم باركود تلقائياً كـ primary إن وُجد
        if ($item->is_primary) {
            $newPrimary = $this->model::where('company_id', $item->company_id)
                ->where('product_id', $item->product_id)
                ->oldest()
                ->first();

            if ($newPrimary) {
                $newPrimary->update(['is_primary' => true]);
            }

            // Auto-sync products.barcode
            if ($item->product_id) {
                Product::where('id', $item->product_id)
                    ->update(['barcode' => $newPrimary?->barcode]);
            }
        }
    }

    // =========================================================
    // Custom Queries
    // =========================================================

    /**
     * البحث بالباركود داخل نطاق الشركة الحالية
     */
    public function findByBarcode(string $barcode): ?Model
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('barcode', $barcode)
            ->with($this->defaultWith)
            ->first();
    }

    /**
     * جميع باركودات منتج معين مرتبة (primary أولاً)
     */
    public function forProduct(int $productId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId)
            ->with($this->defaultWith)
            ->orderByDesc('is_primary')
            ->get();
    }

    /**
     * جميع باركودات variant معين مرتبة (primary أولاً)
     */
    public function forVariant(int $variantId): \Illuminate\Database\Eloquent\Collection
    {
        return $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('variant_id', $variantId)
            ->with($this->defaultWith)
            ->orderByDesc('is_primary')
            ->get();
    }

    /**
     * تعيين باركود معين كـ primary بشكل atomic
     * (بديل أنظف من تمرير is_primary عبر update())
     */
    public function makePrimary(Model $item): Model
    {
        if ($item->is_primary) {
            return $item;
        }

        DB::transaction(function () use ($item) {
            $this->model::where('company_id', $item->company_id)
                ->where('product_id',  $item->product_id)
                ->where('is_primary',  true)
                ->update(['is_primary' => false]);

            $item->update(['is_primary' => true]);
        });

        $this->performPostCommitOperations($item, [], request(), 'update');

        return $item->fresh($this->defaultWith);
    }

    // =========================================================
    // Private Helpers
    // =========================================================

    /**
     * يتحقق أنه لا يوجد باركود primary آخر لنفس المنتج/variant
     */
    private function ensureNoPrimaryExists(int $productId, ?int $variantId, ?int $exceptId = null): void
    {
        $query = $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId)
            ->where('is_primary',  true);

        if ($variantId !== null) {
            $query->where('variant_id', $variantId);
        } else {
            $query->whereNull('variant_id');
        }

        if ($exceptId !== null) {
            $query->where('id', '!=', $exceptId);
        }

        if ($query->exists()) {
            throw new BusinessRuleException(
                'يوجد بالفعل باركود رئيسي لهذا المنتج. قم بإلغائه أولاً أو استخدم makePrimary().',
                422
            );
        }
    }

    /**
     * هل للمنتج/variant باركود واحد على الأقل؟
     */
    private function productHasAnyBarcode(int $productId, ?int $variantId): bool
    {
        $query = $this->model::where('company_id', $this->getCurrentCompanyId())
            ->where('product_id', $productId);

        if ($variantId !== null) {
            $query->where('variant_id', $variantId);
        } else {
            $query->whereNull('variant_id');
        }

        return $query->exists();
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->getCurrentCompanyId();
    }
}
