<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة الأعمدة لجدول users
 *
 * جدول users الأصلي يحتوي فقط على الحقول الأساسية (name, email, password, active).
 * هذا الـ migration يضيف باقي الحقول التي يتوقعها الـ User model في $fillable:
 *   - بيانات الملف الشخصي  (username, phone, avatar, bio, job_title)
 *   - بيانات شخصية        (birth_date, gender_id, national_id)
 *   - العنوان              (address, commune_id, wilaya_id)
 *   - الدور الافتراضي      (role_id) — للعرض السريع، الـ Spatie هي المرجع الرسمي
 *   - تتبع الدخول          (last_login_at, last_login_ip)
 *   - بيانات التسجيل       (register_ip, register_user_agent)
 *   - حقول المراجعة        (created_by, updated_by, deleted_by)
 *   - company_id           (المستخدم قد ينتمي لشركة افتراضية)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // --- بيانات الملف الشخصي ---
            $table->string('username', 50)->nullable()->unique()->after('name');
            $table->string('phone', 20)->nullable()->index()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->text('bio')->nullable()->after('avatar');
            $table->string('job_title', 100)->nullable()->after('bio');

            // --- بيانات شخصية ---
            $table->date('birth_date')->nullable()->after('job_title');
            $table->foreignId('gender_id')
                ->nullable()
                ->after('birth_date')
                ->constrained('genders')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('national_id', 20)->nullable()->after('gender_id');

            // --- العنوان ---
            $table->text('address')->nullable()->after('national_id');
            $table->foreignId('commune_id')
                ->nullable()
                ->after('address')
                ->constrained('communes')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('wilaya_id')
                ->nullable()
                ->after('commune_id')
                ->constrained('wilayas')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // --- الدور الافتراضي (للعرض السريع فقط — Spatie هي المرجع) ---
            // nullable unsignedBigInteger بدلاً من FK لتجنب مشكلة الدائرية مع Spatie roles
            $table->unsignedBigInteger('role_id')->nullable()->after('wilaya_id')->index();

            // --- تتبع الدخول ---
            $table->timestamp('last_login_at')->nullable()->after('role_id');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');

            // --- بيانات التسجيل ---
            $table->string('register_ip', 45)->nullable()->after('last_login_ip');
            $table->text('register_user_agent')->nullable()->after('register_ip');

            // --- حقول المراجعة ---
            $table->foreignId('created_by')
                ->nullable()
                ->after('active')
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('updated_by')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('deleted_by')
                ->nullable()
                ->after('updated_by')
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // حذف المفاتيح الأجنبية أولاً
            $table->dropForeign(['gender_id']);
            $table->dropForeign(['commune_id']);
            $table->dropForeign(['wilaya_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropForeign(['deleted_by']);

            // حذف الأعمدة
            $table->dropColumn([
                'username',
                'phone',
                'avatar',
                'bio',
                'job_title',
                'birth_date',
                'gender_id',
                'national_id',
                'address',
                'commune_id',
                'wilaya_id',
                'role_id',
                'last_login_at',
                'last_login_ip',
                'register_ip',
                'register_user_agent',
                'created_by',
                'updated_by',
                'deleted_by',
            ]);
        });
    }
};
