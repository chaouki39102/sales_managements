<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class MailConfigService
{
    /** مفاتيح إعدادات البريد (تُقسم للشركة الخاصة بأصحاب كل مؤسسة، مع رجوع إلى النظام). */
    public const KEYS = [
        'mail_mailer',
        'mail_host',
        'mail_port',
        'mail_username',
        'mail_password',
        'mail_encryption',
        'mail_from_address',
        'mail_from_name',
    ];

    /**
     * تعيين إعدادات البريد لمضيف سريع: إعدادات الشركة ← إعدادات النظام (company_id null) ← .env.
     * أي قيمة فارغة (null أو '') تُعتبر "غير مضبوطة" فتنزل إلى المستوى التالي.
     *
     * @param  int|null  $companyId  إن لم يعط، تُطبَّق إعدادات النظام فقط.
     */
    public function apply(?int $companyId = null): void
    {
        $companySettings = $companyId
            ? Setting::where('company_id', $companyId)->whereIn('key', self::KEYS)->get()->keyBy('key')
            : collect();

        $systemSettings = Setting::whereNull('company_id')
            ->whereIn('key', self::KEYS)
            ->get()
            ->keyBy('key');

        $mailer = $this->firstValue($companySettings, $systemSettings, 'mail_mailer', config('mail.default'));

        Config::set('mail.default', $mailer);

        if ($mailer === 'smtp') {
            Config::set('mail.mailers.smtp.host',       $this->firstValue($companySettings, $systemSettings, 'mail_host',       config('mail.mailers.smtp.host')));
            Config::set('mail.mailers.smtp.port',       $this->firstValue($companySettings, $systemSettings, 'mail_port',       config('mail.mailers.smtp.port')));
            Config::set('mail.mailers.smtp.username',   $this->firstValue($companySettings, $systemSettings, 'mail_username',   config('mail.mailers.smtp.username')));
            Config::set('mail.mailers.smtp.password',   $this->firstValue($companySettings, $systemSettings, 'mail_password',   config('mail.mailers.smtp.password')));
            Config::set('mail.mailers.smtp.encryption', $this->firstValue($companySettings, $systemSettings, 'mail_encryption', config('mail.mailers.smtp.encryption')));
        }

        Config::set('mail.from.address', $this->firstValue($companySettings, $systemSettings, 'mail_from_address', config('mail.from.address')));
        Config::set('mail.from.name',     $this->firstValue($companySettings, $systemSettings, 'mail_from_name',     config('mail.from.name')));

        Log::info('Mail configuration applied', [
            'company_id'         => $companyId,
            'mailer'             => $mailer,
            'company_configured' => $this->hasNonEmpty($companySettings, 'mail_mailer'),
            'system_configured'  => $this->hasNonEmpty($systemSettings, 'mail_mailer'),
        ]);
    }

    /**
     * أول قيمة مضبوطة (غير فارغة) بين مستوى الشركة ومستوى النظام، وإلا الرجوع للمفتاح من config.
     */
    private function firstValue($companySettings, $systemSettings, string $key, mixed $fallback): mixed
    {
        foreach ([$companySettings, $systemSettings] as $scope) {
            if (!isset($scope[$key])) {
                continue;
            }
            $value = $scope[$key]->getTypedValue();
            if ($value !== null && $value !== '') {
                return $value;
            }
        }
        return $fallback;
    }

    private function hasNonEmpty($settings, string $key): bool
    {
        if (!isset($settings[$key])) {
            return false;
        }
        $value = $settings[$key]->getTypedValue();
        return $value !== null && $value !== '';
    }
}