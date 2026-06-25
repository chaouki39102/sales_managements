<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $notificationData = $this->data ?? [];

        $iconMap = [
            'success' => 'CircleCheck',
            'error'   => 'CircleX',
            'warning' => 'AlertTriangle',
            'info'    => 'InfoCircle',
        ];

        return [
            'id'               => $this->id,
            'type'             => $notificationData['type'] ?? 'info',
            'title'            => $notificationData['title'] ?? '',
            'message'          => $notificationData['message'] ?? null,
            'action_url'       => $notificationData['action_url'] ?? null,
            'icon'             => $iconMap[$notificationData['type'] ?? 'info'] ?? 'InfoCircle',
            'is_read'          => ! is_null($this->read_at),
            'created_at'       => $this->created_at?->toDateTimeString(),
            'created_at_human' => $this->created_at?->diffForHumans(),
        ];
    }
}
