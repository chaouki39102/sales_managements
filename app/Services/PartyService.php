<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\FiscalYear;
use App\Models\OpeningBalanceParty;
use App\Models\Party;
use Illuminate\Database\Eloquent\Model;

class PartyService extends \App\Core\Services\BaseService
{
    protected string $model        = Party::class;
    protected string $resourceName = 'party';
    protected array $defaultWith   = ['partyType', 'legalForm', 'commune', 'wilaya'];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ─── beforeCreate ────────────────────────────────────────────────────────

    protected function beforeCreate(array $data, $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['code'])) {
            $data['code'] = $this->generatePartyCode(
                $data['party_type_id'],
                app(CompanyContextService::class)->get()
            );
        }

        $this->validateAlgerianFields($data);

        return $data;
    }

    // ─── afterCreate ─────────────────────────────────────────────────────────

    /**
     * إنشاء الرصيد الافتتاحي إذا أرسل المستخدم initial_balance.
     * initial_balance ليس عمود في parties (تم حذفه) — يُقرأ من $data فقط.
     * Validation rule في StorePartyRequest: 'initial_balance' => 'sometimes|numeric'
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        $initialBalance = (float) ($data['initial_balance'] ?? 0);

        if ($initialBalance === 0.0) {
            return;
        }

        $fiscalYear = FiscalYear::where('company_id', $item->company_id)
            ->where('is_current', true)
            ->where('is_closed',  false)
            ->first();

        if (!$fiscalYear) {
            return;
        }

        OpeningBalanceParty::create([
            'company_id'      => $item->company_id,
            'fiscal_year_id'  => $fiscalYear->id,
            'party_id'        => $item->id,
            'opening_balance' => abs($initialBalance),
            'balance_type'    => $initialBalance >= 0 ? 'debit' : 'credit',
        ]);
    }

    // ─── afterCreateCommitted ─────────────────────────────────────────────────

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // Send welcome notification if needed
        // Mail::send(new PartyCreatedNotification($item));
    }

    // ─── beforeUpdate ─────────────────────────────────────────────────────────

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->active && isset($data['active']) && !$data['active']) {
            if ($item->commercialDocuments()->where('status', 'confirmed')->exists()) {
                throw new BusinessRuleException(
                    'لا يمكن إلغاء تفعيل متعامل لديه وثائق تجارية نشطة',
                    409
                );
            }
        }

        $this->validateAlgerianFields($data, $item);
    }

    // ─── afterUpdateCommitted ─────────────────────────────────────────────────

    protected function afterUpdateCommitted(Model $item, array $data, $request): void
    {
        if (isset($data['active']) || isset($data['credit_limit'])) {
            // Additional cache clearing if needed
        }
    }

    // ─── beforeDelete ─────────────────────────────────────────────────────────

    protected function beforeDelete(Model $item): void
    {
        if ($item->commercialDocuments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه وثائق تجارية', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف متعامل لديه دفعات', 409);
        }
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private function generatePartyCode(int $partyTypeId, ?int $companyId): string
    {
        $prefix = $partyTypeId === 1 ? 'CUS' : 'SUP';

        do {
            $code = $prefix . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (
            Party::where('code', $code)
            ->where('company_id', $companyId)
            ->exists()
        );

        return $code;
    }

    private function validateAlgerianFields(array $data, ?Party $existingParty = null): void
    {
        $companyId = app(CompanyContextService::class)->get();

        if (!empty($data['nif'])) {
            if (!preg_match('/^\d{15,20}$/', $data['nif'])) {
                throw new BusinessRuleException('رقم التعريف الجبائي يجب أن يكون 15-20 رقم', 422);
            }
            $query = Party::where('nif', $data['nif'])->where('company_id', $companyId);
            if ($existingParty) $query->where('id', '!=', $existingParty->id);
            if ($query->exists()) {
                throw new BusinessRuleException('رقم التعريف الجبائي موجود بالفعل', 422);
            }
        }

        if (!empty($data['rc'])) {
            if (strlen($data['rc']) < 3 || strlen($data['rc']) > 50) {
                throw new BusinessRuleException('رقم السجل التجاري غير صحيح', 422);
            }
        }

        if (!empty($data['nis'])) {
            if (!preg_match('/^\d{15,18}$/', $data['nis'])) {
                throw new BusinessRuleException('رقم التعريف الإحصائي يجب أن يكون 15-18 رقم', 422);
            }
        }

        if (!empty($data['email'])) {
            $query = Party::where('email', $data['email'])->where('company_id', $companyId);
            if ($existingParty) $query->where('id', '!=', $existingParty->id);
            if ($query->exists()) {
                throw new BusinessRuleException('البريد الإلكتروني موجود بالفعل', 422);
            }
        }

        if (isset($data['credit_limit']) && $data['credit_limit'] < 0) {
            throw new BusinessRuleException('الحد الائتماني لا يمكن أن يكون سالباً', 422);
        }
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(CompanyContextService::class)->get();
    }



    public function getCustomers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
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
            ->where(fn($q) => $q->whereNull('active')->orWhere('active', true))
            ->orderBy('name')
            ->paginate($params['per_page'] ?? 30);
    }

    /**
     * Get suppliers (party_type_id = 2) with pagination
     */
    public function getSuppliers(array $params = [])
    {
        return Party::where('company_id', $this->getCurrentCompanyId())
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
