<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\EmailTemplate;
use App\Models\Party;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class DocumentMailService
{
    public function __construct(
        private CompanyContextService $companyContext,
        private MailConfigService $mailConfig,
    ) {}

    public function sendToParty(CommercialDocument $document, ?string $customMessage = null, array $options = []): bool
    {
        $party = $document->party;
        if (!$party || !$party->email) {
            Log::warning("Cannot send document {$document->id}: party has no email");
            return false;
        }

        $this->mailConfig->apply($document->company_id);

        $template = $this->resolveTemplate($document, $options);
        $data     = EmailTemplateService::dataForDocument($document);

        // تسلسل الموضوع: موضوع صريح ← قالب ← عنوان افتراضي.
        $subject = $this->resolveText($options['subject'] ?? null, $data)
            ?: ($template ? EmailTemplateService::fill((string) $template->subject, $data) : '')
            ?: "مستند {$document->document_number}";

        // تسلسل النص: جسم صريح ← قالب ← رسالة مخصصة ← رسالة افتراضية.
        $body = $this->resolveText($options['body'] ?? null, $data)
            ?: ($template ? EmailTemplateService::fill((string) $template->body, $data) : '')
            ?: ($customMessage ?: $this->defaultMessage($document));

        $attachPdf  = $options['attach_pdf'] ?? true;
        $pdfContent = $attachPdf ? $this->generatePdf($document) : null;

        try {
            Mail::send([], [], function ($mail) use ($party, $document, $pdfContent, $subject, $body) {
                $mail->to($party->email, $party->name)
                    ->subject($subject)
                    ->setBody($body, 'text/plain');

                if ($pdfContent) {
                    $mail->attachData($pdfContent, "{$document->document_number}.pdf", [
                        'mime' => 'application/pdf',
                    ]);
                }
            });

            $this->logSend($document);

            Log::info("Document {$document->document_number} sent to {$party->email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send document {$document->id} email: {$e->getMessage()}");
            return false;
        }
    }

    private function resolveTemplate(CommercialDocument $document, array $options): ?EmailTemplate
    {
        if (!empty($options['template_id'])) {
            return EmailTemplate::where('company_id', $document->company_id)
                ->where('id', (int) $options['template_id'])
                ->where('is_active', true)
                ->first();
        }

        return EmailTemplateService::resolveTemplate($document->company_id, $document->documentType?->code);
    }

    private function resolveText(mixed $value, array $data): string
    {
        if ($value === null || (is_string($value) && trim($value) === '')) {
            return '';
        }

        return EmailTemplateService::fill((string) $value, $data);
    }

    private function generatePdf(CommercialDocument $document): ?string
    {
        try {
            $service = app(DocumentPrintService::class);
            return $service->generatePdf($document);
        } catch (\Exception $e) {
            Log::warning("PDF generation failed for document {$document->id}: {$e->getMessage()}");
            return null;
        }
    }

    private function defaultMessage(CommercialDocument $document): string
    {
        $party = $document->party;
        $lines = [];
        foreach ($document->lines as $line) {
            $lines[] = "- {$line->product?->name}: {$line->quantity} × {$line->unit_price_ht} دج";
        }

        return "مرحباً {$party?->name}\n\n"
             . "نرفق لكم المستند رقم {$document->document_number}\n"
             . "التاريخ: {$document->document_date}\n"
             . "المبلغ الإجمالي: {$document->net_to_pay} دج\n"
             . "تاريخ الاستحقاق: {$document->due_date}\n\n"
             . "مع الشكر،\n"
             . "فريق المبيعات";
    }

    private function logSend(CommercialDocument $document): void
    {
        $existing = $document->internal_notes ?? '';
        $note = "\n[إرسال] " . now()->format('Y-m-d H:i') . " — أُرسل للزبون {$document->party?->email}";
        $document->update(['internal_notes' => $existing . $note]);
    }
}
