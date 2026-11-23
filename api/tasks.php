<?php
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/session.php';
require __DIR__ . '/config.php';

$uid    = requireLogin();   // belum login -> 401, dan script.js akan mengarahkan ke login.html
$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;

function toTask(array $r): array {
    return [
        'id'          => (int)$r['id'],
        'title'       => $r['title'],
        'description' => $r['description'] ?? '',
        'dueDate'     => $r['due_date'] ? date('Y-m-d\TH:i', strtotime($r['due_date'])) : '',
        'status'      => $r['status'],
        'createdAt'   => $r['created_at'],
    ];
}

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function parseDue($value): ?string {
    if ($value === null || $value === '') return null;
    $dt = DateTime::createFromFormat('Y-m-d\TH:i', $value);
    if (!$dt) fail(422, 'Format deadline tidak valid.');
    return $dt->format('Y-m-d H:i:s');
}

// Hanya mengembalikan tugas milik pengguna yang sedang login
function findTask(PDO $pdo, int $id, int $uid): array {
    $stmt = $pdo->prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $uid]);
    $row = $stmt->fetch();
    if (!$row) fail(404, 'Tugas tidak ditemukan.');
    return $row;
}

try {
    switch ($method) {

        case 'GET':
            if ($id) {
                echo json_encode(toTask(findTask($pdo, $id, $uid)));
            } else {
                $stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC');
                $stmt->execute([$uid]);
                echo json_encode(array_map('toTask', $stmt->fetchAll()));
            }
            break;

        case 'POST':
            $title  = trim($input['title'] ?? '');
            $desc   = trim($input['description'] ?? '');
            $status = $input['status'] ?? 'active';

            if (mb_strlen($title) < 3 || mb_strlen($title) > 80) fail(422, 'Nama tugas harus 3-80 karakter.');
            if (!in_array($status, ['active', 'completed'], true)) fail(422, 'Status tidak valid.');

            $stmt = $pdo->prepare('INSERT INTO tasks (user_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$uid, $title, $desc === '' ? null : $desc, parseDue($input['dueDate'] ?? null), $status]);

            http_response_code(201);
            echo json_encode(toTask(findTask($pdo, (int)$pdo->lastInsertId(), $uid)));
            break;

        case 'PUT':
            if (!$id) fail(400, 'ID wajib diisi.');
            $old = findTask($pdo, $id, $uid);

            $title  = array_key_exists('title', $input)       ? trim($input['title'])       : $old['title'];
            $desc   = array_key_exists('description', $input) ? trim($input['description']) : ($old['description'] ?? '');
            $due    = array_key_exists('dueDate', $input)     ? parseDue($input['dueDate']) : $old['due_date'];
            $status = array_key_exists('status', $input)      ? $input['status']            : $old['status'];

            if (mb_strlen($title) < 3 || mb_strlen($title) > 80) fail(422, 'Nama tugas harus 3-80 karakter.');
            if (!in_array($status, ['active', 'completed'], true)) fail(422, 'Status tidak valid.');

            $stmt = $pdo->prepare('UPDATE tasks SET title=?, description=?, due_date=?, status=? WHERE id=? AND user_id=?');
            $stmt->execute([$title, $desc === '' ? null : $desc, $due, $status, $id, $uid]);

            echo json_encode(toTask(findTask($pdo, $id, $uid)));
            break;

        case 'DELETE':
            if (!$id) fail(400, 'ID wajib diisi.');
            findTask($pdo, $id, $uid);
            $pdo->prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')->execute([$id, $uid]);
            echo json_encode(['message' => 'Tugas dihapus.']);
            break;

        default:
            fail(405, 'Method tidak diizinkan.');
    }
} catch (PDOException $e) {
    fail(500, 'Kesalahan database: ' . $e->getMessage());
}
