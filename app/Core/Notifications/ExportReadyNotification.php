<?php

namespace App\Core\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class ExportReadyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public string $downloadUrl, public string $resourceName)
    {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail']; // Could also be ['mail', 'database']
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $friendlyResourceName = Str::of($this->resourceName)->replace('_', ' ')->title();

        return (new MailMessage)
            ->subject("Your {$friendlyResourceName} Export is Ready")
            ->greeting("Hello {$notifiable->name},")
            ->line("The {$friendlyResourceName} report you requested is now ready for download.")
            ->action('Download File', $this->downloadUrl)
            ->line('This link will be valid for 24 hours.')
            ->line('Thank you for using our application!');
    }
}
