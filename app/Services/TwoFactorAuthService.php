<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * TwoFactorAuthService
 * ══════════════════════════════════════════════════════════════════
 * إدارة المصادقة الثنائية (TOTP — RFC 6238) لكل مستخدم.
 *
 * النقاط الرئيسية:
 *  - secret مُخزَّن مشفراً (encrypted cast) في users.two_factor_secret.
 *  - رموز الاسترجاع (backup codes) تُخزَّن مجزَّأة (bcrypt) في
 *    users.two_factor_recovery_codes (json مشفر) وتُستهلك مرة واحدة.
 *  - التحقق يكون دائماً من قاعدة RFC 6238 (HMAC-SHA1 / 30s / 6 أرقام)
 *    عبر مكتبة pragmarx/google2fa.
 *  - الإصدار/الإيقاف يتطلبان التحقق من رمز سليم قبل أي تغيير.
 * ══════════════════════════════════════════════════════════════════
 */
class TwoFactorAuthService
{
    public const CHALLENGE_PREFIX = '2fa_challenge:';
    public const CHALLENGE_TTL_SECONDS = 300; // 5 دقائق

    public function __construct(protected Google2FA $google2fa)
    {
    }

    /**
     * توليد secret جديد بصيغة Base32 متوافق مع Google Authenticator.
     */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey();
    }

    /**
     * بناء رابط otpauth:// الرسمي (يُستخدم داخل QR).
     */
    public function provisioningUri(User $user, string $secret): string
    {
        $issuer   = config('app.name', 'POSDZ');
        $account  = $user->email ?: $user->name;

        return $this->google2fa->getQRCodeUrl($issuer, $account, $secret);
    }

    /**
     * توليد QR على شكل SVG (data-URI base64) جاهز للعرض في المتصفح.
     */
    public function qrSvg(User $user, string $secret): string
    {
        $uri  = $this->provisioningUri($user, $secret);
        $svg  = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(220)
            ->margin(2)
            ->errorCorrection('M')
            ->generate($uri);

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    /**
     * التحقق من رمز TOTP (نافذة ±1 = 3 خطوات زمنية).
     */
    public function verifyTotp(User $user, string $code): bool
    {
        $secret = $user->two_factor_secret;
        if (! $secret) {
            return false;
        }

        return $this->google2fa->verifyKey($secret, $code, 1);
    }

    /**
     * التحقق من كود استرجاع: إن وُجد يتم حذفه فوراً (استخدام واحد).
     */
    public function verifyAndConsumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];

        if (! is_array($codes) || count($codes) === 0) {
            return false;
        }

        foreach ($codes as $index => $hash) {
            if (Hash::check($code, $hash)) {
                unset($codes[$index]);
                $user->forceFill([
                    'two_factor_recovery_codes' => array_values($codes),
                ])->save();
                return true;
            }
        }

        return false;
    }

    /**
     * التحقق الشامل: رمز TOTP أو كود استرجاع.
     */
    public function verify(User $user, string $code): bool
    {
        return $this->verifyTotp($user, $code)
            || $this->verifyAndConsumeRecoveryCode($user, $code);
    }

    /**
     * تفعيل 2FA بعد التحقق من الرمز الحالي.
     */
    public function enable(User $user, string $code): void
    {
        if (! $user->two_factor_secret) {
            throw new BusinessRuleException('ابدأ أولاً بمسح رمز الاستجابة السريعة لتوليد المفتاح السري', 422);
        }

        if (! $this->verifyTotp($user, $code)) {
            throw new BusinessRuleException('رمز التحقق غير صحيح. تحقق من الرقم المكوّن من 6 أرقام في تطبيق المصادقة', 422);
        }

        $user->forceFill([
            'two_factor_enabled'      => true,
            'two_factor_enabled_at'   => now(),
        ])->save();
    }

    /**
     * إيقاف 2FA بعد التحقق من الرمز الحالي (TOTP أو استرجاع).
     */
    public function disable(User $user, string $code): void
    {
        if (! $user->two_factor_enabled) {
            throw new BusinessRuleException('المصادقة الثنائية غير مفعلة', 422);
        }

        if (! $this->verify($user, $code)) {
            throw new BusinessRuleException('رمز التحقق غير صحيح. استخدم رمز تطبيق المصادقة أو أحد رموز الاسترجاع', 422);
        }

        $user->forceFill([
            'two_factor_secret'          => null,
            'two_factor_enabled'         => false,
            'two_factor_enabled_at'      => null,
            'two_factor_recovery_codes'  => null,
        ])->save();
    }

    /**
     * توليد مجموعة رموز استرجاع (10 رموز)، تخزينها مجزَّأة، وإرجاعها
     * نصاً صريحاً مرة واحدة فقط.
     *
     * @return string[] الرموز النصية (تظهر للمستخدم مرة واحدة)
     */
    public function generateRecoveryCodes(User $user): array
    {
        $plain = [];
        $hashed = [];

        for ($i = 0; $i < 10; $i++) {
            $code = strtoupper(Str::random(4) . '-' . Str::random(4) . '-' . Str::random(4));
            $plain[]  = $code;
            $hashed[] = Hash::make($code);
        }

        $user->forceFill([
            'two_factor_recovery_codes' => $hashed,
        ])->save();

        return $plain;
    }

    /**
     * إنشاء تحدي دخول مؤقت: يُخزَّن في الكاش (وليس في قاعدة البيانات)
     * ويربط رمزاً عشوائياً بمعرّف المستخدم، صالح 5 دقائق.
     */
    public function issueChallenge(User $user): string
    {
        $token = Str::random(64);

        cache()->put(
            self::CHALLENGE_PREFIX . $token,
            $user->id,
            self::CHALLENGE_TTL_SECONDS
        );

        return $token;
    }

    /**
     * استرجاع المستخدم من رمز التحدي (قراءة فقط — لا يُستهلك الرمز هنا،
     * يُستهلك فقط بعد نجاح التحقق عبر consumeChallenge()).
     */
    public function resolveChallenge(string $challengeToken): ?User
    {
        $userId = cache()->get(self::CHALLENGE_PREFIX . $challengeToken);

        if (! $userId) {
            return null;
        }

        return User::find($userId);
    }

    /**
     * إبطال رمز التحدي (يُستدعى فقط بعد نجاح التحقق) — يمنع إعادة استخدامه.
     */
    public function consumeChallenge(string $challengeToken): void
    {
        cache()->forget(self::CHALLENGE_PREFIX . $challengeToken);
    }

    /**
     * تأكيد خطوة الدخول الثانية: التحقق من الرمز ثم حذف التحدي.
     */
    public function confirmLogin(User $user, string $code): void
    {
        if (! $user->two_factor_enabled) {
            throw new BusinessRuleException('المصادقة الثنائية غير مفعلة لهذا الحساب', 422);
        }

        if (! $this->verify($user, $code)) {
            throw new BusinessRuleException('رمز التحقق غير صحيح. تحقق من الرمز في تطبيق المصادقة أو استخدم أحد رموز الاسترجاع', 422);
        }
    }
}
