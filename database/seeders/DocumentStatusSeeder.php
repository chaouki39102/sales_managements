<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentStatusSeeder extends Seeder
{
    public function run(): void
    {
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
    }
}
