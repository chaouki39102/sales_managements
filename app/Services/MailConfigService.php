<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class MailConfigService
{
    public function apply(): void
    {
        $settings = Setting::whereNull('company_id')
            ->whereIn('key', [
                'mail_mailer', 'mail_host', 'mail_port', 'mail_username',
                'mail_password', 'mail_encryption', 'mail_from_address', 'mail_from_name',
            ])
            ->get()
            ->keyBy('key');

        if ($settings->isEmpty()) return;

        $mailer = $settings->get('mail_mailer')?->getTypedValue() ?? config('mail.default');

        Config::set('mail.default', $mailer);

        if ($mailer === 'smtp') {
            Config::set('mail.mailers.smtp.host',       $settings->get('mail_host')?->getTypedValue() ?? config('mail.mailers.smtp.host'));
            Config::set('mail.mailers.smtp.port',       $settings->get('mail_port')?->getTypedValue() ?? config('mail.mailers.smtp.port'));
            Config::set('mail.mailers.smtp.username',   $settings->get('mail_username')?->getTypedValue() ?? config('mail.mailers.smtp.username'));
            Config::set('mail.mailers.smtp.password',   $settings->get('mail_password')?->getTypedValue() ?? config('mail.mailers.smtp.password'));
            Config::set('mail.mailers.smtp.encryption', $settings->get('mail_encryption')?->getTypedValue() ?? config('mail.mailers.smtp.encryption'));
        }

        if ($fromAddr = $settings->get('mail_from_address')?->getTypedValue()) {
            Config::set('mail.from.address', $fromAddr);
        }
        if ($fromName = $settings->get('mail_from_name')?->getTypedValue()) {
            Config::set('mail.from.name', $fromName);
        }

        Log::info('Mail configuration applied from system settings.');
    }
}
