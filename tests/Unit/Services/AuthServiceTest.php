<?php

namespace Tests\Unit\Services;

use App\Services\AuthService;
use App\Models\User;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;

class AuthServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AuthService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AuthService();
    }

    public function test_register_creates_new_user(): void
    {
        $data = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
        ];

        $user = $this->service->register($data);

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('John Doe', $user->name);
        $this->assertEquals('john@example.com', $user->email);
        $this->assertTrue(Hash::check('password123', $user->password));
    }

    public function test_register_fails_for_existing_email(): void
    {
        User::factory()->create(['email' => 'john@example.com']);

        $data = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
        ];

        $this->expectException(BusinessRuleException::class);
        $this->service->register($data);
    }

    public function test_login_returns_user_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $result = $this->service->login('john@example.com', 'password123');

        $this->assertInstanceOf(User::class, $result);
        $this->assertEquals($user->id, $result->id);
    }

    public function test_login_fails_with_invalid_email(): void
    {
        $this->expectException(UnauthorizedException::class);
        $this->service->login('nonexistent@example.com', 'password123');
    }

    public function test_login_fails_with_invalid_password(): void
    {
        User::factory()->create([
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $this->expectException(UnauthorizedException::class);
        $this->service->login('john@example.com', 'wrongpassword');
    }

    public function test_change_password_updates_password(): void
    {
        $user = User::factory()->create([
            'password' => 'oldpassword123',
        ]);

        $this->service->changePassword($user, 'oldpassword123', 'newpassword123');

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));
    }

    public function test_change_password_fails_with_invalid_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'oldpassword123',
        ]);

        $this->expectException(UnauthorizedException::class);
        $this->service->changePassword($user, 'wrongpassword', 'newpassword123');
    }

    public function test_change_password_invalidates_existing_tokens(): void
    {
        $user = User::factory()->create([
            'password' => 'oldpassword123',
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $this->service->changePassword($user, 'oldpassword123', 'newpassword123');

        $this->assertCount(0, $user->tokens);
    }

    public function test_find_by_id_returns_user(): void
    {
        $user = User::factory()->create();

        $result = $this->service->findById($user->id);

        $this->assertEquals($user->id, $result->id);
    }
}