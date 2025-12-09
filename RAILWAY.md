# Déploiement Railway

L'app est prête pour Railway (API Node + base MySQL + frontend Vite).

## Variables d'env
- Backend (`backend/.env.example` comme référence) : `DATABASE_URL` (ou `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`), `JWT_SECRET`, `CORS_ORIGINS` (domaines front séparés par des virgules), `PORT` (Railway en fournit un), `DB_SSL=true` si Railway impose le SSL.
- Frontend (`frontend/.env.example`) : `VITE_API_BASE_URL` pointant vers l'URL publique du backend Railway (ex : `https://api-votreapp.up.railway.app`).

## Backend (API)
1) Crée un projet Railway et ajoute un service **MySQL**. Récupère la variable `DATABASE_URL`.
2) Ajoute un service **Web** basé sur ce repo et définis le **root** à `backend` (sinon Railway essaie d'installer à la racine).
3) Build command (par défaut) : `npm install`. Start command : `npm start` (port auto via `PORT`).
4) Variables à définir sur le service web : `DATABASE_URL` (celle du service MySQL), `JWT_SECRET` (aléatoire), `CORS_ORIGINS` (ton domaine frontend ou `http://localhost:5173` pour tester), éventuellement `DB_SSL=true`.
5) Migrations : depuis le shell Railway du service backend, lance `npm run migrate` après la première mise en ligne (ou ajoute-la en post-deploy si tu veux qu'elle tourne à chaque déploiement).

## Frontend (Vite)
Option A — service **Static** Railway :
- Root : `frontend`
- Build command : `npm install && npm run build`
- Output directory : `dist`
- Variables : `VITE_API_BASE_URL` pointant vers l'URL publique du backend.

Option B — service Node (preview) :
- Root : `frontend`
- Build command : `npm install`
- Start command : `npm run preview -- --host --port $PORT`
- Variable : `VITE_API_BASE_URL` idem ci-dessus.

Pense à mettre à jour `CORS_ORIGINS` côté backend avec l'URL finale du frontend pour autoriser les requêtes.
