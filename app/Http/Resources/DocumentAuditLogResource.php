<?php

namespace App\Http\Resources;

use App\Models\Company;
use App\Services\AuditLabelService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تدقيق المستند التجاري — يُرجع حدث تدقيق واحداً (document_audit_logs).
 *
 * يحافظ على الحقول الخام (القيم القديمة/الجديدة كما خُزّنت) ويضيف تسميات عربية
 * جاهزة للعرض: ملخص الجملة، تسمية الفعل/الحقل، اسم المستخدم/المستند/الشركة،
 * والصفوف المقروءة للقيم. القاعدة: لا معرّفات خام ولا مفاتيح إنجليزية في العرض.
 */
class DocumentAuditLogResource extends JsonResource
{
    /** cache لكل طلب لأسماء الشركات (تجنب استعلام لكل صف). */
    private static array $companyNames = [];

    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['document', 'user']);

        $service = app(AuditLabelService::class);

        $document = $this->document;
        $user     = $this->user;

        $companyName = null;
        if ($this->company_id) {
            $companyId = (int) $this->company_id;
            if (!array_key_exists($companyId, self::$companyNames)) {
                try {
                    self::$companyNames[$companyId] = Company::query()->whereKey($companyId)->value('name');
                } catch (\Throwable $e) {
                    self::$companyNames[$companyId] = null;
                }
            }
            $companyName = self::$companyNames[$companyId];
        }

        return [
            'id'                   => $this->id,
            'document_id'          => $this->document_id,
            'company_id'           => $this->company_id,
            'user_id'              => $this->user_id,
            'user'                 => new UserResource($this->whenLoaded('user')),
            'user_label'           => $user ? $service->displayLabel($user) : 'مستخدم محذوف',
            'company_name'         => $companyName,
            'document'             => $document
                ? [
                    'id'            => (int) $document->getKey(),
                    'document_number'=> $document->document_number,
                    'display_label' => $service->displayLabel($document),
                ]
                : null,
            'document_label'       => $document ? $service->displayLabel($document) : ('#' . $this->document_id),
            'action'               => $this->action,
            'action_label'         => $service->documentAuditActionLabel((string) $this->action),
            'action_summary'       => $service->documentAuditSummary($this->resource),
            'field_name'           => $this->field_name,
            'field_label'          => $this->field_name ? $service->fieldLabel((string) $this->field_name) : null,
            'old_value'            => $this->old_value,
            'new_value'            => $this->new_value,
            'humanized_old_value'  => $this->old_value !== null ? $service->documentAuditHumanized($this->old_value) : null,
            'humanized_new_value'  => $this->new_value !== null ? $service->documentAuditHumanized($this->new_value) : null,
            'ip_address'           => $this->ip_address,
            'user_agent'           => $this->user_agent,
            'created_at'           => $this->created_at?->toDateTimeString(),
            'updated_at'           => $this->updated_at?->toDateTimeString(),
        ];
    }
}