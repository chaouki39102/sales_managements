<?php

namespace App\Listeners;

use App\Services\NotificationService;
use Illuminate\Events\Dispatcher;

class NotificationEventSubscriber
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    public function subscribe(Dispatcher $events): void
    {
        $events->listen('product.created',           [self::class, 'handleProductCreated']);
        $events->listen('product.updated',           [self::class, 'handleProductUpdated']);
        $events->listen('product.deleted',           [self::class, 'handleProductDeleted']);
        $events->listen('user.created',              [self::class, 'handleUserCreated']);
        $events->listen('user.updated',              [self::class, 'handleUserUpdated']);
        $events->listen('commercial_document.created', [self::class, 'handleDocumentCreated']);
        $events->listen('commercial_document.updated', [self::class, 'handleDocumentUpdated']);
        $events->listen('stock_movement.created',    [self::class, 'handleStockMovementCreated']);
        $events->listen('check.created',             [self::class, 'handleCheckCreated']);
        $events->listen('check.updated',             [self::class, 'handleCheckUpdated']);
        $events->listen('expense.created',           [self::class, 'handleExpenseCreated']);
        $events->listen('expense.updated',           [self::class, 'handleExpenseUpdated']);
    }

    public function handleProductCreated($product): void
    {
        $this->notificationService->success(
            'تم إضافة منتج جديد',
            $product->name ?? '',
        );
    }

    public function handleProductUpdated($product): void
    {
        $this->notificationService->info(
            'تم تحديث المنتج',
            $product->name ?? '',
        );
    }

    public function handleProductDeleted($product): void
    {
        $this->notificationService->warning(
            'تم حذف المنتج',
            $product->name ?? '',
        );
    }

    public function handleUserCreated($user): void
    {
        $this->notificationService->success(
            'تم إضافة مستخدم جديد',
            $user->name ?? '',
        );
    }

    public function handleUserUpdated($user): void
    {
        $this->notificationService->info(
            'تم تحديث المستخدم',
            $user->name ?? '',
        );
    }

    public function handleDocumentCreated($document): void
    {
        $this->notificationService->success(
            'تم إنشاء مستند جديد',
            ($document->document_number ?? '') . ' — ' . ($document->type_code ?? ''),
        );
    }

    public function handleDocumentUpdated($document): void
    {
        $this->notificationService->info(
            'تم تحديث المستند',
            $document->document_number ?? '',
        );
    }

    public function handleStockMovementCreated($movement): void
    {
        $this->notificationService->info(
            'تم تسجيل حركة مخزون جديدة',
            '',
        );
    }

    public function handleCheckCreated($check): void
    {
        $this->notificationService->info(
            'تم إضافة شيك جديد',
            'شيك رقم ' . ($check->check_number ?? ''),
        );
    }

    public function handleCheckUpdated($check): void
    {
        $this->notificationService->info(
            'تم تحديث الشيك',
            'شيك رقم ' . ($check->check_number ?? ''),
        );
    }

    public function handleExpenseCreated($expense): void
    {
        $this->notificationService->warning(
            'تم إضافة مصروف جديد',
            $expense->description ?? '',
        );
    }

    public function handleExpenseUpdated($expense): void
    {
        $this->notificationService->info(
            'تم تحديث المصروف',
            $expense->description ?? '',
        );
    }
}
