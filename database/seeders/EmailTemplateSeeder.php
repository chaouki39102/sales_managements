<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    /**
     * Default subject. The body supports the same placeholders the API
     * fills at send time: {document_number}, {party_name}, {company_name},
     * {total_ttc}, {net_to_pay}, {document_date}, {due_date}, {reference}.
     */
    public const DEFAULT_SUBJECT = 'مستند {document_number}';

    public const DEFAULT_BODY = "مرحباً {party_name}،\n\n"
        . "نرفق لكم المستند رقم {document_number}\n"
        . "التاريخ: {document_date}\n"
        . "المبلغ الإجمالي: {net_to_pay} دج\n"
        . "تاريخ الاستحقاق: {due_date}\n\n"
        . "مع الشكر،\n"
        . "{company_name}";

    public function run(): void
    {
        $companies = Company::all();

        if ($companies->isEmpty()) {
            $this->command?->warn('No companies found. Skipping EmailTemplateSeeder.');
            return;
        }

        foreach ($companies as $company) {
            self::seedForCompany($company->id, $this->command);
        }

        $this->command?->info('EmailTemplateSeeder completed successfully.');
    }

    /**
     * Seed a single generic (= all document types) default email template
     * for a company. Called by CompanySeeder via CompanyObserver when a new
     * company is created.
     */
    public static function seedForCompany(int $companyId, mixed $output = null): void
    {
        $exists = EmailTemplate::where('company_id', $companyId)
            ->whereNull('doc_type_code')
            ->exists();

        if ($exists) {
            return;
        }

        EmailTemplate::insert([
            'company_id'    => $companyId,
            'name'          => 'قالب مراسلة افتراضي',
            'doc_type_code' => null,
            'subject'       => self::DEFAULT_SUBJECT,
            'body'          => self::DEFAULT_BODY,
            'is_default'    => true,
            'is_active'     => true,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $output?->info("Created default email template for company #{$companyId}");
    }
}