<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * NotificationResource
 *
 * تحوّل نموذج Notification إلى JSON موحّد يُرسَل للـ Frontend.
 * يعتمد على الحقل data (JSON) الذي يحمل: type, title, message, action_url, icon.
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // استخراج البيانات المخزّنة في حقل data
        $data = $this->data ?? [];

        return [
            'id'              => $this->id,
            'type'            => $data['type']       ?? 'info',
            'title'           => $data['title']      ?? '',
            'message'         => $data['message']    ?? null,
            'action_url'      => $data['action_url'] ?? null,
            'icon'            => $data['icon']       ?? null,
            'is_read'         => ! is_null($this->read_at),
            'created_at'      => $this->created_at->toIso8601String(),
            'created_at_human'=> $this->created_at->diffForHumans(),
        ];
    }
}
