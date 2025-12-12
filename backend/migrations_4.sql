-- Migration: Ajouter contrainte UNIQUE pour un seul admin par compte destinataire
-- Cette contrainte garantit qu'un compte destinataire (deposit_method) ne peut être assigné qu'à un seul admin

-- D'abord supprimer l'ancienne contrainte UNIQUE si elle existe
ALTER TABLE admin_managed_accounts DROP INDEX IF EXISTS unique_admin_account;

-- Ajouter la nouvelle contrainte UNIQUE sur account_type et account_id
-- Cela permet qu'un compte ne soit géré que par un seul admin à la fois
ALTER TABLE admin_managed_accounts 
ADD UNIQUE KEY unique_account (account_type, account_id);

-- Note: L'ancienne contrainte UNIQUE (admin_id, account_type, account_id) permettait
-- à plusieurs admins de gérer le même compte, ce qui causait des conflits lors de
-- l'auto-assignation des dépôts.
