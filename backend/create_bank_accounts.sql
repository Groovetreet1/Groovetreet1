CREATE DATABASE IF NOT EXISTS promo_app DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE promo_app;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bank_name VARCHAR(255),
  iban VARCHAR(255),
  holder_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- No FOREIGN KEY here to avoid FK mismatch errors during creation
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
