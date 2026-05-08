<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->unique()->after('name');
            $table->string('phone', 20)->nullable()->index()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->text('bio')->nullable()->after('avatar');
            $table->string('job_title', 100)->nullable()->after('bio');
            $table->date('birth_date')->nullable()->after('job_title');
            $table->foreignId('gender_id')->nullable()->after('birth_date')->constrained('genders')->nullOnDelete()->cascadeOnUpdate();
            $table->string('national_id', 20)->nullable()->after('gender_id');
            $table->text('address')->nullable()->after('national_id');
            $table->foreignId('commune_id')->nullable()->after('address')->constrained('communes')->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('wilaya_id')->nullable()->after('commune_id')->constrained('wilayas')->nullOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('role_id')->nullable()->after('wilaya_id')->index();
            $table->timestamp('last_login_at')->nullable()->after('role_id');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('register_ip', 45)->nullable()->after('last_login_ip');
            $table->text('register_user_agent')->nullable()->after('register_ip');
        });
    }
    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['gender_id']);
            $table->dropForeign(['commune_id']);
            $table->dropForeign(['wilaya_id']);
            $table->dropColumn([
                'username', 'phone', 'avatar', 'bio', 'job_title',
                'birth_date', 'gender_id', 'national_id', 'address',
                'commune_id', 'wilaya_id', 'role_id',
                'last_login_at', 'last_login_ip', 'register_ip', 'register_user_agent',
            ]);
        });
    }
};
