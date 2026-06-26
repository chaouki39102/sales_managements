<?php

namespace App\Services;

use App\Models\User;
use App\Models\LoginAttempt;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService extends \App\Core\Services\BaseService
{
    protected function getResourceName(): string
    {
        return 'user';
    }
    protected string $model = User::class;
    protected string $resourceName = 'user';

    protected int $maxLoginAttempts = 5;
    protected int $lockoutMinutes = 15;

    public function register(array $data): User
    {
        if (User::where('email', $data['email'])->exists()) {
            throw new BusinessRuleException('ظ‡ط°ط§ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط³ط¬ظ„ ط¨ط§ظ„ظپط¹ظ„', 422);
        }

        return $this->create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => $data['password'],
        ]);
    }

    public function login(string $email, string $password): User
    {
        if (LoginAttempt::isLockedOut($email, $this->maxLoginAttempts, $this->lockoutMinutes)) {
            throw new BusinessRuleException(
                'طھظ… ظ‚ظپظ„ ط§ظ„ط­ط³ط§ط¨ ظ…ط¤ظ‚طھط§ظ‹ ط¨ط³ط¨ط¨ ظ…ط­ط§ظˆظ„ط§طھ ط¯ط®ظˆظ„ ظپط§ط´ظ„ط© ظ…طھط¹ط¯ط¯ط©. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ„ط§ط­ظ‚ط§ظ‹',
                423
            );
        }

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            LoginAttempt::record($email, false);
            throw new UnauthorizedException('ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¯ط®ظˆظ„ ط؛ظٹط± طµط­ظٹط­ط©');
        }

        // âœ… ظ…ظ†ط¹ ط¯ط®ظˆظ„ ط§ظ„ظ…ط³طھط®ط¯ظ…ظٹظ† ط؛ظٹط± ط§ظ„ظ…ط¹طھظ…ط¯ظٹظ† (ط¥ظ„ط§ super-admin)
        if (!$user->is_approved && !$user->isSuperAdmin()) {
            throw new UnauthorizedException('ط­ط³ط§ط¨ظƒ ظ„ظ… ظٹطھظ… طھظپط¹ظٹظ„ظ‡ ط¨ط¹ط¯. ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط± ط­طھظ‰ طھطھظ… ط§ظ„ظ…ظˆط§ظپظ‚ط© ط¹ظ„ظٹظ‡ ظ…ظ† ظ‚ط¨ظ„ ط§ظ„ط¥ط¯ط§ط±ط©');
        }

        LoginAttempt::record($email, true);

        // âœ… طھط³ط¬ظٹظ„ ظˆظ‚طھ ظˆط¹ظ†ظˆط§ظ† ط¢ط®ط± ط¯ط®ظˆظ„
        $user->updateLastLogin();

        return $user;
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new UnauthorizedException('ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط© ط؛ظٹط± طµط­ظٹط­ط©');
        }
        DB::transaction(function () use ($user, $newPassword) {
            $user->update(['password' => $newPassword]);
            $user->tokens()->delete();
        });
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: ط¥ط±ط³ط§ظ„ ط¨ط±ظٹط¯ طھط±ط­ظٹط¨
    }
}
