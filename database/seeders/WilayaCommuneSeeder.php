<?php

namespace Database\Seeders;

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Seeder مدمج لضمان إدخال الولايات (Wilayas) أولاً ثم البلديات (Communes) بالترتيب الصحيح.
 * يقرأ البيانات من ملفات JSON موجودة في 'database/seeders/data/'.
 */
class WilayaCommuneSeeder extends Seeder
{
    /**
     * النقطة الرئيسية لتشغيل الـ Seeder.
     */
    public function run(): void
    {
        $this->command->info('Starting geographic data seeding (Wilayas and Communes)...');

        // تعطيل فحص المفاتيح الخارجية مؤقتاً لتنظيف الجداول
        Schema::disableForeignKeyConstraints();

        // تنظيف الجداول
        if (Schema::hasTable('communes')) {
            DB::table('communes')->truncate();
        }
        
        if (Schema::hasTable('wilayas')) {
            DB::table('wilayas')->truncate();
        }

        // إعادة تفعيل فحص المفاتيح الخارجية
        Schema::enableForeignKeyConstraints();

        // 1. تشغيل دالة إدخال الولايات
        $this->seedWilayas();

        // 2. تشغيل دالة إدخال البلديات (تعتمد على الولايات)
        $this->seedCommunes();

        $this->command->info('Geographic data seeding finished.');
    }

    // ===================================================================
    //  1. دالة إدخال الولايات
    // ===================================================================
    private function seedWilayas(): void
    {
        $this->command->line('Seeding Wilayas...');

        // التحقق من وجود الجدول
        if (!Schema::hasTable('wilayas')) {
            $this->command->error("جدول 'wilayas' غير موجود. يرجى تشغيل الـ migrations أولاً.");
            return;
        }

        // التحقق من وجود الملف
        $jsonPath = database_path('seeders/data/wilayas.json');
        if (!File::exists($jsonPath)) {
            $this->command->error("ملف البيانات 'wilayas.json' غير موجود في المسار: " . $jsonPath);
            return;
        }

        // قراءة الملف
        $json = File::get($jsonPath);
        $wilayas = json_decode($json);

        if (is_null($wilayas)) {
            $this->command->error("خطأ في قراءة ملف 'wilayas.json'. تأكد أن صيغة JSON صحيحة.");
            return;
        }

        $data = [];

        // تحضير البيانات للإدراج
        foreach ($wilayas as $wilaya) {
            $data[] = [
                'code' => $wilaya->code,
                'name' => $wilaya->name,
                'arabic_name' => $wilaya->arabic_name,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // إدراج جميع الولايات دفعة واحدة
        DB::table('wilayas')->insert($data);
        $this->command->info(count($data) . " ولاية تم إضافتها بنجاح.");
    }

    // ===================================================================
    //  2. دالة إدخال البلديات
    // ===================================================================
    private function seedCommunes(): void
    {
        $this->command->line('Seeding Communes...');

        // التحقق من وجود الجدول
        if (!Schema::hasTable('communes')) {
            $this->command->error("جدول 'communes' غير موجود. يرجى تشغيل الـ migrations أولاً.");
            return;
        }

        // التحقق من وجود بيانات الولايات (الأهم)
        if (!Schema::hasTable('wilayas') || DB::table('wilayas')->count() === 0) {
            $this->command->warn("جدول 'wilayas' فارغ. تم تخطي إدخال البلديات.");
            return;
        }

        // جلب كل الولايات مرة واحدة وربطها برمزها
        $wilayas = DB::table('wilayas')->pluck('id', 'code');

        // قراءة ملف البلديات
        $jsonPath = database_path('seeders/data/communes.json');

        // التحقق من وجود الملف
        if (!File::exists($jsonPath)) {
            $this->command->error("ملف البيانات 'communes.json' غير موجود في المسار: " . $jsonPath);
            return;
        }

        $json = File::get($jsonPath);
        $communes = json_decode($json);

        if (is_null($communes)) {
            $this->command->error("خطأ في قراءة ملف 'communes.json'. تأكد أن صيغة JSON صحيحة.");
            return;
        }

        $data = [];
        $skippedCount = 0;

        // تحضير بيانات البلديات
        foreach ($communes as $commune) {
            $wilayaId = $wilayas->get($commune->wilaya_id);

            if ($wilayaId) {
                $data[] = [
                    'name' => $commune->name,
                    'arabic_name' => $commune->arabic_name,
                    'post_code' => $commune->post_code,
                    'wilaya_id' => $wilayaId,
                    'active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            } else {
                $skippedCount++;
            }
        }

        // إدراج جميع البلديات دفعة واحدة
        DB::table('communes')->insert($data);

        $this->command->info(count($data) . " بلدية تم إضافتها بنجاح.");
        if ($skippedCount > 0) {
            $this->command->warn("تم تخطي " . $skippedCount . " بلدية لعدم العثور على رمز ولاية مطابق.");
        }
    }
}