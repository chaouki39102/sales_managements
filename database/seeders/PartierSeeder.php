<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * PartierSeeder — بيانات تجريبية للأطراف (زبائن وموردون)
 *
 * هذا الـ Seeder اختياري ويُستخدم في بيئة التطوير فقط.
 * لا يُستدعى من DatabaseSeeder تلقائياً — يمكن تشغيله بشكل منفصل:
 *
 *   php artisan db:seed --class=PartierSeeder
 *
 * متطلبات قبل التشغيل:
 *   - CompanySeeder     (company_id)
 *   - WilayaCommuneSeeder (wilaya_id, commune_id)
 *   - PriceLevelSeeder  (default_price_level_id)
 *   - LegalFormSeeder   (legal_form_id)
 */
class PartierSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id') ?? DB::table('companies')->first()->id;
        

        if (! $companyId) {
            $this->command->warn('PartierSeeder: لا توجد شركة — نفّذ CompanySeeder أولاً.');
            return;
        }

        $wilayaId   = DB::table('wilayas')->where('code', 39)->value('id');   // الوادي
        $communeId  = DB::table('communes')->where('wilaya_id', $wilayaId)->value('id');
        $clientType = DB::table('party_types')->where('name', 'client')->value('id');
        $supplierType = DB::table('party_types')->where('name', 'supplier')->value('id');
        $bothType   = DB::table('party_types')->where('name', 'both')->value('id');
        $priceLevelId = DB::table('price_levels')->where('is_default', true)->value('id');
        $legalFormId  = DB::table('legal_forms')->where('code', 'EURL')->value('id');

        $now = now();

        $parties = [
            // ── زبائن ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $clientType,
                'code'                 => 'CLI001',
                'name'                 => 'مؤسسة النجاح للتجارة',
                'commercial_name'      => 'النجاح',
                'slug'                 => 'cli001-najah',
                'nif'                  => '001234567890123',
                'nis'                  => '123456789',
                'rc'                   => '39/00-0123456B/00',
                'ai'                   => '39012345678',
                'legal_form_id'        => $legalFormId,
                'address'              => 'حي التوفيق، شارع الاستقلال',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => $communeId,
                'phone'                => '029300100',
                'mobile'               => '0550100200',
                'email'                => 'najah@example.dz',
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 500000.00,
                'credit_days'          => 30,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],
            [
                'company_id'           => $companyId,
                'party_type_id'        => $clientType,
                'code'                 => 'CLI002',
                'name'                 => 'شركة الفجر للمواد الغذائية',
                'commercial_name'      => 'الفجر',
                'slug'                 => 'cli002-fajr',
                'nif'                  => '001234567890124',
                'nis'                  => null,
                'rc'                   => null,
                'ai'                   => null,
                'legal_form_id'        => null,
                'address'              => null,
                'wilaya_id'            => $wilayaId,
                'commune_id'           => null,
                'phone'                => '029300200',
                'mobile'               => '0661200300',
                'email'                => null,
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 0.00,
                'credit_days'          => null,
                'is_tva_exempt'        => true,
                'is_taxable'           => false,
                'is_final_consumer'    => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // ── مورد ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $supplierType,
                'code'                 => 'FRN001',
                'name'                 => 'مؤسسة اية فود',
                'commercial_name'      => 'اية فود',
                'slug'                 => 'frn001-amal',
                'nif'                  => '001234567890125',
                'nis'                  => '987654321',
                'rc'                   => '39/00-0654321B/00',
                'ai'                   => '39098765432',
                'legal_form_id'        => $legalFormId,
                'address'              => 'منطقة النشاط الصناعي',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => $communeId,
                'phone'                => '029300300',
                'mobile'               => '0770300400',
                'email'                => 'amal-supply@example.dz',
                'default_price_level_id' => null,
                'credit_limit'         => 0.00,
                'credit_days'          => 45,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // ── زبون + مورد ──
            [
                'company_id'           => $companyId,
                'party_type_id'        => $bothType,
                'code'                 => 'BOTH001',
                'name'                 => 'مؤسسة هبات التجارية',
                'commercial_name'      => 'هبات للتموين',
                'slug'                 => 'both001-wasit',
                'nif'                  => '001234567890126',
                'nis'                  => null,
                'rc'                   => null,
                'ai'                   => null,
                'legal_form_id'        => null,
                'address'              => 'السوق المركزي',
                'wilaya_id'            => $wilayaId,
                'commune_id'           => null,
                'phone'                => '029300400',
                'mobile'               => '0551400500',
                'email'                => null,
                'default_price_level_id' => $priceLevelId,
                'credit_limit'         => 200000.00,
                'credit_days'          => 15,
                'is_tva_exempt'        => false,
                'is_taxable'           => true,
                'active'               => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ],
        ];

        // إضافة القيم الافتراضية للحقول غير الموجودة في كل سجل
        $defaults = [
            'commercial_name'      => null,
            'activity'             => null,
            'rc'                   => null,
            'nif'                  => null,
            'nis'                  => null,
            'ai'                   => null,
            'legal_form_id'        => null,
            'capital_amount'       => null,
            'rc_date'              => null,
            'address'              => null,
            'commune_id'           => null,
            'wilaya_id'            => null,
            'phone'                => null,
            'mobile'               => null,
            'fax'                  => null,
            'email'                => null,
            'avatar'               => null,
            'bank_name'            => null,
            'rib'                  => null,
            'initial_balance'      => 0.00,
            'credit_limit'         => 0.00,
            'default_price_level_id' => null,
            'credit_days'          => null,
            'is_tva_exempt'        => false,
            'is_taxable'           => true,
            'tax_option'           => null,
            'cnas_number'          => null,
            'tax_regime'           => null,
            'is_final_consumer'    => false,
            'is_vat_registered'    => false,
            'vat_registration_date'=> null,
            'additional_data'      => null,
            'active'               => true,
        ];

        foreach ($parties as &$party) {
            $party = array_merge($defaults, $party);
        }

        DB::table('parties')->insert($parties);

        $this->command->info('PartierSeeder: تم إضافة ' . count($parties) . ' طرف (زبائن/موردون) بنجاح.');
    }
}