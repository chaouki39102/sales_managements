<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\Auth\TwoFactorEnableRequest;
use App\Http\Requests\Auth\TwoFactorConfirmRequest;
use App\Services\TwoFactorAuthService;
use App\Services\NotificationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TwoFactorAuthController extends BaseApiController
{
    protected string $resourceName = 'user';
    protected ?string $resourceClass = null;

    public function __construct(
        protected TwoFactorAuthService $twoFactorService,
        private NotificationService $notificationService,
    ) {
        parent::__construct();
    }

    /**
     * الخطوة الأولى: توليد secret + QR للتفعيل (المستخدم غير مفعَّل بعد).
     */
    public function setup(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $secret = $this->twoFactorService->generateSecret();

            // نُخزِّن secret كحالة معلّقة (pending) حتى يثبّت المستخدم بالرمز
            $user->forceFill(['two_factor_secret' => $secret])->save();

            return $this->successResponse([
                'enabled'       => (bool) $user->two_factor_enabled,
                'secret'        => $secret,
                'qr_svg'        => $this->twoFactorService->qrSvg($user, $secret),
                'otpauth_uri'   => $this->twoFactorService->provisioningUri($user, $secret),
            ], 'تم توليد رمز الاستجابة السريعة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'setup');
        }
    }

    /**
     * التفعيل بعد التحقق من الرمز — يُرجِع رموز الاسترجاع مرة واحدة.
     */
    public function enable(TwoFactorEnableRequest $request): JsonResponse
    {
        try {
            $user = $request->user();

            $this->twoFactorService->enable($user, $request->code);

            $recoveryCodes = $this->twoFactorService->generateRecoveryCodes($user);

            $this->notificationService->success(
                'الأمان',
                'تم تفعيل المصادقة الثنائية لحسابك'
            );

            return $this->successResponse([
                'enabled'         => true,
                'recovery_codes'  => $recoveryCodes,
            ], 'تم تفعيل المصادقة الثنائية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'enable');
        }
    }

    /**
     * إيقاف المصادقة الثنائية (يتطلب رمزاً سليماً).
     */
    public function disable(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $this->twoFactorService->disable($user, $request->code);

            $this->notificationService->success(
                'الأمان',
                'تم إيقاف المصادقة الثنائية لحسابك'
            );

            return $this->successResponse([
                'enabled' => false,
            ], 'تم إيقاف المصادقة الثنائية');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'disable');
        }
    }

    /**
     * إعادة توليد رموز الاسترجاع (تُعرض مرة واحدة فقط).
     */
    public function recoveryCodes(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (! $user->two_factor_enabled) {
                return $this->errorResponse('المصادقة الثنائية غير مفعلة', 422, 'TWO_FACTOR_NOT_ENABLED');
            }

            $recoveryCodes = $this->twoFactorService->generateRecoveryCodes($user);

            return $this->successResponse([
                'recovery_codes' => $recoveryCodes,
            ], 'تم توليد رموز استرجاع جديدة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'recoveryCodes');
        }
    }

    /**
     * الخطوة الثانية من تسجيل الدخول: تحقق من رمز 2FA ثم إصدار التوكن.
     */
    public function confirm(TwoFactorConfirmRequest $request): JsonResponse
    {
        try {
            $user = $this->twoFactorService->resolveChallenge($request->challenge_token);

            if (! $user) {
                return $this->errorResponse('رمز التحدي منتهي الصلاحية أو غير صالح. أعد تسجيل الدخول', 422, 'CHALLENGE_EXPIRED');
            }

            $this->twoFactorService->confirmLogin($user, $request->code);

            // 🔒 التحدي يُستهلك فقط بعد نجاح التحقق — رمز خاطئ لا يُبطل الجلسة
            $this->twoFactorService->consumeChallenge($request->challenge_token);

            $user->load('roles');

            $this->notificationService->success('تسجيل دخول', "مرحباً {$user->name}");

            return $this->successResponse([
                'user'       => new \App\Http\Resources\UserResource($user),
                'token'      => $user->createToken('auth_token')->plainTextToken,
                'token_type' => 'Bearer',
            ], 'تم دخولك بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'confirm');
        }
    }

    protected function getService(): TwoFactorAuthService { return $this->twoFactorService; }
    protected function getModelClass(): string { return User::class; }
}
