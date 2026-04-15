<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            [
                'name' => 'draft',
                'label' => 'مسودة',
                'color' => 'gray',
            ],
            [
                'name' => 'pending',
                'label' => 'قيد الانتظار',
                'color' => 'yellow',
            ],
            [
                'name' => 'validated',
                'label' => 'معتمد',
                'color' => 'blue',
            ],
            [
                'name' => 'partially_paid',
                'label' => 'مدفوع جزئياً',
                'color' => 'orange',
            ],
            [
                'name' => 'paid',
                'label' => 'مدفوع',
                'color' => 'green',
            ],
            [
                'name' => 'overdue',
                'label' => 'متأخر',
                'color' => 'red',
            ],
            [
                'name' => 'cancelled',
                'label' => 'ملغي',
                'color' => 'red',
            ],
            [
                'name' => 'returned',
                'label' => 'مرتجع',
                'color' => 'purple',
            ],
        ];

        foreach ($statuses as $status) {
            DB::table('document_statuses')->insert([
                'name' => $status['name'],
                'label' => $status['label'],
                'color' => $status['color'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
