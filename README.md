# Employee Tracking System

Full-stack project with:
- Android app for employees (check-in/check-out)
- Web admin dashboard
- Backend REST API

## Features

### Android Employee App
- Check In / Check Out actions
- Captures:
  - Employee ID
  - GPS coordinates
  - Device name
  - Login/Logout timestamps (stored server-side)

### Web Admin Panel
- Admin login
- Employee CRUD + activate/deactivate
- Attendance sessions table
- Dashboard summary cards
- Date range filtering

### Backend API
- JWT admin auth
- Employee and attendance APIs
- File-based persistence: `backend/data/db.json`

## Local Run

### 1) Backend
PowerShell:
```powershell
cd backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

### 2) Web Admin
```powershell
cd web-admin
# simple static hosting via node script
node dev-server.mjs
```
Open: `http://localhost:3000`

### 3) Android App
Open `android-app` in Android Studio and run.

Default backend URL in app:
- Emulator: `http://10.0.2.2:4000/api`

## Make It Live

## Admin Dashboard on GitHub Pages

A workflow is already included:
- `.github/workflows/deploy-admin-pages.yml`

It deploys `web-admin/` to GitHub Pages on every push to `main`.

Before deploy, set your production backend URL in:
- `web-admin/runtime-config.js`

Example:
```js
window.RUNTIME_CONFIG = {
  API_BASE_URL: "https://your-backend-domain.com/api"
};
```

## Android APK / AAB via GitHub Actions

A workflow is included:
- `.github/workflows/build-android-artifacts.yml`

On push to `main`, it builds:
- Debug APK (signed with debug key)
- Unsigned Release APK
- Signed Release AAB (only if signing secrets are configured)

Artifacts can be downloaded from the workflow run page in GitHub Actions.

### Required secrets for Signed Release AAB
Set these in GitHub repo -> Settings -> Secrets and variables -> Actions:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

`ANDROID_KEYSTORE_BASE64` is your `.jks` file encoded as base64.

## GitHub Push (if repo not initialized yet)

```powershell
cd C:\Users\ADMIN\Desktop\cure
git init
git add .
git commit -m "Initial employee tracking system"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then in GitHub:
1. Go to **Settings -> Pages**
2. Under **Build and deployment**, choose **GitHub Actions**
3. Push again (or run workflow manually)

## Default Admin Credentials
- Username: `admin`
- Password: `Admin@123`

## Important Production Note
GitHub Pages hosts only the admin frontend. You also need the backend API hosted publicly (Render/Railway/VPS), and then set that API URL in `web-admin/runtime-config.js`.
