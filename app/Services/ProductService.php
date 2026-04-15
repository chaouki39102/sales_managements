<?php

namespace App\Services;

use App\Models\Product;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Product Service
 *
 * إدارة المنتجات مع:
 * - إدارة المتغيرات (Variants)
 * - إدارة المخزون
 * - البحث والترتيب
 * - إدارة العائلات والعلامات التجارية
 *
 * @package App\Services
 */
class ProductService extends \App\Core\Services\BaseService
{
    protected string $model = Product::class;
    protected string $resourceName = 'product';
    protected array $defaultWith = ['family', 'brand', 'productType'];

    /**
     * Before creating - data preparation
     */
    protected function beforeCreate(array $data, $request): array
    {
        if (empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateUniqueSlug($data['name']);
        }

        return $data;
    }

    /**
     * After database commit - external operations
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send notification to relevant parties
    }

    /**
     * Before update - business rules
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->isDirty('active') && !$data['active'] && $item->variants()->exists()) {
            throw new BusinessRuleException('Cannot deactivate product with active variants', 409);
        }

        if (isset($data['name']) && $data['name'] !== $item->name) {
            $data['slug'] = $this->generateUniqueSlug($data['name'], $item->id);
        }
    }

    /**
     * Before delete - business rules
     */
    protected function beforeDelete(Model $item): void
    {
        if ($item->variants()->exists()) {
            throw new BusinessRuleException('Cannot delete product with variants', 409);
        }

        if ($item->commercialDocumentLines()->exists()) {
            throw new BusinessRuleException('Cannot delete product with commercial documents', 409);
        }
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $slug = \Illuminate\Support\Str::slug($name);
        $query = Product::where('slug', 'like', $slug . '%');

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $existing = $query->pluck('slug');
        
        if (!$existing->contains($slug)) {
            return $slug;
        }

        $counter = 1;
        while ($existing->contains($slug . '-' . $counter)) {
            $counter++;
        }

        return $slug . '-' . $counter;
    }

    /**
     * Get active products only
     */
    public function getActiveProducts()
    {
        return $this->model::active()->get();
    }

    /**
     * Get products by family
     */
    public function getByFamily(int $familyId)
    {
        return $this->model::byFamily($familyId)->active()->get();
    }

    /**
     * Get products by brand
     */
    public function getByBrand(int $brandId)
    {
        return $this->model::byBrand($brandId)->active()->get();
    }

    /**
     * Get products with variants
     */
    public function getWithVariants()
    {
        return $this->model::withVariants()->active()->get();
    }
}
