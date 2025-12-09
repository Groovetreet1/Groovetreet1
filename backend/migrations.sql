-- Migrations for Promo App (MySQL)

CREATE DATABASE IF NOT EXISTS promo_app DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE promo_app;

-- users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  vip_level VARCHAR(20) NOT NULL DEFAULT 'FREE',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  balance_cents INT NOT NULL DEFAULT 0,
  invite_code VARCHAR(32) UNIQUE,
  invited_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_invited_by (invited_by_user_id)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8mb4;

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_cents INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 15,
  min_vip_level VARCHAR(20) DEFAULT 'FREE',
  video_url VARCHAR(512),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- deposits
CREATE TABLE IF NOT EXISTS deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_cents INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_cents INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'WITHDRAW',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- task completions history
CREATE TABLE IF NOT EXISTS task_completions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT NOT NULL,
  reward_cents INT NOT NULL,
  balance_before_cents INT NOT NULL,
  balance_after_cents INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bank_name VARCHAR(255),
  iban VARCHAR(255),
  holder_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- referrals: who invited whom
CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_user_id INT NOT NULL,
  invited_user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- referral bonuses per approved deposit (10% of deposit amount)
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deposit_id INT NOT NULL UNIQUE,
  inviter_user_id INT NOT NULL,
  invited_user_id INT NOT NULL,
  bonus_cents INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample tasks (idempotent inserts)
INSERT INTO tasks (title, description, reward_cents, duration_seconds, min_vip_level, video_url)
VALUES
  ('Regarder vidéo promo 1', 'Regarde la vidéo pendant au moins 15 secondes.', 200, 15, 'FREE', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('Regarder vidéo promo 2', 'Regarde la vidéo pendant au moins 15 secondes.', 500, 15, 'FREE', 'https://www.youtube.com/watch?v=sOCKUCvEHWM')
ON DUPLICATE KEY UPDATE title = VALUES(title);
