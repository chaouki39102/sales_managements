<?php

use Database\Seeders\PrintTemplateSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Repairs print-template data created by older code:
 *
 *  1. Every seeded default template printed the title «فاتورة بيع» whatever
 *     the document (delivery note, quote, purchase invoice, credit note…).
 *     Titles that still carry that wrong default are set to the document's
 *     real title; titles a user changed are left alone.
 *  2. The library «أمر الشراء الجزائري A4» was installed under AV (sales credit
 *     note) instead of BCF (supplier order).
 *  3. BCF and CMD had no default template at all («لا يوجد قالب لهذا المستند»).
 */
return new class extends Migration
{
    public function up(): void
    {
        $titles = PrintTemplateSeeder::DOC_TITLES;

        // 1) Wrong default titles.
        $rows = DB::table('print_templates')
            ->whereNotIn('doc_type_code', ['FV', 'POS'])
            ->get(['id', 'doc_type_code', 'name', 'config']);

        foreach ($rows as $row) {
            $config = json_decode((string) $row->config, true);
            if (!is_array($config) || ($config['title_text'] ?? null) !== 'فاتورة بيع') {
                continue;
            }
            $title = $titles[$row->doc_type_code] ?? null;
            if (!$title) {
                continue;
            }
            $config['title_text'] = $title;
            $update = ['config' => json_encode($config, JSON_UNESCAPED_UNICODE), 'updated_at' => now()];
            if ($row->name === 'قالب فاتورة افتراضي') {
                $update['name'] = 'قالب ' . $title . ' افتراضي';
            }
            DB::table('print_templates')->where('id', $row->id)->update($update);
        }

        // 2) Missing default templates (seedForCompany only adds absent doc types).
        //    Runs before 3) so BCF gets its own default before the library
        //    purchase order is moved there.
        foreach (DB::table('companies')->pluck('id') as $companyId) {
            PrintTemplateSeeder::seedForCompany((int) $companyId);
        }

        // 3) Purchase order filed under AV.
        DB::table('print_templates')
            ->where('doc_type_code', 'AV')
            ->where('name', 'أمر الشراء الجزائري A4')
            ->update(['doc_type_code' => 'BCF', 'is_default' => false, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Data repair — nothing to undo.
    }
};
