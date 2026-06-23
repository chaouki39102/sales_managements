<?php

namespace App\Services;

use App\Models\Party;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Party Service
 *
 * إدارة الأطراف (الزبائن والموردين) مع المتطلبات الجزائرية:
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
    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * Before creating - data preparation and validation
     */
    protected function beforeCreate(array $data, $request): array
{
    $data = parent::beforeCreate($data, $request); // ← أضف

    if (empty($data['code'])) {
        $data['code'] = $this->generatePartyCode(
            $data['party_type_id'],
            app(\App\Services\CompanyContextService::class)->get()
        );
    }

    // ← احذف generateSlug — HasTenantSlug يتولاه
    $this->validateAlgerianFields($data);
    return $data;
}

private function generatePartyCode(int $partyTypeId, ?int $companyId): string
{
    $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP';

    do {
        $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
    } while (
        Party::where('code', $code)
             ->where('company_id', $companyId) // ← أضف
             ->exists()
    );

    return $code;
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
     * Validate Algerian-specific fields
     */
    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
{
    $companyId = app(\App\Services\CompanyContextService::class)->get();

    if (isset($data['nif']) && !empty($data['nif'])) {
        if (!preg_match('/^\d{15,20}$/', $data['nif'])) {
            throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-20 رقم', 422);
        }

        $query = Party::where('nif', $data['nif'])
                      ->where('company_id', $companyId); // ← أضف
        if ($existingParty) {
            $query->where('id', '!=', $existingParty->id);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
        }
    }

    if (isset($data['rc']) && !empty($data['rc'])) {
        if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
            throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
        }
    }

    if (isset($data['nis']) && !empty($data['nis'])) {
        if (!preg_match('/^\d{15,18}$/', $data['nis'])) {
            throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 15-18 رقم', 422);
        }
    }

    if (isset($data['email']) && !empty($data['email'])) {
        $query = Party::where('email', $data['email'])
                      ->where('company_id', $companyId); // ← أضف
        if ($existingParty) {
            $query->where('id', '!=', $existingParty->id);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
        }
    }

    if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
        throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
    }
}

    /**
     * Get customers only
     */
    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }

    public function getCustomers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ فلترة بـ party_type_id مباشرة — لا نعتمد على party_types table
            // party_type_id = 1 → زبون (كما يُرسله الـ Frontend)
            ->where('party_type_id', 1)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            // active يمكن أن يكون null أو true — نقبل كليهما
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }

    public function getSuppliers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
            // ✅ party_type_id = 2 → مورد
            ->where('party_type_id', 2)
            ->when(
                !empty($params['search']),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name', 'like', "%{$params['search']}%")
                        ->orWhere('phone', 'like', "%{$params['search']}%")
                        ->orWhere('nif', 'like', "%{$params['search']}%")
                )
            )
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }
}
