<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CashClientSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = config('seeding.company_id')
            ?? DB::table('companies')->value('id');

        if (!$companyId) {
            throw new \RuntimeException('CashClientSeeder: لا يوجد company_id — تأكد من تعيين config("seeding.company_id")');
        }

        // تجنب التكرار
        if (DB::table('parties')->where('company_id', $companyId)->where('slug', 'client-cash')->exists()) {
            $this->command?->info("ℹ️ زبون الصندوق موجود مسبقاً للشركة #{$companyId}.");
            return;
        }

        $clientTypeId = DB::table('party_types')
            ->where('company_id', $companyId)
            ->where('name', 'client')
            ->value('id');

        if (!$clientTypeId) {
            $this->command?->error("❌ فشل إنشاء زبون الصندوق: لم يتم العثور على نوع الطرف 'client' للشركة #{$companyId}.");
            return;
        }

        DB::table('parties')->insert([
            'company_id'          => $companyId,
            'party_type_id'       => $clientTypeId,
            'code'                => 'CC000',
            'name'                => 'Client Cash',
            'commercial_name'     => null,
            'slug'                => 'client-cash',
            'nif'                 => null,
            'rc'                  => null,
            'nis'                 => null,
            'ai'                  => null,
            'address'             => null,
            'phone'               => null,
            'mobile'              => null,
            'email'               => null,
            'credit_limit'        => 0.00,
            'is_tva_exempt'       => true,
            'is_taxable'          => false,
            'is_final_consumer'   => true,
            'is_vat_registered'   => false,
            'active'              => true,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        $this->command?->info("✅ تم إنشاء زبون الصندوق (Client Cash) بنجاح للشركة #{$companyId}.");
    }
}