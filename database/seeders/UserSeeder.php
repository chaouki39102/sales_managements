<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
        ]);
        $superAdmin->assignRole('super-admin');

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin.user@mail.com',
            'password' => Hash::make('password'),
            'active' => true,
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('moderator');
    }
}
