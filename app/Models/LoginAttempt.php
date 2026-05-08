<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginAttempt extends Model
{
    protected $table = 'login_attempts';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email',
        'ip_address',
        'user_agent',
        'success',
        'attempted_at',
    ];

    protected $casts = [
        'success' => 'boolean',
        'attempted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function record(string $email, bool $success, ?string $ip = null): self
    {
        $user = User::where('email', $email)->first();
        return static::create([
            'user_id' => $user?->id,
            'email' => $email,
            'ip_address' => $ip ?? request()->ip(),
            'user_agent' => request()->userAgent(),
            'success' => $success,
            'attempted_at' => now(),
        ]);
    }

    public static function getFailedAttempts(string $email, int $minutes = 15): int
    {
        return static::where('email', $email)
            ->where('success', false)
            ->where('attempted_at', '>=', now()->subMinutes($minutes))
            ->count();
    }

    public static function isLockedOut(string $email, int $maxAttempts = 5, int $minutes = 15): bool
    {
        return static::getFailedAttempts($email, $minutes) >= $maxAttempts;
    }
}