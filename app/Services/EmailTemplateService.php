<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\EmailTemplate;

/**
 * EmailTemplateService — حلّ الرموز وتعليب قوالب البريد الإلكتروني.
 *
 * ══════════════════════════════════════════════════════════════════
 * ترتيب حلّ القالب (من الأخصّ إلى الأعمّ):
 *   1) قالب مطابق تماماً لـ doc_type_code للمستند (نشط) — افتراضي ثم الأحدث.
 *   2) قالب عام (doc_type_code = null) — ينطبق على كل أنواع المستندات.
 *   3) null = لا يوجد قالب.
 * ══════════════════════════════════════════════════════════════════
 *
 * الرموز المدعومة في subject/body — انظر `placeholderLabels()`:
 *   {{company_name}} {{company_address}} {{company_phone}} {{company_email}} {{company_nif}}
 *   {{doc_number}} {{doc_date}} {{doc_reference}} {{doc_type}}
 *   {{doc_total_ht}} {{doc_total_tva}} {{doc_total_discount}} {{doc_total_stamp}}
 *   {{doc_total_ttc}} {{doc_net_to_pay}} {{doc_paid_amount}} {{doc_remaining_amount}}
 *   {{party_name}} {{party_code}} {{party_nif}} {{party_commercial_name}}
 *   {{cashier_name}}
 */
class EmailTemplateService
{
    /**
     * الرموز المدعومة — المفتاح هو اسم الرمز المستعمل في النص، والقيمة تسمية عربية.
     * تُعرض للمستخدم في واجهة تحرير القالب.
     *
     * @return array<string, string>
     */
    public static function placeholderLabels(): array
    {
        return [
            'company_name'        => 'اسم الشركة',
            'company_address'     => 'عنوان الشركة',
            'company_phone'       => 'هاتف الشركة',
            'company_email'       => 'بريد الشركة',
            'company_nif'         => 'رقم التعريف الجبائي (NIF)',
            'doc_number'          => 'رقم المستند',
            'doc_date'            => 'تاريخ المستند',
            'doc_reference'       => 'مرجع المستند',
            'doc_type'            => 'نوع المستند',
            'doc_total_ht'        => 'المجموع خارج الضريبة (HT)',
            'doc_total_tva'       => 'قيمة الضريبة (TVA)',
            'doc_total_discount'  => 'قيمة الخصم',
            'doc_total_stamp'     => 'الطابع الجبائي',
            'doc_total_ttc'       => 'المجموع شامل الضريبة (TTC)',
            'doc_net_to_pay'      => 'صافي المستحق',
            'doc_paid_amount'     => 'المبلغ المدفوع',
            'doc_remaining_amount'=> 'المبلغ المتبقي',
            'party_name'          => 'اسم الزبون / المورد',
            'party_code'          => 'رمز الزبون / المورد',
            'party_nif'           => 'NIF الزبون / المورد',
            'party_commercial_name' => 'الاسم التجاري للزبون / المورد',
            'cashier_name'        => 'اسم الكاشير / منشئ المستند',
        ];
    }

    /**
     * حلّ أفضل قالب بريد إلكتروني لشركة (ونوع مستند اختياري).
     *
     * @param  string|null $docTypeCode كود نوع المستند (FV، POS، CMD…) أو null للقالب العام.
     */
    public static function resolveTemplate(int $companyId, ?string $docTypeCode = null): ?EmailTemplate
    {
        if ($docTypeCode !== null && $docTypeCode !== '') {
            $exact = EmailTemplate::where('company_id', $companyId)
                ->where('doc_type_code', $docTypeCode)
                ->where('is_active', true)
                ->orderByDesc('is_default')
                ->orderByDesc('id')
                ->first();
            if ($exact) {
                return $exact;
            }
        }

        return EmailTemplate::where('company_id', $companyId)
            ->whereNull('doc_type_code')
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * تعويض رموز {{key}} و{key} في نص بالقيم المعطاة.
     * استبدال نصي آمن (لا regex) — يدعم النصوص العربية دون مشاكل التشفير.
     *
     * @param  array<string, mixed> $data
     */
    public static function fill(string $text, array $data): string
    {
        if ($text === '' || $text === null) {
            return '';
        }

        $search  = [];
        $replace = [];
        foreach ($data as $key => $value) {
            $stringValue = $value === null ? '' : (string) $value;
            $search[]    = '{{' . $key . '}}';
            $replace[]   = $stringValue;
            $search[]    = '{' . $key . '}';
            $replace[]   = $stringValue;
        }

        return str_replace($search, $replace, $text);
    }

    /**
     * بيانات الرموز لمستند معيّن — تُبنى مرة واحدة لكل عملية إرسال.
     *
     * @return array<string, mixed>
     */
    public static function dataForDocument(CommercialDocument $document): array
    {
        $document->loadMissing(['documentType', 'party', 'user']);

        $company = $document->company;
        $party   = $document->party;
        $user    = $document->user;

        return [
            // الشركة
            'company_name'    => $company?->name,
            'company_address' => $company?->address,
            'company_phone'   => $company?->phone,
            'company_email'   => $company?->email,
            'company_nif'     => $company?->nif,
            // المستند
            'doc_number'          => $document->document_number,
            'doc_date'            => $document->document_date
                ? \Carbon\Carbon::parse($document->document_date)->format('d/m/Y')
                : '',
            'doc_reference'       => $document->reference,
            'doc_type'            => $document->documentType?->name,
            'doc_total_ht'        => self::money($document->total_ht),
            'doc_total_tva'       => self::money($document->total_tva),
            'doc_total_discount'  => self::money($document->total_discount),
            'doc_total_stamp'     => self::money($document->total_stamp),
            'doc_total_ttc'       => self::money($document->total_ttc),
            'doc_net_to_pay'      => self::money($document->net_to_pay),
            'doc_paid_amount'     => self::money($document->paid_amount),
            'doc_remaining_amount'=> self::money($document->remaining_amount),
            // الطرف
            'party_name'          => $party?->name,
            'party_code'          => $party?->code,
            'party_nif'           => $party?->nif,
            'party_commercial_name' => $party?->commercial_name,
            // الكاشير / منشئ المستند
            'cashier_name'        => $user?->name,
        ];
    }

    /**
     * تجهيز موضوع + جسم بريد إلكتروني جاهزين للإرسال لمستند معيّن،
     * أو null عندما لا يوجد قالب مطابق. القالب نفسه يُعاد أيضاً ليقرر
     * المُستدعي إن أراد إرفاق الـ PDF.
     *
     * @return array{subject: string, body: string, template: EmailTemplate}|null
     */
    public static function renderEmail(CommercialDocument $document, ?string $docTypeCode = null): ?array
    {
        $document->loadMissing('documentType');
        $template = self::resolveTemplate(
            $document->company_id,
            $docTypeCode ?? $document->documentType?->code
        );

        if (!$template) {
            return null;
        }

        $data = self::dataForDocument($document);

        return [
            'subject'  => self::fill((string) $template->subject, $data),
            'body'     => self::fill((string) $template->body, $data),
            'template' => $template,
        ];
    }

    /**
     * تنسيق مبلغ مالي بفاصلَين فرنسيين/عربيين (12345.67 أو 0.00).
     */
    private static function money(mixed $value): string
    {
        return number_format((float) $value, 2, '.', ' ');
    }
}