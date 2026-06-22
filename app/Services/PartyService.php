<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\FiscalYear;
use App\Models\OpeningBalanceParty;
use App\Models\Party;
use App\Models\PartyType;
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

    // ─── استخراج params مع دعم filter[key] و key مباشرة ─────────────────────
    // الفرونتاند يُرسل: filter[search]=... و filter[active]=...
    // Laravel يُحوّلها إلى: $params['filter']['search'] و $params['filter']['active']
    // لكن النسخة القديمة كانت تقرأ: $params['search'] و $params['active'] — خطأ

    private function extractParam(array $params, string $key, mixed $default = null): mixed
    {
        // أولاً: ابحث في filter[key] (ما يُرسله الفرونتاند)
        if (isset($params['filter'][$key]) && $params['filter'][$key] !== '') {
            return $params['filter'][$key];
        }
        // ثانياً: ابحث في المستوى الأول (للتوافق مع أي استخدام مباشر)
        if (isset($params[$key]) && $params[$key] !== '') {
            return $params[$key];
        }
        return $default;
    }

    // ─── getCustomers ─────────────────────────────────────────────────────────

    public function getCustomers(array $params = [])
    {
        $companyId    = $this->getCurrentCompanyId();
        $clientTypeId = PartyType::withoutGlobalScope(\App\Models\Scopes\CompanyScope::class)
            ->where(fn($q) => $q->where('name', 'client')->orWhere('slug', 'client'))
            ->value('id');

        // ✅ استخراج صحيح: يدعم filter[search] و filter[active] و search و active
        $search   = $this->extractParam($params, 'search');
        $active   = $this->extractParam($params, 'active');
        $perPage  = (int) ($params['per_page']  ?? 25);
        $page     = (int) ($params['page']       ?? 1);
        $sortBy   = $params['sort_by']  ?? 'name';
        $sortDir  = $params['sort_dir'] ?? 'asc';

        return Party::with(['commune', 'wilaya', 'legalForm', 'defaultPriceLevel'])
            ->where('company_id', $companyId)
            ->where('party_type_id', $clientTypeId)
            // ── فلتر البحث ──────────────────────────────────────────────────
            ->when(
                !empty($search),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name',             'like', "%{$search}%")
                        ->orWhere('commercial_name', 'like', "%{$search}%")
                        ->orWhere('phone',           'like', "%{$search}%")
                        ->orWhere('nif',             'like', "%{$search}%")
                )
            )
            // ── فلتر الحالة: null = الكل، 1 = نشط، 0 = موقوف ──────────────
            ->when(
                $active !== null,
                fn($q) => $q->where('active', filter_var($active, FILTER_VALIDATE_BOOLEAN))
            )
            // ── الترتيب ──────────────────────────────────────────────────────
            ->orderBy($sortBy, $sortDir)
            // ── التصفيح ──────────────────────────────────────────────────────
            ->paginate(
                max(5, min(100, $perPage)),
                ['*'],
                'page',
                max(1, $page)
            );
    }

    // ─── getSuppliers ─────────────────────────────────────────────────────────

    public function getSuppliers(array $params = [])
    {
        $companyId      = $this->getCurrentCompanyId();
        $supplierTypeId = PartyType::withoutGlobalScope(\App\Models\Scopes\CompanyScope::class)
            ->where(fn($q) => $q->where('name', 'supplier')->orWhere('slug', 'supplier'))
            ->value('id');

        // ✅ نفس الإصلاح
        $search  = $this->extractParam($params, 'search');
        $active  = $this->extractParam($params, 'active');
        $perPage = (int) ($params['per_page'] ?? 25);
        $page    = (int) ($params['page']      ?? 1);
        $sortBy  = $params['sort_by']  ?? 'name';
        $sortDir = $params['sort_dir'] ?? 'asc';

        return Party::with(['commune', 'wilaya', 'legalForm', 'defaultPriceLevel'])
            ->where('company_id', $companyId)
            ->where('party_type_id', $supplierTypeId)
            ->when(
                !empty($search),
                fn($q) => $q->where(
                    fn($q2) => $q2
                        ->where('name',             'like', "%{$search}%")
                        ->orWhere('commercial_name', 'like', "%{$search}%")
                        ->orWhere('phone',           'like', "%{$search}%")
                        ->orWhere('nif',             'like', "%{$search}%")
                )
            )
            ->when(
                $active !== null,
                fn($q) => $q->where('active', filter_var($active, FILTER_VALIDATE_BOOLEAN))
            )
            ->orderBy($sortBy, $sortDir)
            ->paginate(
                max(5, min(100, $perPage)),
                ['*'],
                'page',
                max(1, $page)
            );
    }
}
