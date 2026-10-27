# Hostinger Business Web Hosting Deployment Guide for bizaikit.com

This guide provides instructions for deploying the **Bizaikit School Management System** on Hostinger Business Web Hosting using a Node.js runtime and your custom domain `bizaikit.com`.

---

## 1. Prerequisites on Hostinger

- **Hosting Plan:** Hostinger Business Web Hosting (includes Node.js application support and SSH access).
- **Domain:** `bizaikit.com` pointing to Hostinger nameservers / DNS.
- **Node.js Version:** Node.js v18.x, v20.x, or v22.x.

---

## 2. Directory Structure on Hostinger

Place your application files in your account's Node.js application root (e.g. `/home/u123456789/domains/bizaikit.com/public_html` or `/home/u123456789/node_apps/school-sms`):

```
bizaikit-sms/
├── data/
│   └── school.db         <-- Persistent SQLite database (auto-created on startup)
├── dist/                 <-- Built React client files (from npm run build)
├── server/
│   ├── auth.ts           <-- Role-based auth & JWT verification
│   ├── db.ts             <-- Database schema, WAL mode, migrations, seeding
│   └── routes/           <-- API endpoints (auth, dashboard, students, attendance, assessments, settings)
├── src/                  <-- React SPA source code
├── server.ts             <-- Main Express entry point
├── package.json
└── tsconfig.json
```

---

## 3. Hostinger hPanel Configuration

1. **Log in to Hostinger hPanel:**
   Navigate to **Websites** → Select **bizaikit.com** → Click **Manage**.

2. **Access Node.js Setup:**
   In the left sidebar or search bar, open **Advanced** → **Node.js**.

3. **Create New Node.js Application:**
   - **Node.js Version:** `v20.x` or `v22.x` (LTS recommended)
   - **Application Mode:** `Production`
   - **Application Root:** Choose the folder where your project files are placed (e.g. `public_html` or custom folder)
   - **Application Startup File:** `server.ts` (using tsx) or `dist/server.js` (if pre-compiled)
   - **Application URL:** `https://bizaikit.com`

4. **Environment Variables:**
   Under **Environment Variables** in Hostinger Node.js settings, add:
   ```env
   PORT=3000
   NODE_ENV=production
   APP_URL=https://bizaikit.com
   JWT_SECRET=bizaikit-prod-secret-99f82d1c7a8b4e6d3c2e1a
   ```

---

## 4. Build and Launch Commands

Using Hostinger's built-in **SSH Terminal** or the Node.js Console in hPanel:

```bash
# 1. Install production dependencies
npm install

# 2. Build the optimized React frontend
npm run build

# 3. Start the application
npm start
```

Your `package.json` contains:
```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "start": "tsx server.ts",
    "build": "vite build"
  }
}
```

When started, the Express server will:
1. Connect to `./data/school.db` (enabling SQLite WAL mode and foreign key integrity).
2. Automatically initialize database tables and seed initial administrator & sample data if first run.
3. Serve the built React static files from `./dist` for all web visitors.
4. Mount secure API routes under `/api/*`.

---

## 5. Domain & Free SSL Setup

1. In Hostinger hPanel, go to **Security** → **SSL**.
2. Click **Install Free SSL** for `bizaikit.com` and `www.bizaikit.com`.
3. Enable **Force HTTPS** to ensure all school attendance and marklist transactions are encrypted.

---

## 6. Default Login Credentials

After first launch, you can immediately log in with:

- **Super Administrator:**
  - Username: `admin`
  - Password: `Admin@123`
  - Full Name: Principal Sarah Jenkins

- **Teacher 1 (Mathematics):**
  - Username: `teacher.ahmed`
  - Password: `Teacher@123`
  - Assigned Classes: Grade 9-A, Grade 10-A

- **Teacher 2 (English):**
  - Username: `teacher.fatima`
  - Password: `Teacher@123`
  - Assigned Classes: Grade 9-A, Grade 9-B

*Note: Change the administrator password upon first deployment in the **System Administration** modal.*

---

## 7. Database Backups

- To take an instant backup, go to **System Administration** (gear icon in the top navigation) → **Hostinger & Deployment** → Click **Download Complete JSON Backup**.
- You can also copy `./data/school.db` at any time via Hostinger File Manager or automated daily backup tools.
