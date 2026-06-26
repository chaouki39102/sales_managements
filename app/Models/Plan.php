<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'key',
        'label',
        'description',
        'max_users',
        'max_products',
        'max_warehouses',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'max_users'      => 'integer',
        'max_products'   => 'integer',
        'max_warehouses' => 'integer',
        'is_active'      => 'boolean',
        'sort_order'     => 'integer',
    ];
}
