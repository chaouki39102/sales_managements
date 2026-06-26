<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountApproved extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'تم تفعيل حسابك في نظام المبيعات',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="font-family: DejaVu Sans, sans-serif; background:#f5f5f5; padding:30px;">
<div style="max-width:520px; margin:auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#0a8a5c,#0dbf84); padding:28px; text-align:center;">
    <div style="font-size:48px; margin-bottom:8px;">✅</div>
    <div style="font-size:20px; font-weight:800; color:#fff;">تم تفعيل حسابك</div>
  </div>
  <div style="padding:28px;">
    <div style="font-size:15px; color:#333; margin-bottom:16px;">
      مرحباً <strong>' . e($this->user->name) . '</strong>،
    </div>
    <div style="font-size:13px; color:#555; line-height:1.8; margin-bottom:20px;">
      تمت الموافقة على طلب تسجيلك في نظام المبيعات. يمكنك الآن تسجيل الدخول والبدء في استخدام المنصة.
    </div>
    <div style="text-align:center; margin:24px 0;">
      <a href="' . url('/login') . '" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg,#0a8a5c,#0dbf84); color:#fff; text-decoration:none; border-radius:10px; font-size:14px; font-weight:700;">
        تسجيل الدخول
      </a>
    </div>
    <div style="font-size:11px; color:#999; text-align:center; border-top:1px solid #eee; padding-top:16px;">
      © ' . date('Y') . ' نظام المبيعات — كل الحقوق محفوظة
    </div>
  </div>
</div>
</body>
</html>',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
