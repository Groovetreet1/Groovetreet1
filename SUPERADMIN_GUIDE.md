# Dashboard SuperAdmin - Guide d'utilisation

## Objectif
Le dashboard SuperAdmin permet de lier des comptes administrateurs à des comptes destinataires (méthodes de dépôt) pour isoler les transactions. Chaque admin ne verra que les dépôts liés aux comptes destinataires qui lui sont assignés.

## Accès
- URL: `http://localhost:5174/superadmin` (ou le port de votre frontend)
- Réservé aux utilisateurs avec le rôle `superadmin`

## Fonctionnalités

### 1. Lier un Admin à un Compte Destinataire
1. Dans la section "Lier un Admin à un Compte Destinataire"
2. Sélectionnez un admin dans la liste déroulante
3. Sélectionnez une méthode de dépôt (compte destinataire)
4. Cliquez sur "Ajouter Liaison"

### 2. Voir les Liaisons Actuelles
La table "Liaisons Actuelles" affiche toutes les associations entre admins et comptes destinataires:
- Email de l'admin
- ID du compte géré
- Type de compte (deposit_method)
- Bouton "Supprimer" pour retirer une liaison

### 3. Supprimer une Liaison
Cliquez sur "Supprimer" dans la ligne correspondante et confirmez.

## Comment ça fonctionne

### Backend
- **Table `admin_managed_accounts`**: Stocke les liens entre admins et comptes
  - `admin_id`: ID de l'utilisateur admin
  - `account_type`: Type de compte (actuellement "deposit_method")
  - `account_id`: ID de la méthode de dépôt

### Endpoints API
- `GET /api/admin/all-users`: Liste tous les utilisateurs (superadmin uniquement)
- `GET /api/admin/managed-accounts`: Liste toutes les liaisons
- `POST /api/admin/managed-accounts`: Créer une nouvelle liaison
  ```json
  {
    "adminId": 123,
    "accountId": 456,
    "accountType": "deposit_method"
  }
  ```
- `DELETE /api/admin/managed-accounts/:id`: Supprimer une liaison

### Filtrage des Dépôts
Lorsqu'un admin consulte `/api/admin/deposits`:
- **Sans liaison**: Il voit les dépôts PENDING + ceux qu'il a traités (`processed_by_admin_id`)
- **Avec liaison**: Il voit AUSSI les dépôts dont le `method_id` correspond aux comptes qui lui sont assignés
- **SuperAdmin avec `?all=1`**: Voit tous les dépôts (comportement global)

## Exemple d'utilisation

### Scénario
Vous avez:
- Admin A (ID: 100)
- Admin B (ID: 101)
- Compte destinataire 1 (ID: 1)
- Compte destinataire 2 (ID: 2)

### Configuration
1. Liez Admin A au Compte 1
2. Liez Admin B au Compte 2

### Résultat
- Admin A ne verra que les dépôts faits vers le Compte 1 (+ PENDING + ceux qu'il a approuvés)
- Admin B ne verra que les dépôts faits vers le Compte 2 (+ PENDING + ceux qu'il a approuvés)
- Les transactions sont isolées par admin selon les comptes destinataires

## Navigation
Pour accéder au dashboard depuis l'interface:
1. Connectez-vous avec un compte superadmin
2. Naviguez vers `/superadmin`

## Notes techniques
- La table `admin_managed_accounts` est créée automatiquement au premier appel
- La contrainte UNIQUE empêche les doublons (admin_id, account_type, account_id)
- Seuls les superadmins peuvent gérer ces liaisons
- Les admins standard voient automatiquement le filtrage appliqué
