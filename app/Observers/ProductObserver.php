<?php

namespace App\Observers;

use App\Models\Product;

class ProductObserver
{
    /**
     * أي منتج يُحفظ (إنشاء أو تحديث) بدون باركود يحصل تلقائياً على باركود
     * EAN-13 فريد. يغطي كل مسارات الحفظ: الواجهة، الاستيراد، الـ seeders…
     */
    public function creating(Product $product): void
    {
        $this->ensureBarcode($product);
    }

    public function updating(Product $product): void
    {
        $this->ensureBarcode($product);
    }

    private function ensureBarcode(Product $product): void
    {
        $barcode = $product->barcode !== null ? trim((string) $product->barcode) : '';
        if ($barcode !== '') {
            return;
        }
        $product->barcode = Product::generateUniqueBarcode();
    }
}
