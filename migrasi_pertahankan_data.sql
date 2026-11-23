USE taskly;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks ADD COLUMN user_id INT UNSIGNED NULL AFTER id;
ALTER TABLE tasks ADD INDEX idx_tasks_user (user_id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- LANGKAH BERIKUTNYA (setelah register akun pertamamu lewat website):
-- tugas lama belum punya pemilik, jadi tidak akan tampil. Berikan ke akunmu (id = 1):
-- UPDATE tasks SET user_id = 1 WHERE user_id IS NULL;
