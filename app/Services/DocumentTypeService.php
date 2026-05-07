<?php

namespace App\Services;

use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Collection;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * إعادة جميع أنواع المستندات مرتبةً حسب display_order
     */
    public function getAllOrdered(array $filters = []): Collection
    {
        return DocumentType::query()
            ->when(isset($filters['active']), fn($q) => $q->where('active', $filters['active']))
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
    }
}
