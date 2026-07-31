<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * المنتجات المستوردة كانت تحتوي الباركود داخل عمود ref بدلاً من barcode.
     * ينقل أي ref رقمي (6-16 خانة) إلى عمود barcode (حيث يكون الباركود فارغاً)
     * مع تفادي التكرار، ثم يفرّغ ref لأن القيمة الرقمية كانت باركوداً وليست مرجعاً.
     */
    public function up(): void
    {
        $rows = DB::table('products')
            ->whereNull('barcode')
            ->whereNotNull('ref')
            ->where('ref', '<>', '')
            ->orderBy('id')
            ->get();

        $existing = DB::table('products')
            ->whereNotNull('barcode')
            ->where('barcode', '<>', '')
            ->pluck('barcode')
            ->map(fn ($v) => (string) $v)
            ->flip();

        $moved = 0;
        foreach ($rows as $row) {
            $ref = trim((string) $row->ref);
            if ($ref === '' || !preg_match('/^[0-9]{6,16}$/', $ref)) {
                continue;
            }
            if ($existing->has($ref)) {
                continue;
            }
            $existing->put($ref, true);
            DB::table('products')->where('id', $row->id)->update([
                'barcode' => $ref,
                'ref'     => null,
            ]);
            $moved++;
        }
    }

    public function down(): void
    {
        // التراجع: نقل الباركود الرقمي عائداً إلى ref (للمنتجات التي لا تملك ref حالياً)
        $rows = DB::table('products')
            ->whereNull('ref')
            ->whereNotNull('barcode')
            ->where('barcode', '<>', '')
            ->get();

        foreach ($rows as $row) {
            if (!preg_match('/^[0-9]{6,16}$/', trim((string) $row->barcode))) {
                continue;
            }
            DB::table('products')->where('id', $row->id)->update([
                'ref'     => $row->barcode,
                'barcode' => null,
            ]);
        }
    }
};
