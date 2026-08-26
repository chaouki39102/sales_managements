<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\HasCompany;

class DocumentLineTemplate extends Model
{
    use HasCompany;

    protected $table = 'document_line_templates';

    protected $fillable = [
        'company_id',
        'name',
        'lines',
    ];

    protected $casts = [
        'lines' => 'json',
    ];
}
