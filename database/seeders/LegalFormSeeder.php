<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegalFormSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('legal_forms')->upsert([
            ['code' => 'PERSONNE',  'name' => 'Personne Physique - شخص طبيعي', 'description' => 'الشكل القانوني الأكثر شيوعاً في الجزائر', 'requires_capital' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SARL',      'name' => 'Société à Responsabilité Limitée - شركة ذات مسؤولية محدودة', 'description' => 'الشكل القانوني للشركات الأكثر شيوعاً في الجزائر', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EURL',      'name' => 'Entreprise Unipersonnelle à Responsabilité Limitée - مؤسسة فردية ذات مسؤولية محدودة', 'description' => 'شركة فردية بشريك واحد', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SPA',       'name' => 'Société Par Actions - شركة المساهمة', 'description' => 'شركة مساهمة كبيرة', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SNC',       'name' => 'Société en Nom Collectif - شركة التضامن', 'description' => 'جميع الشركاء متضامنون', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'SCS',       'name' => 'Société en Commandite Simple - شركة التوصية البسيطة', 'description' => 'شركاء متضامنون وموصون', 'requires_capital' => true, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EI',        'name' => 'Entreprise Individuelle - مؤسسة فردية', 'description' => 'مؤسسة فردية بدون شخصية معنوية', 'requires_capital' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
        ], ['code']);
    }
}
