<?php
// ── Application settings ──────────────────────────────────────
define('APP_NAME',    'Document Management System');
define('APP_VERSION', '1.0.0');
define('BASE_URL',    'http://localhost/dms/backend');

// ── File upload settings ──────────────────────────────────────
define('UPLOAD_DIR',       __DIR__ . '/../uploads/documents/');
define('AVATAR_DIR',       __DIR__ . '/../uploads/avatars/');
define('MAX_FILE_SIZE',    52428800);   // 50 MB
define('MAX_AVATAR_SIZE',  2097152);    // 2  MB

define('ALLOWED_FILE_TYPES', [
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls'  => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt'  => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt'  => 'text/plain',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'zip'  => 'application/zip',
    'rar'  => 'application/x-rar-compressed',
]);

// ── Session settings ──────────────────────────────────────────
define('SESSION_LIFETIME', 3600 * 8);   // 8 hours

// ── Security ──────────────────────────────────────────────────
define('BCRYPT_COST', 12);

// ── Pagination ────────────────────────────────────────────────
define('DEFAULT_PAGE_SIZE', 20);
