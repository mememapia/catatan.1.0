<?php
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/session.php';
require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    // Siapa yang sedang login?
    if ($action === 'me' && $method === 'GET') {
        $uid  = requireLogin();
        $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        if (!$user) { session_destroy(); jsonOut(401, ['error' => 'Akun tidak ditemukan.']); }
        jsonOut(200, $user);
    }

    if ($method !== 'POST') jsonOut(405, ['error' => 'Method tidak diizinkan.']);

    switch ($action) {

        case 'register':
            $name  = trim($input['name'] ?? '');
            $email = strtolower(trim($input['email'] ?? ''));
            $pass  = (string)($input['password'] ?? '');

            if (mb_strlen($name) < 2 || mb_strlen($name) > 60)   jsonOut(422, ['error' => 'Nama harus 2-60 karakter.']);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) jsonOut(422, ['error' => 'Format email tidak valid.']);
            if (strlen($pass) < 8)  jsonOut(422, ['error' => 'Password minimal 8 karakter.']);
            if (strlen($pass) > 72) jsonOut(422, ['error' => 'Password maksimal 72 karakter.']);

            try {
                $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
                $stmt->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') jsonOut(409, ['error' => 'Email sudah terdaftar.']);   // kolom email UNIQUE
                throw $e;
            }

            $uid = (int)$pdo->lastInsertId();
            session_regenerate_id(true);
            $_SESSION['user_id'] = $uid;
            jsonOut(201, ['id' => $uid, 'name' => $name, 'email' => $email]);

        case 'login':
            $email = strtolower(trim($input['email'] ?? ''));
            $pass  = (string)($input['password'] ?? '');

            $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            // Pesan sengaja sama untuk email salah dan password salah
            if (!$user || !password_verify($pass, $user['password_hash'])) {
                jsonOut(401, ['error' => 'Email atau password salah.']);
            }

            session_regenerate_id(true);   // cegah session fixation
            $_SESSION['user_id'] = (int)$user['id'];
            jsonOut(200, ['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email']]);

        case 'logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
            jsonOut(200, ['message' => 'Logout berhasil.']);

        default:
            jsonOut(404, ['error' => 'Aksi tidak dikenal.']);
    }
} catch (PDOException $e) {
    jsonOut(500, ['error' => 'Kesalahan database: ' . $e->getMessage()]);
}
