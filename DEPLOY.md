# Deployment Guide — Task Manager

Deploy in this order: **Database → Backend → Frontend**

---

## Step 1: Push code to GitHub

1. Create a repo at https://github.com/new (name: `task-manager`)
2. In PowerShell:

```powershell
cd c:\Users\lenovo\Desktop\assesment1
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/task-manager.git
git push -u origin main
```

---

## Step 2: Database (Neon — recommended)

1. Go to https://neon.tech and sign up (free)
2. Click **New Project** → name it `task-manager`
3. Open **Dashboard** → **Connection details**
4. Copy the **connection string** (must include `?sslmode=require`)

Example:
```
postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

Save this — you will paste it as `DATABASE_URL` on Render.

### Alternative: Supabase

1. https://supabase.com → New project
2. **Project Settings** → **Database** → **Connection string** (URI)
3. Use the **Session mode** or **Transaction mode** pooler URL for server apps

---

## Step 3: Backend (Render)

1. Go to https://render.com and sign up
2. **New +** → **Web Service**
3. Connect your GitHub repo `task-manager`
4. Settings:

| Setting | Value |
|--------|--------|
| **Name** | `task-manager-api` (note the URL) |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r ../requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
| **Start Command** | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |
| **Instance type** | Free |

5. **Environment Variables** (add all):

| Key | Value |
|-----|--------|
| `DJANGO_SECRET_KEY` | Generate: run `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG` | `0` |
| `DJANGO_ALLOWED_HOSTS` | `.onrender.com` |
| `DATABASE_URL` | Your Neon/Supabase connection string |
| `FRONTEND_ORIGINS` | Leave empty for now — add after Step 4 |

6. Click **Create Web Service** and wait for deploy (5–10 min first time)

7. Test backend:
   - Open `https://YOUR-SERVICE.onrender.com/api/login/` in browser
   - You should see a DRF page or JSON response (not a 500 error)

**Your backend URL:** `https://task-manager-api.onrender.com`  
**API base:** `https://task-manager-api.onrender.com/api`

> Free Render services sleep after ~15 min idle. First request may take 30–60 seconds.

---

## Step 4: Frontend (Netlify)

### A) Set API URL

1. Open `frontend/config.js`
2. Set your Render API URL:

```javascript
window.TM_API_BASE = "https://task-manager-api.onrender.com/api";
```

Replace with your actual Render service name.

3. Commit and push:

```powershell
cd c:\Users\lenovo\Desktop\assesment1
git add frontend/config.js
git commit -m "Set production API URL"
git push
```

### B) Deploy on Netlify

1. Go to https://app.netlify.com
2. **Add new site** → **Import an existing project** → **GitHub**
3. Select repo `task-manager`
4. Settings:

| Setting | Value |
|--------|--------|
| **Base directory** | `frontend` |
| **Build command** | (leave empty) |
| **Publish directory** | `frontend` |

5. Click **Deploy site**

6. Copy your Netlify URL, e.g. `https://random-name-123.netlify.app`

### C) Update CORS on Render

1. Render dashboard → your web service → **Environment**
2. Set `FRONTEND_ORIGINS` to your Netlify URL (no trailing slash):

```
https://random-name-123.netlify.app
```

3. **Save** — Render will redeploy automatically

---

## Step 5: Verify everything works

1. Open your Netlify URL
2. Go to **Register** → create account
3. Open **Dashboard** → add a task, drag between columns
4. If errors, open browser **DevTools → Console** and **Network** tab

### Common fixes

| Problem | Fix |
|--------|-----|
| CORS error | `FRONTEND_ORIGINS` must exactly match Netlify URL (`https://...`) |
| Network error / failed fetch | Check `config.js` API URL ends with `/api` |
| 502 / slow first load | Render free tier waking up — wait 60s and retry |
| Database error on Render | Ensure `DATABASE_URL` has `?sslmode=require` (Neon) |
| 400 on register | Username taken or password &lt; 8 characters |

---

## Optional: Custom domain

- **Netlify:** Domain settings → add custom domain
- **Render:** Settings → Custom Domains
- Update `FRONTEND_ORIGINS` and `config.js` with new URLs

---

## Deployment checklist

- [ ] GitHub repo pushed
- [ ] Neon/Supabase database created
- [ ] Render backend live
- [ ] `frontend/config.js` updated with Render `/api` URL
- [ ] Netlify frontend live
- [ ] `FRONTEND_ORIGINS` set on Render
- [ ] Register + login + tasks tested on live site

---

## Your live links (fill in after deploy)

| Service | URL |
|---------|-----|
| Frontend | |
| Backend | |
| Database | Neon/Supabase dashboard |
