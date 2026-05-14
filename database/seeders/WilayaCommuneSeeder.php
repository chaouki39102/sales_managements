<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Seeder مدمج لضمان إدخال الولايات (Wilayas) أولاً ثم البلديات (Communes) بالترتيب الصحيح.
 * يقرأ البيانات من ملفات JSON موجودة في 'database/seeders/data/'.
 *
 * ✅ مصحح: إزالة $this->command->info() التي تتسبب بخطأ عند الاستدعاء من API
 *    لأن $this->command تكون null خارج سياق CLI (artisan db:seed)
 */
class WilayaCommuneSeeder extends Seeder
{
    /**
     * النقطة الرئيسية لتشغيل الـ Seeder.
     */
    public function run(): void
    {
        // تعطيل فحص المفاتيح الخارجية مؤقتاً لتنظيف الجداول
        Schema::disableForeignKeyConstraints();

        if (Schema::hasTable('communes')) {
            DB::table('communes')->truncate();
        }

        if (Schema::hasTable('wilayas')) {
            DB::table('wilayas')->truncate();
        }

        Schema::enableForeignKeyConstraints();

        // 1. إدخال الولايات أولاً
        $this->seedWilayas();

        // 2. إدخال البلديات (تعتمد على الولايات)
        $this->seedCommunes();
    }

    // ===================================================================
    //  1. دالة إدخال الولايات
    // ===================================================================
    private function seedWilayas(): void
    {
        if (!Schema::hasTable('wilayas')) {
            return;
        }

        $jsonPath = database_path('seeders/data/wilayas.json');
        if (!File::exists($jsonPath)) {
            throw new \RuntimeException("ملف البيانات 'wilayas.json' غير موجود في المسار: " . $jsonPath);
        }

        $wilayas = json_decode(File::get($jsonPath));

        if (is_null($wilayas)) {
            throw new \RuntimeException("خطأ في قراءة ملف 'wilayas.json'. تأكد أن صيغة JSON صحيحة.");
        }

        $data = [];
        foreach ($wilayas as $wilaya) {
            $data[] = [
                'code'        => $wilaya->code,
                'name'        => $wilaya->name,
                'arabic_name' => $wilaya->arabic_name,
                'active'      => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }

        DB::table('wilayas')->insert($data);

        // ✅ للـ CLI فقط: طباعة النتيجة إن كان السياق artisan
        $this->log(count($data) . " ولاية تم إضافتها بنجاح.");
    }

    // ===================================================================
    //  2. دالة إدخال البلديات
    // ===================================================================
    private function seedCommunes(): void
    {
        if (!Schema::hasTable('communes')) {
            return;
        }

        if (!Schema::hasTable('wilayas') || DB::table('wilayas')->count() === 0) {
            throw new \RuntimeException("جدول 'wilayas' فارغ. لا يمكن إدخال البلديات.");
        }

        // جلب كل الولايات مرة واحدة وربطها برمزها
        $wilayas = DB::table('wilayas')->pluck('id', 'code');

        $jsonPath = database_path('seeders/data/communes.json');
        if (!File::exists($jsonPath)) {
            throw new \RuntimeException("ملف البيانات 'communes.json' غير موجود في المسار: " . $jsonPath);
        }

        $communes = json_decode(File::get($jsonPath));

        if (is_null($communes)) {
            throw new \RuntimeException("خطأ في قراءة ملف 'communes.json'. تأكد أن صيغة JSON صحيحة.");
        }

        $data         = [];
        $skippedCount = 0;

        foreach ($communes as $commune) {
            $wilayaId = $wilayas->get($commune->wilaya_id);

            if ($wilayaId) {
                $data[] = [
                    'name'        => $commune->name,
                    'arabic_name' => $commune->arabic_name,
                    'post_code'   => $commune->post_code,
                    'wilaya_id'   => $wilayaId,
                    'active'      => true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            } else {
                $skippedCount++;
            }
        }

        // إدراج جميع البلديات دفعة واحدة
        DB::table('communes')->insert($data);

        $this->log(count($data) . " بلدية تم إضافتها بنجاح." .
            ($skippedCount > 0 ? " (تم تخطي {$skippedCount} بلدية)" : ""));
    }

    /**
     * ✅ طباعة آمنة — تعمل في CLI فقط، تُهمَل عند الاستدعاء من API
     */
    private function log(string $message): void
    {
        if (isset($this->command) && $this->command !== null) {
            $this->command->info($message);
        }
    }
}
