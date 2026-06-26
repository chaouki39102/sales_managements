<?php

namespace App\Services\Fiscal;

use App\Models\RegulatedProductConfig;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegulatedProductsService
{
    public function getList(int $companyId, bool $activeOnly = true): Collection
    {
        $query = RegulatedProductConfig::forCompany($companyId);

        if ($activeOnly) {
            $query->where('active', true);
        }

        return $query->orderBy('category')->orderBy('label')->get();
    }

    public function create(int $companyId, array $data, int $userId): RegulatedProductConfig
    {
        $data['company_id'] = $companyId;
        $data['updated_by'] = $userId;

        return RegulatedProductConfig::create($data);
    }

    public function update(int $id, array $data, int $userId): RegulatedProductConfig
    {
        $config = RegulatedProductConfig::findOrFail($id);
        $data['updated_by'] = $userId;
        $config->update($data);

        return $config->fresh();
    }

    public function toggle(int $id): RegulatedProductConfig
    {
        $config = RegulatedProductConfig::findOrFail($id);
        $config->update(['active' => !$config->active]);

        return $config->fresh();
    }

    public function delete(int $id): void
    {
        RegulatedProductConfig::findOrFail($id)->delete();
    }

    public function seedDefaults(int $companyId): void
    {
        $defaults = $this->getDefaults();
        $now = now();

        $rows = [];
        foreach ($defaults as $d) {
            $rows[] = [
                'company_id'          => $companyId,
                'product_key'         => $d['key'],
                'label'               => $d['label'],
                'unit_label'          => $d['unit'],
                'category'            => $d['cat'],
                'regulated_max_price' => $d['max_price'],
                'regulation_type'     => 'price',
                'legal_reference'     => $d['ref'],
                'active'              => true,
                'created_at'          => $now,
                'updated_at'          => $now,
            ];
        }

        foreach ($rows as $row) {
            RegulatedProductConfig::forCompany($companyId)->updateOrCreate(
                ['product_key' => $row['product_key']],
                $row,
            );
        }

        Log::info("RegulatedProductsService: تمت استعادة القائمة الافتراضية للشركة {$companyId}");
    }

    public function getDefaults(): array
    {
        return [
            ['key'=>'huile_5L',     'label'=>'زيت مائدة مدعم 5ل',  'unit'=>'عبوة 5ل',   'cat'=>'huile',  'max_price'=>650.00,  'ref'=>'م.ت 20-241 بتاريخ 31/08/2020'],
            ['key'=>'huile_2L',     'label'=>'زيت مائدة مدعم 2ل',  'unit'=>'عبوة 2ل',   'cat'=>'huile',  'max_price'=>250.00,  'ref'=>'م.ت 20-241'],
            ['key'=>'huile_1L',     'label'=>'زيت مائدة مدعم 1ل',  'unit'=>'عبوة 1ل',   'cat'=>'huile',  'max_price'=>125.00,  'ref'=>'م.ت 20-241'],
            ['key'=>'semoul_fin_1', 'label'=>'سميد ناعم 1كغ',       'unit'=>'كغ',         'cat'=>'semoul', 'max_price'=>42.50,   'ref'=>'م.ت 07-402 معدَّل بـ 20-242'],
            ['key'=>'semoul_ord_1', 'label'=>'سميد عادي 1كغ',       'unit'=>'كغ',         'cat'=>'semoul', 'max_price'=>38.50,   'ref'=>'م.ت 07-402 معدَّل بـ 20-242'],
            ['key'=>'semoul_fin_2', 'label'=>'سميد ناعم 2كغ',       'unit'=>'كيس 2كغ',   'cat'=>'semoul', 'max_price'=>84.00,   'ref'=>'م.ت 07-402'],
            ['key'=>'semoul_ord_2', 'label'=>'سميد عادي 2كغ',       'unit'=>'كيس 2كغ',   'cat'=>'semoul', 'max_price'=>76.00,   'ref'=>'م.ت 07-402'],
            ['key'=>'semoul_10',    'label'=>'سميد 10كغ',           'unit'=>'كيس 10كغ',  'cat'=>'semoul', 'max_price'=>410.00,  'ref'=>'م.ت 07-402'],
            ['key'=>'farine_1',     'label'=>'فرينة 1كغ',           'unit'=>'كغ',         'cat'=>'farine', 'max_price'=>27.50,   'ref'=>'م.ت 96-132 معدَّل'],
            ['key'=>'farine_2',     'label'=>'فرينة 2كغ',           'unit'=>'كيس 2كغ',   'cat'=>'farine', 'max_price'=>51.50,   'ref'=>'م.ت 96-132'],
            ['key'=>'farine_5',     'label'=>'فرينة 5كغ',           'unit'=>'كيس 5كغ',   'cat'=>'farine', 'max_price'=>133.50,  'ref'=>'م.ت 96-132'],
            ['key'=>'farine_10',    'label'=>'فرينة 10كغ',          'unit'=>'كيس 10كغ',  'cat'=>'farine', 'max_price'=>247.00,  'ref'=>'م.ت 96-132'],
            ['key'=>'lait_sac_1',   'label'=>'حليب أكياس 1ل',       'unit'=>'كيس 1ل',    'cat'=>'lait',   'max_price'=>25.00,   'ref'=>'م.ت 01-50 معدَّل بـ 16-65'],
            ['key'=>'pain_baguette','label'=>'خبز بڤات',            'unit'=>'وحدة',       'cat'=>'pain',   'max_price'=>7.50,    'ref'=>'سعر مقنَّن وزارة التجارة'],
            ['key'=>'cafe_1kg',     'label'=>'قهوة 1كغ',            'unit'=>'كغ',         'cat'=>'cafe',   'max_price'=>1000.00, 'ref'=>'تسقيف وزارة التجارة 2024'],
            ['key'=>'sucre_1kg',    'label'=>'سكر أبيض 1كغ',        'unit'=>'كغ',         'cat'=>'sucre',  'max_price'=>95.00,   'ref'=>'م.ت 20-241'],
        ];
    }
}
