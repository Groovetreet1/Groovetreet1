-- Migration complète à jour pour Promo App (MySQL)
-- Date: 11 décembre 2025

CREATE DATABASE IF NOT EXISTS promo_app DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE promo_app;

-- ===========================
-- TABLE: users
-- ===========================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  vip_level VARCHAR(20) NOT NULL DEFAULT 'FREE',
  vip_expires_at DATETIME NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  promo_role_enabled TINYINT(1) NOT NULL DEFAULT 0,
  balance_cents INT NOT NULL DEFAULT 0,
  invite_code VARCHAR(32) UNIQUE,
  invited_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_invited_by (invited_by_user_id)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: tasks
-- ===========================
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

-- ===========================
-- TABLE: deposit_methods
-- ===========================
CREATE TABLE IF NOT EXISTS deposit_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: deposits
-- ===========================
CREATE TABLE IF NOT EXISTS deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_cents INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  full_name VARCHAR(255),
  method_id INT NULL,
  processed_by_admin_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (method_id) REFERENCES deposit_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: withdrawals
-- ===========================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount_cents INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'WITHDRAW',
  processed_by_admin_id INT NULL,
  processed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: task_completions
-- ===========================
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

-- ===========================
-- TABLE: bank_accounts
-- ===========================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bank_name VARCHAR(255),
  iban VARCHAR(255),
  holder_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: promo_role_keys
-- ===========================
CREATE TABLE IF NOT EXISTS promo_role_keys (
  id INT PRIMARY KEY,
  secret_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: promo_codes
-- ===========================
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  amount_cents INT NOT NULL,
  created_by_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_by_user_id INT NULL,
  used_at TIMESTAMP NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: promo_code_uses
-- ===========================
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promo_code_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_code_user (promo_code_id, user_id),
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: referrals
-- ===========================
CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_user_id INT NOT NULL,
  invited_user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: referral_bonuses
-- ===========================
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

-- ===========================
-- TABLE: admin_actions
-- ===========================
CREATE TABLE IF NOT EXISTS admin_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id INT NULL,
  amount_cents INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: admin_managed_accounts
-- ===========================
CREATE TABLE IF NOT EXISTS admin_managed_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'deposit_method',
  account_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_account (account_type, account_id),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin (admin_id),
  INDEX idx_account (account_type, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- TABLE: role_change_logs
-- ===========================
CREATE TABLE IF NOT EXISTS role_change_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_user_id INT NOT NULL,
  changed_by_user_id INT NOT NULL,
  old_role VARCHAR(20) NOT NULL,
  new_role VARCHAR(20) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================
-- SAMPLE DATA: tasks
-- ===========================
INSERT INTO tasks (title, description, reward_cents, duration_seconds, min_vip_level, video_url)
VALUES
  ('Regarder vidéo promo 1', 'Regarde la vidéo pendant au moins 15 secondes.', 200, 15, 'FREE', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('Regarder vidéo promo 2', 'Regarde la vidéo pendant au moins 15 secondes.', 500, 15, 'FREE', 'https://www.youtube.com/watch?v=sOCKUCvEHWM')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ===========================
-- NOTES:
-- ===========================
-- 1. La table admin_managed_accounts lie chaque compte destinataire à UN SEUL admin
-- 2. La contrainte UNIQUE sur (account_type, account_id) empêche plusieurs admins de gérer le même compte
-- 3. Les dépôts sont auto-assignés à l'admin du compte destinataire choisi via method_id
-- 4. Le champ is_active dans deposit_methods permet d'activer/désactiver les comptes
-- 5. La table role_change_logs trace tous les changements de rôles utilisateurs
