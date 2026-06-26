<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AdminApprovalController extends Controller
{
    public function pending(): JsonResponse
    {
        $users = User::where('is_approved', false)
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'super-admin'))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn(User $u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'created_at' => $u->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $users]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('is_approved', false)->findOrFail($id);

        DB::transaction(function () use ($user) {
            $user->update(['is_approved' => true]);
        });

        try {
            app(MailConfigService::class)->apply();
            Mail::to($user->email)->send(new \App\Mail\AccountApproved($user));
        } catch (\Throwable $e) {
            Log::warning('Failed to send approval email to user #' . $user->id . ': ' . $e->getMessage());
        }

        return response()->json(['message' => 'تم تفعيل الحساب بنجاح']);
    }

    public function reject(int $id): JsonResponse
    {
        $user = User::where('is_approved', false)->findOrFail($id);

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json(['message' => 'تم رفض الحساب وحذفه']);
    }
}
