<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\Portal\PortalAccessRequest;
use App\Models\Party;
use App\Models\PortalUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalAccessController extends BaseApiController
{
    protected string $resourceName = 'portal_access';
    protected ?string $resourceClass = null;

    public function createPortal(PortalAccessRequest $request): JsonResponse
    {
        try {
            $this->authorizeAction('update_company');

            $party = $this->resolveParty((int) $request->party_id);

            $existing = PortalUser::query()->where('party_id', $party->id)->first();
            if ($existing) {
                return $this->errorResponse('هذا الزبون لديه بالفعل حساب بوابة. يمكنك تعديله.', 409, 'PORTAL_ALREADY_EXISTS');
            }

            $portal = PortalUser::query()->create([
                'company_id' => $this->companyId(),
                'party_id'   => $party->id,
                'name'       => $request->name ?: $party->name,
                'email'      => $request->email,
                'password'   => $request->password,
                'is_active'  => $request->boolean('is_active', true),
            ]);

            return $this->successResponse($this->payload($portal), 'تم إنشاء حساب البوابة بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_access.store');
        }
    }

    public function forParty(Request $request): JsonResponse
    {
        try {
            $partyId = (int) ($request->route('partyId') ?? $request->input('party_id'));
            $this->resolveParty($partyId);

            $portal = PortalUser::query()->where('party_id', $partyId)->first();

            return $this->successResponse($portal ? $this->payload($portal) : null, 'تم جلب حساب البوابة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_access.for_party');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $portal = $this->findPortal($id);
            $this->authorizeAction('update_company');

            $validated = $request->validate([
                'name'      => ['nullable', 'string', 'max:191'],
                'email'     => ['sometimes', 'string', 'email', 'max:191'],
                'password'  => ['nullable', 'string', 'min:8'],
                'is_active' => ['sometimes', 'boolean'],
            ]);

            $data = [
                'name'     => $validated['name'] ?? $portal->name,
                'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $portal->is_active,
            ];

            if (! empty($validated['email'])) {
                $exists = PortalUser::query()
                    ->where('company_id', $portal->company_id)
                    ->where('email', $validated['email'])
                    ->where('id', '!=', $portal->id)
                    ->exists();
                if ($exists) {
                    return $this->errorResponse('يوجد بالفعل حساب بوابة بهذا البريد الإلكتروني لهذه المؤسسة', 422, 'EMAIL_TAKEN');
                }
                $data['email'] = $validated['email'];
            }

            if (! empty($validated['password'])) {
                $data['password'] = $validated['password'];
            }

            $portal->update($data);

            return $this->successResponse($this->payload($portal), 'تم تحديث حساب البوابة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_access.update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $portal = $this->findPortal($id);
            $this->authorizeAction('update_company');
            $portal->tokens()->delete();
            $portal->delete();

            return $this->successResponse(null, 'تم حذف حساب البوابة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'portal_access.destroy');
        }
    }

    protected function findPortal($id): PortalUser
    {
        $resolvedId = $this->extractId($id);

        $portal = PortalUser::query()->find($resolvedId);
        if (! $portal) {
            throw new \Illuminate\Database\Eloquent\ModelNotFoundException();
        }

        return $portal;
    }

    protected function resolveParty(int $partyId): Party
    {
        $party = Party::query()->find($partyId);
        if (! $party) {
            throw new \Illuminate\Database\Eloquent\ModelNotFoundException();
        }

        return $party;
    }

    protected function companyId(): int
    {
        return (int) app(\App\Services\CompanyContextService::class)->get();
    }

    protected function payload(PortalUser $portal): array
    {
        return [
            'id'         => $portal->id,
            'party_id'   => $portal->party_id,
            'name'       => $portal->name,
            'email'      => $portal->email,
            'is_active'  => (bool) $portal->is_active,
            'last_login_at' => optional($portal->last_login_at)->toISOString(),
            'created_at' => optional($portal->created_at)->toISOString(),
            'updated_at' => optional($portal->updated_at)->toISOString(),
        ];
    }

    protected function getService(): mixed
    {
        return null;
    }

    protected function getModelClass(): string
    {
        return PortalUser::class;
    }
}
