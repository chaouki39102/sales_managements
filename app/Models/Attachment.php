<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Attachment Model
 *
 * Table: attachments
 * Polymorphic file attachments
 */
class Attachment extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'attachments';

        protected $fillable = [
        'file_name',
        'file_path',
        'file_type',
        'file_extension',
        'file_size',
        'attachable_type',
        'attachable_id',
        'title',
        'description',
        'category',
        'is_public',
        'disk',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'is_public' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['file_name', 'title', 'description'];
    public static array $filterable = ['attachable_type', 'category', 'is_public'];
    public static array $sortable = ['id', 'file_name', 'created_at', 'file_size'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['attachable', 'uploadedBy'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['attachments'];

    public function attachable()
    {
        return $this->morphTo();
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->file_path);
    }

    public function getDownloadUrlAttribute(): string
    {
        return route('attachments.download', $this->id);
    }

    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

}
