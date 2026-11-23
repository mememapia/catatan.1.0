# Taskly - versi login & register

## Pasang
1. Start Apache + MySQL (XAMPP / Laragon).
2. Jalankan `database.sql` di phpMyAdmin (tab SQL) atau HeidiSQL (tab Query).
   (Ini menghapus tabel lama. Untuk mempertahankan tugas lama, pakai `migrasi_pertahankan_data.sql`.)
3. Taruh folder ini di `htdocs` (XAMPP) atau `www` (Laragon).
4. Buka `http://localhost/taskly/login.html`, klik Daftar, lalu masuk.

## Struktur
api/config.php   koneksi database
api/session.php  session + pengaman (requireLogin)
api/auth.php     register, login, logout, me
api/tasks.php    CRUD tugas (hanya milik user yang login)
login.html, register.html, auth.js, auth.css
index.html, script.js, style.css   aplikasi utama
