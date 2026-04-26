<?php

namespace App\Services;

use App\Models\Party;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Party Service
 *
 * إدارة الأطراف (العملاء والموردين) مع المتطلبات الجزائرية:
 * - RC, NIF, NIS, AI
 * - التحقق من صحة البيانات
 * - إدارة الأرصدة والحدود الائتمانية
 *
 * @package App\Services
 */
class PartyService extends \App\Core\Services\BaseService
{
    protected string $model = Party::class;
    protected string $resourceName = 'party';
    protected array $defaultWith = ['partyType', 'legalForm', 'commune', 'wilaya'];

    /**
     * Before creating - data preparation and validation
     */
    protected function beforeCreate(array $data, $request): array
    {
        // Generate unique code if not provided
        if (empty($data['code'])) {
            $data['code'] = $this->generatePartyCode($data['party_type_id']);
        }

        // Generate slug from name
        if (!isset($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->generateSlug($data['name']);
        }

        // Algerian-specific validations
        $this->validateAlgerianFields($data);

        return $data;
    }

    /**
     * After create - within transaction
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        // Any post-creation logic within transaction
        // e.g., create opening balance if needed
    }

    /**
     * After database commit - external operations
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send welcome notification if needed
        // Mail::send(new PartyCreatedNotification($item));
    }

    /**
     * Before update - business rules validation
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // Check if party is active before critical changes
        if ($item->active && isset($data['active']) && !$data['active']) {
            // Check if party has active commercial documents
            if ($item->commercialDocuments()->where('status', 'confirmed')->exists()) {
                throw new BusinessRuleException('لا يمكن إلغاء تفعيل متعامل لديه وثائق تجارية نشطة', 409);
            }
        }

        // Validate Algerian fields if changed
        $this->validateAlgerianFields($data, $item);
    }

    /**
     * After update committed
     */
    protected function afterUpdateCommitted(Model $item, array $data, $request): void
    {
        // Clear related caches if critical data changed
        if (isset($data['active']) || isset($data['credit_limit'])) {
            // Additional cache clearing if needed
        }
    }

    /**
     * Before delete - business rules
     */
    protected function beforeDelete(Model $item): void
    {
        // Check if party can be deleted
        if ($item->commercialDocuments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه وثائق تجارية', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه دفعات', 409);
        }
    }

    /**
     * Generate unique party code
     */
    private function generatePartyCode(int $partyTypeId): string
    {
        $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP'; // Assuming 1=customer, 2=supplier

        do {
            $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Party::where('code', $code)->exists());

        return $code;
    }

    /**
     * Generate slug from name
     */
    private function generateSlug(string $name): string
    {
        $slug = strtolower(str_replace([' ', '.', ','], '-', $name));
        $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
        $originalSlug = $slug;
        $counter = 1;

        while (Party::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Validate Algerian-specific fields
     */
    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
    {
        // NIF validation (Algerian tax number - 15-16 digits usually)
        if (isset($data['nif']) && !empty($data['nif'])) {
            if (!preg_match('/^\d{15,16}$/', $data['nif'])) {
                throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-16 رقم', 422);
            }

            // Check uniqueness except for current party
            $query = Party::where('nif', $data['nif']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
            }
        }

        // RC validation (Commercial Register)
        if (isset($data['rc']) && !empty($data['rc'])) {
            if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
                throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
            }
        }

        // NIS validation (Statistical number)
        if (isset($data['nis']) && !empty($data['nis'])) {
            if (!preg_match('/^\d{10,15}$/', $data['nis'])) {
                throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 10-15 رقم', 422);
            }
        }

        // Email uniqueness
        if (isset($data['email']) && !empty($data['email'])) {
            $query = Party::where('email', $data['email']);
            if ($existingParty) {
                $query->where('id', '!=', $existingParty->id);
            }
            if ($query->exists()) {
                throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
            }
        }

        // Credit limit validation
        if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
            throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
        }
    }

    /**
     * Get customers only
     */
    public function getCustomers()
    {
        return $this->model::customers()->active()->get();
    }

    /**
     * Get suppliers only
     */
    public function getSuppliers()
    {
        return $this->model::suppliers()->active()->get();
    }
}
