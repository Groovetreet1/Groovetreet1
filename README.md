# Groovetreet

A monorepo containing backend (Node.js/Express) and frontend (React/Vite) applications.

## Project Structure

```
├── backend/          # Express API server
│   ├── server.js     # Main server file
│   ├── db.js         # Database configuration
│   └── uploads/      # User uploaded files
├── frontend/         # React/Vite application
│   ├── src/          # Source files
│   └── dist/         # Built files (after build)
└── package.json      # Monorepo scripts
```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Set up environment variables:

**Backend** (`backend/.env`):

```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
PORT=4000
```

**Frontend** (`frontend/.env`):

```
VITE_API_URL=http://localhost:4000
```

3. Run migrations:

```bash
npm run migrate
```

4. Start development:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Digital Ocean Deployment

### App Platform Setup

1. Create a new App in Digital Ocean App Platform
2. Connect your GitHub repository
3. Configure as monorepo with two components:

**Backend (API)**:

- Source Directory: `/backend`
- Build Command: `npm install`
- Run Command: `npm start`
- HTTP Port: 4000

**Frontend (Static Site)**:

- Source Directory: `/frontend`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`

### Environment Variables

Set these in Digital Ocean App settings:

**Backend**:

- `DATABASE_URL` - Your managed PostgreSQL connection string
- `JWT_SECRET` - A secure random string
- `NODE_ENV` - `production`

**Frontend**:

- `VITE_API_URL` - Your backend API URL (e.g., `https://your-app.ondigitalocean.app/api`)

## Scripts

| Command                  | Description                   |
| ------------------------ | ----------------------------- |
| `npm run install:all`    | Install all dependencies      |
| `npm run dev:backend`    | Start backend in development  |
| `npm run dev:frontend`   | Start frontend in development |
| `npm run build:frontend` | Build frontend for production |
| `npm run start:backend`  | Start backend in production   |
| `npm run migrate`        | Run database migrations       |
