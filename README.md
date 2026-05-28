# Task Manager (Django + DRF + JWT + Vanilla JS)

Clean, responsive, Kanban-style task manager with three stages: **Todo**, **In Progress**, **Done**.

## Tech stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Django, Django REST Framework, JWT (SimpleJWT)
- **Database**: PostgreSQL (Neon/Supabase compatible via `DATABASE_URL`)

## Features
- **Auth**: Register, Login, Logout (JWT stored in `localStorage`)
- **Tasks**: Create, Edit, Delete, Move between columns
- **Bonus**: Drag & drop between columns, Search, Filter by status, Dark mode toggle

## API Endpoints
Base: `http://127.0.0.1:8000/api`

- `POST /api/register/`  
  Body: `{ "username": "...", "email": "...", "password": "..." }`
- `POST /api/login/`  
  Body: `{ "username": "...", "password": "..." }`  
  Returns: `{ "access": "...", "refresh": "..." }`
- `GET /api/tasks/`
- `POST /api/tasks/`
- `PUT /api/tasks/<id>/`
- `DELETE /api/tasks/<id>/`

## Local setup (Windows)

### 1) Backend
From repo root:

```bash
pip install -r requirements.txt
copy .env.example .env
cd backend
python manage.py migrate
python manage.py runserver 8000
```

Backend runs at `http://127.0.0.1:8000`.

### 2) Frontend
Open the `frontend` folder with any static server.

If you have VS Code: right click `frontend/index.html` → **Open with Live Server**.

Frontend typically runs at `http://127.0.0.1:5500` (or `http://localhost:5500`).

## Environment variables
Create `.env` in repo root (see `.env.example`):

- **DJANGO_SECRET_KEY**: secret key for production
- **DJANGO_DEBUG**: `1` for dev, `0` for production
- **DJANGO_ALLOWED_HOSTS**: comma-separated hosts (Render: set `*` or your Render domain)
- **DATABASE_URL**: Postgres connection string from Neon/Supabase
- **FRONTEND_ORIGINS**: comma-separated allowed frontend origins (Netlify/Vercel URL + localhost)

## Assumptions
- JWT token is stored in `localStorage` for simplicity (beginner-friendly). In higher-security setups, you may prefer **HttpOnly cookies**.
- Tasks are scoped per user (you can only view/update/delete your own tasks).

## Tradeoffs
- Using **single-file vanilla JS** keeps the app simple and easy to read, but it’s not as scalable as a component framework.
- Using `PUT` for updates sends full task payload (simplifies backend). You can switch to `PATCH` later for partial updates.

## Deployment (recommended)

### Database (Neon or Supabase)
Create a Postgres database and copy the **connection string** into Render as `DATABASE_URL`.

### Backend (Render)
- Deploy the `backend/` service
- Set env vars on Render:
  - `DJANGO_SECRET_KEY`
  - `DJANGO_DEBUG=0`
  - `DJANGO_ALLOWED_HOSTS=<your-render-domain>`
  - `DATABASE_URL=<your-postgres-url>`
  - `FRONTEND_ORIGINS=<your-netlify-or-vercel-url>`

Start command: `gunicorn config.wsgi:application`

### Frontend (Netlify or Vercel)
Deploy the `frontend/` directory as a static site.

If your backend URL changes, update it in `frontend/script.js` by changing:
- `CONFIG.API_BASE`

## Deployment links
- **Frontend**: https://task-manager-app3.netlify.app/
- **Backend**: https://task-manager-app-31jm.onrender.com/api/login/

