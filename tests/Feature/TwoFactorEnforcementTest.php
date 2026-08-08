<?php

use App\Models\User;
use App\Services\TwoFactorAuthService;
use Illuminate\Support\Facades\DB;
use PragmaRX\Google2FA\Google2FA;

/**
 * TwoFactorEnforcementTest
 * ══════════════════════════════════════════════════════════════════
 * التحقق من إلزامية 2FA (متوسط EnsureTwoFactorVerified + دورة الحياة):
 *  1. دخول بدون 2FA → توكن فوري صالح.
 *  2. تفعيل 2FA → كل التوكنات السابقة تُرفض فوراً (401) وتُحذف.
 *  3. إعادة الدخول → تحدي → تأكيد برمز TOTP → توكن جديد يعمل.
 *  4. رموز الاسترجاع: مرة واحدة، والرمز الخاطئ لا يُبطل التحدي.
 * ══════════════════════════════════════════════════════════════════
 */

beforeEach(function () {
    $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

    $this->user = User::query()->create([
        'name'        => '2FA User',
        'email'       => 'twofactor@example.test',
        'password'    => 'secret123',
        'is_approved' => true,
        'active'      => true,
    ]);
});

function currentTotp(string $secret): string
{
    return app(Google2FA::class)->getCurrentOtp($secret);
}

function twoFactorChallengeFor(\Tests\TestCase $test, string $email, string $password): string
{
    $res = $test->postJson('/api/v1/auth/login', [
        'email'    => $email,
        'password' => $password,
    ]);

    $res->assertOk();
    $res->assertJsonPath('data.two_factor_required', true);
    expect($res->json('data.token'))->toBeNull();

    return $res->json('data.challenge_token');
}

it('logs in without 2FA and issues a valid token', function () {
    $res = $this->postJson('/api/v1/auth/login', [
        'email'    => $this->user->email,
        'password' => 'secret123',
    ]);

    $res->assertOk();
    $token = $res->json('data.token');
    expect($token)->not->toBeNull();

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', $this->user->email);
});

it('revokes every token issued before 2FA was enabled', function () {
    $login    = $this->postJson('/api/v1/auth/login', [
        'email'    => $this->user->email,
        'password' => 'secret123',
    ]);
    $oldToken = $login->json('data.token');
    $this->assertDatabaseCount('personal_access_tokens', 1);

    // تفعيل مباشر (كما يفعل المسؤول) — التوكن صدر قبل التفعيل بساعة
    $this->user->forceFill([
        'two_factor_enabled'          => true,
        'two_factor_enabled_at'       => now(),
        'two_factor_secret'           => app(TwoFactorAuthService::class)->generateSecret(),
        'two_factor_recovery_codes'   => null,
    ])->save();
    DB::table('personal_access_tokens')->update(['created_at' => now()->subHour()]);

    // الوسيط يرفض التوكن القديم (صادر قبل التفعيل) → 401 + حذف
    app('auth')->forgetGuards();
    $this->withToken($oldToken)
        ->getJson('/api/v1/auth/me')
        ->assertStatus(401)
        ->assertJsonPath('code', 'TWO_FACTOR_REQUIRED');

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('enable via the API wipes every existing session', function () {
    $login    = $this->postJson('/api/v1/auth/login', [
        'email'    => $this->user->email,
        'password' => 'secret123',
    ]);
    $oldToken = $login->json('data.token');
    $this->assertDatabaseCount('personal_access_tokens', 1);

    $setup = $this->withToken($oldToken)->getJson('/api/v1/auth/two-factor/setup');
    $setup->assertOk();
    $secret = $setup->json('data.secret');

    $enable = $this->withToken($oldToken)->postJson('/api/v1/auth/two-factor/enable', [
        'code' => currentTotp($secret),
    ]);
    $enable->assertOk();
    $enable->assertJsonPath('data.enabled', true);
    expect($enable->json('data.recovery_codes'))->toHaveCount(10);

    // التفعيل يُلغي التوكن القديم فوراً (إعادة دخول مطلوبة برمز 2FA)
    $this->assertDatabaseCount('personal_access_tokens', 0);

    // guard في Laravel يخزّن المستخدم بين الطلبات — نعيد بناءه ليتحقق من التوكن المُحذوف
    app('auth')->forgetGuards();
    $this->withToken($oldToken)
        ->getJson('/api/v1/auth/me')
        ->assertStatus(401);
});

it('re-login with 2FA requires a challenge and confirm issues a fresh token', function () {
    $secret = app(TwoFactorAuthService::class)->generateSecret();

    $this->user->forceFill([
        'two_factor_enabled'    => true,
        'two_factor_enabled_at' => now(),
        'two_factor_secret'     => $secret,
    ])->save();

    $challenge = twoFactorChallengeFor($this, $this->user->email, 'secret123');
    $this->assertDatabaseCount('personal_access_tokens', 0);

    $confirm = $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge,
        'code'            => currentTotp($secret),
    ]);
    $confirm->assertOk();

    $newToken = $confirm->json('data.token');
    expect($newToken)->not->toBeNull();

    $this->withToken($newToken)->getJson('/api/v1/auth/me')->assertOk();

    // التحدي يُستهلك مرة واحدة — إعادة استخدامه مرفوضة حتى مع رمز سليم
    $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge,
        'code'            => currentTotp($secret),
    ])->assertStatus(422);
});

it('supports one-time backup codes and rejects a consumed or wrong code', function () {
    $secret = app(TwoFactorAuthService::class)->generateSecret();
    $codes  = app(TwoFactorAuthService::class)->generateRecoveryCodes($this->user);

    $this->user->forceFill([
        'two_factor_enabled'    => true,
        'two_factor_enabled_at' => now(),
        'two_factor_secret'     => $secret,
    ])->save();

    $challenge = twoFactorChallengeFor($this, $this->user->email, 'secret123');

    // رمز خاطئ → 422 والتحدي لا يُبطل
    $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge,
        'code'            => '000000',
    ])->assertStatus(422);

    // رمز استرجاع سليم → 200 + توكن
    $ok = $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge,
        'code'            => $codes[0],
    ]);
    $ok->assertOk();

    // التحدي مستهلك الآن
    $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge,
        'code'            => $codes[1],
    ])->assertStatus(422);

    // الرمز المستخدم يُستهلك مرة واحدة — لا يُقبل في تحدي جديد
    $challenge2 = twoFactorChallengeFor($this, $this->user->email, 'secret123');
    $this->postJson('/api/v1/auth/two-factor/confirm', [
        'challenge_token' => $challenge2,
        'code'            => $codes[0],
    ])->assertStatus(422);
});
