<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Encryption
    |--------------------------------------------------------------------------
    |
    | When enabled, every backup is AES-256-GCM encrypted with a random IV
    | before the sha256 checksum is computed. The key falls back to APP_KEY.
    |
    */

    'encrypt' => (bool) env('BACKUP_ENCRYPT', false),

    'encryption_key' => env('BACKUP_ENCRYPTION_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    |
    | retention_keep : keep the N most recent backups regardless of age.
    | retention_days : additionally drop backups older than N days (only when
    |                  more than retention_keep files exist).
    |
    */

    'retention_keep' => (int) env('BACKUP_RETENTION_KEEP', 20),

    'retention_days' => (int) env('BACKUP_RETENTION_DAYS', 14),

    /*
    |--------------------------------------------------------------------------
    | Import (restore from an uploaded file)
    |--------------------------------------------------------------------------
    |
    | max_upload_bytes : upper bound for a single uploaded backup file. Note
    |                    that PHP's own upload_max_filesize / post_max_size in
    |                    php.ini must also permit the size (see AGENTS.md).
    |
    */

    'max_upload_bytes' => (int) env('BACKUP_MAX_UPLOAD_BYTES', 128 * 1024 * 1024),

    /*
    |--------------------------------------------------------------------------
    | MySQL client paths
    |--------------------------------------------------------------------------
    |
    | Used for the MySQL dump / restore paths (SQLite needs none).
    |
    */

    'mysqldump_path' => env('BACKUP_MYSQLDUMP', 'mysqldump'),

    'mysql_client' => env('BACKUP_MYSQL_CLIENT', 'mysql'),

];
