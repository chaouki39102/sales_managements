<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentStatusSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
        DB::table('document_statuses')->upsert([
            ['name' => 'draft',          'label' => 'مسودة',          'color' => 'gray',    'created_at' => now(), 'updated_at' => now()],
            ['name' => 'pending',        'label' => 'قيد الانتظار',   'color' => 'yellow',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'validated',      'label' => 'معتمد',          'color' => 'blue',    'created_at' => now(), 'updated_at' => now()],
            ['name' => 'partially_paid', 'label' => 'مدفوع جزئياً',   'color' => 'orange',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'paid',           'label' => 'مدفوع',          'color' => 'green',   'created_at' => now(), 'updated_at' => now()],
            ['name' => 'overdue',        'label' => 'متأخر',          'color' => 'red',     'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cancelled',      'label' => 'ملغي',           'color' => 'red',     'created_at' => now(), 'updated_at' => now()],
            ['name' => 'returned',       'label' => 'مرتجع',          'color' => 'purple',  'created_at' => now(), 'updated_at' => now()],
        ], ['name']);
=======
        $companyId = config('seeding.company_id') ?? DB::table('companies')->value('id');

        $statuses = [
            ['name' => 'draft',          'label' => 'مسودة',          'color' => 'gray'],
            ['name' => 'pending',        'label' => 'قيد الانتظار',    'color' => 'yellow'],
            ['name' => 'validated',      'label' => 'معتمد',           'color' => 'blue'],
            ['name' => 'partially_paid', 'label' => 'مدفوع جزئياً',    'color' => 'orange'],
            ['name' => 'paid',           'label' => 'مدفوع',           'color' => 'green'],
            ['name' => 'overdue',        'label' => 'متأخر',           'color' => 'red'],
            ['name' => 'cancelled',      'label' => 'ملغي',            'color' => 'red'],
            ['name' => 'returned',       'label' => 'مرتجع',           'color' => 'purple'],
        ];

        foreach ($statuses as $status) {
            DB::table('document_statuses')->insert([
                'company_id' => $companyId,
                'name'       => $status['name'],
                'label'      => $status['label'],
                'color'      => $status['color'],
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    }
}
