<?php
// Memulai session dengan pengaturan cookie yang lebih aman
if (session_status() === PHP_SESSION_NONE) {
    session_name('taskly_sid');             // nama khusus supaya tidak bentrok dengan project lain di localhost
    session_set_cookie_params([
        'lifetime' => 0,                    // hilang saat browser ditutup
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,                 // cookie tidak bisa dibaca JavaScript
        'samesite' => 'Lax',                // dasar perlindungan CSRF
    ]);
    session_start();
}

function jsonOut(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function currentUserId(): ?int {
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

// Dipakai di endpoint yang wajib login
function requireLogin(): int {
    $id = currentUserId();
    if (!$id) jsonOut(401, ['error' => 'Silakan login terlebih dahulu.']);
    return $id;
}
