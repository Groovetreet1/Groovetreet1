-- Add admin tracking to deposits and withdrawals
ALTER TABLE `deposits` ADD COLUMN `processed_by` INT NULL;
ALTER TABLE `withdrawals` ADD COLUMN `processed_by` INT NULL;

-- Create a table to log admin actions like manual balance updates
CREATE TABLE IF NOT EXISTS `admin_actions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `admin_id` INT NOT NULL,
    `action_type` VARCHAR(50) NOT NULL, -- e.g., 'manual_balance_update', 'user_role_change'
    `target_user_id` INT NULL,
    `amount_cents` INT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`)
);
