# 🚀 Deployment Guide - QR Attendance System

A complete, beginner-friendly guide to deploy your project online so anyone can access it!

---

## 📋 Table of Contents

1. [What is Deployment?](#what-is-deployment)
2. [Deployment Architecture](#deployment-architecture)
3. [Prerequisites](#prerequisites)
4. [Part 1: Deploy MongoDB (Database)](#part-1-deploy-mongodb-database)
5. [Part 2: Deploy Backend (Node.js/Express)](#part-2-deploy-backend-nodejs-express)
6. [Part 3: Deploy Frontend (React/Vite)](#part-3-deploy-frontend-react-vite)
7. [Part 4: Connect Everything Together](#part-4-connect-everything-together)
8. [Common Errors & Solutions](#common-errors--solutions)
9. [Testing Your Deployment](#testing-your-deployment)
10. [Maintenance Tips](#maintenance-tips)

---

## What is Deployment?

**Right now**: Your app runs on `localhost` (your computer only)

**After deployment**: Your app runs on the internet (anyone can access it!)

Think of it like this:
- **localhost** = Your personal notebook (only you can read it)
- **Deployed app** = A published book (everyone can read it)

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE INTERNET                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   │
│   │  FRONTEND   │ ───► │   BACKEND   │ ───► │  DATABASE   │   │
│   │  (Vercel)   │      │  (Render)   │      │  (MongoDB   │   │
│   │             │      │             │      │   Atlas)    │   │
│   │ React App   │      │ Express API │      │             │   │
│   │ yourapp.    │      │ yourapi.    │      │ cluster.    │   │
│   │ vercel.app  │      │ onrender.   │      │ mongodb.net │   │
│   │             │      │ com         │      │             │   │
│   └─────────────┘      └─────────────┘      └─────────────┘   │
│                                                                 │
│   User opens ──► Frontend ──► Calls API ──► Fetches Data       │
│   website         loads       on Backend    from MongoDB        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**We deploy 3 things separately:**
1. **Database** (MongoDB Atlas) - Stores all data
2. **Backend** (Render/Railway) - API server
3. **Frontend** (Vercel/Netlify) - User interface

---

## Prerequisites

Before starting, make sure you have:

- [ ] GitHub account with your code pushed
- [ ] Project working locally (`npm run dev` works)
- [ ] A valid email address
- [ ] 30-60 minutes of time

---

## Part 1: Deploy MongoDB (Database)

We'll use **MongoDB Atlas** (free tier available!)

### Step 1: Create MongoDB Atlas Account

1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"**
3. Sign up with Google or Email
4. Verify your email

### Step 2: Create a Cluster

1. After login, click **"Build a Database"**
2. Choose **"FREE" (M0 Sandbox)** - It's free forever!
3. Select a cloud provider (any works, I recommend **AWS**)
4. Select region **closest to you** (e.g., Mumbai for India)
5. Cluster name: `qr-attendance` (or anything you like)
6. Click **"Create Cluster"** (takes 1-3 minutes)

### Step 3: Set Up Database Access

1. In left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Fill in:
   - Username: `admin` (or your choice)
   - Password: Click **"Autogenerate Secure Password"**
   - ⚠️ **SAVE THIS PASSWORD SOMEWHERE!** You'll need it!
4. Database User Privileges: **"Read and write to any database"**
5. Click **"Add User"**

### Step 4: Set Up Network Access

1. In left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
   - ⚠️ For production, you'd limit this, but for learning it's fine
4. Click **"Confirm"**

### Step 5: Get Your Connection String

1. Go back to **"Database"** in sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add database name before `?`:
   ```
   mongodb+srv://admin:YourPassword123@cluster0.xxxxx.mongodb.net/qr-attendance?retryWrites=true&w=majority
   ```

**Save this connection string! You'll need it for backend deployment.**

---

## Part 2: Deploy Backend (Node.js/Express)

We'll use **Render** (free tier, no credit card!)

### Step 1: Prepare Your Backend

Make sure your `server/package.json` has a start script:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended - easier deployment!)
4. Authorize Render to access your repos

### Step 3: Create a Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. If you don't see your repo, click **"Configure account"** and give access
4. Select your `qr-attendance-system` repo
5. Fill in the details:

| Setting | Value |
|---------|-------|
| **Name** | `qr-attendance-api` |
| **Region** | Closest to you (Singapore for India) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### Step 4: Add Environment Variables

Scroll down to **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `MONGO_URI` | Your MongoDB connection string from Part 1 |
| `JWT_SECRET` | Any random string (e.g., `mysupersecretkey123xyz`) |
| `JWT_EXPIRE` | `30d` |
| `FRONTEND_URL` | Leave empty for now (we'll update later) |
| `NODE_ENV` | `production` |

### Step 5: Deploy!

1. Click **"Create Web Service"**
2. Wait for deployment (3-5 minutes)
3. Watch the logs for any errors
4. When you see "Server running on port 10000", it's working!
5. Your API URL will be something like: `https://qr-attendance-api.onrender.com`

### Step 6: Test Your API

Open in browser: `https://your-api-url.onrender.com/api/health`

You should see:
```json
{"success":true,"message":"QR Attendance API is running"}
```

**🎉 Backend deployed!**

---

## Part 3: Deploy Frontend (React/Vite)

We'll use **Vercel** (best for React, super fast!)

### Step 1: Prepare Your Frontend

Make sure `client/.env` or `client/.env.production` exists with:
```
VITE_API_URL=https://your-render-api-url.onrender.com/api
```

⚠️ **Important**: Vercel uses `.env.production` for production builds!

### Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with **GitHub** (same as Render)
4. Authorize Vercel

### Step 3: Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository
3. Configure the project:

| Setting | Value |
|---------|-------|
| **Project Name** | `qr-attendance` |
| **Framework Preset** | `Vite` |
| **Root Directory** | Click "Edit" → select `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://your-render-api-url.onrender.com/api` |

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 1-2 minutes
3. You'll get a URL like: `https://qr-attendance.vercel.app`

**🎉 Frontend deployed!**

---

## Part 4: Connect Everything Together

### Update Backend with Frontend URL

1. Go back to **Render Dashboard**
2. Select your web service
3. Go to **"Environment"** tab
4. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://qr-attendance.vercel.app
   ```
5. Click **"Save Changes"**
6. The service will auto-redeploy

### Update Frontend with Correct API URL

If you haven't already:

1. Go to **Vercel Dashboard**
2. Select your project → **"Settings"** → **"Environment Variables"**
3. Make sure `VITE_API_URL` points to your Render URL
4. Redeploy: **"Deployments"** → Click **"..."** on latest → **"Redeploy"**

### Test Everything!

1. Open your frontend URL
2. Try to register/login
3. Create a session
4. Everything should work!

---

## Common Errors & Solutions

### 🔴 Error 1: "Application Error" on Render

**What you see:**
```
Application error: An error occurred in the application.
```

**Causes & Fixes:**

1. **Build failed** - Check build logs
   ```
   # Common fix: Make sure package.json is correct
   "main": "server.js",
   "scripts": {
     "start": "node server.js"
   }
   ```

2. **Wrong Root Directory** - Should be `server`, not project root

3. **Missing environment variables** - Check all are set in Render

---

### 🔴 Error 2: "CORS Error" in Browser Console

**What you see:**
```
Access to fetch at 'https://api...' from origin 'https://frontend...' 
has been blocked by CORS policy
```

**Fix:**
Make sure your server has CORS configured correctly:

```javascript
// server.js
import cors from 'cors';

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
```

Also check `FRONTEND_URL` is set correctly in Render.

---

### 🔴 Error 3: "MongoNetworkError" or "Connection Refused"

**What you see:**
```
MongoNetworkError: failed to connect to server
```

**Fixes:**

1. **Check MONGO_URI** - Make sure password has no special characters that need encoding
   - If password has `@` or `#`, URL encode it
   - `@` becomes `%40`
   - `#` becomes `%23`

2. **IP Whitelist** - Make sure "Allow from Anywhere" is set in MongoDB Atlas Network Access

3. **Wrong database name** - Make sure `/qr-attendance` is in the URI before `?`

---

### 🔴 Error 4: "502 Bad Gateway" on Render

**What you see:**
```
502 Bad Gateway
```

**Fixes:**

1. **App crashed** - Check logs for errors
2. **Port issue** - Make sure you're using:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```
3. **Health check failing** - Add a health endpoint:
   ```javascript
   app.get('/api/health', (req, res) => {
     res.json({ success: true });
   });
   ```

---

### 🔴 Error 5: "Failed to Fetch" on Frontend

**What you see:**
- Login/Register not working
- Network error in console

**Fixes:**

1. **API URL wrong** - Check `VITE_API_URL` in Vercel
   - Should end with `/api` (e.g., `https://xxx.onrender.com/api`)
   - NO trailing slash!

2. **Backend sleeping** - Free Render instances sleep after 15 mins
   - First request wakes it up (takes 30-60 seconds)
   - Just wait and retry!

3. **HTTPS mismatch** - Both frontend and backend must use HTTPS

---

### 🔴 Error 6: "Environment Variable Undefined"

**What you see:**
```
TypeError: Cannot read property 'xxx' of undefined
```

**Fixes:**

1. **Vite requires `VITE_` prefix**
   - ❌ `API_URL=xxx`
   - ✅ `VITE_API_URL=xxx`

2. **Need to redeploy after adding env vars** on Vercel

3. **Access in code correctly:**
   ```javascript
   const apiUrl = import.meta.env.VITE_API_URL;
   ```

---

### 🔴 Error 7: "Module Not Found" During Build

**What you see:**
```
Error: Cannot find module 'xxx'
```

**Fixes:**

1. **Dependency not in package.json** - Run locally:
   ```bash
   npm install missing-package
   ```
   Then push to GitHub.

2. **Case sensitivity** - Linux is case-sensitive!
   - ❌ `import Component from './component'`
   - ✅ `import Component from './Component'`

---

### 🔴 Error 8: "Render Free Instance Sleeping"

**What happens:**
- API takes 30-60 seconds to respond
- First request after inactivity is slow

**Why:**
Free Render instances sleep after 15 minutes of no traffic.

**Solutions:**

1. **Just wait** - First request wakes it up
2. **Upgrade to paid** - $7/month for always-on
3. **Use a pinger service** - Like [UptimeRobot](https://uptimerobot.com) to ping your API every 14 minutes

---

### 🔴 Error 9: "Build Exceeded Memory Limit"

**What you see:**
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Fixes:**

Add to environment variables:
```
NODE_OPTIONS=--max_old_space_size=512
```

---

### 🔴 Error 10: "Vercel 404 on Page Refresh"

**What happens:**
- Direct URL like `/admin/dashboard` shows 404
- But navigating from home page works

**Fix:**
Create `client/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This tells Vercel to serve `index.html` for all routes (SPA routing).

---

## Testing Your Deployment

### Deployment Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Can see login page
- [ ] API health check works: `https://your-api.onrender.com/api/health`
- [ ] Can register a new user
- [ ] Can login
- [ ] Can create a session
- [ ] QR code displays
- [ ] Can scan QR and mark attendance
- [ ] Data persists after refresh

### Browser DevTools Check

1. Open your deployed frontend
2. Press `F12` to open DevTools
3. Go to **Console** tab - should be no red errors
4. Go to **Network** tab - API calls should show 200 status

---

## Maintenance Tips

### 1. Viewing Logs

**Render:**
- Go to your service → **"Logs"** tab

**Vercel:**
- Go to your project → **"Deployments"** → Click deployment → **"Functions"**

### 2. Updating Your App

```bash
# Make changes locally
# Test locally
# Then:
git add .
git commit -m "Your update message"
git push origin main

# Both Vercel and Render will auto-deploy!
```

### 3. Custom Domain (Optional)

**Vercel:**
1. Go to Project → **"Settings"** → **"Domains"**
2. Add your domain
3. Update DNS records as instructed

**Render:**
1. Go to Service → **"Settings"** → **"Custom Domains"**
2. Add domain and configure DNS

### 4. Monitoring Free Tier Limits

| Service | Free Limit |
|---------|------------|
| **MongoDB Atlas** | 512 MB storage |
| **Render** | 750 hours/month, sleeps after 15 min |
| **Vercel** | 100 GB bandwidth, unlimited deploys |

---

## Quick Reference

### URLs After Deployment

| Service | URL Pattern |
|---------|-------------|
| Frontend | `https://your-app.vercel.app` |
| Backend | `https://your-api.onrender.com` |
| Database | `mongodb+srv://...mongodb.net` |

### Environment Variables Summary

**Backend (Render):**
```
PORT=10000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Frontend (Vercel):**
```
VITE_API_URL=https://your-api.onrender.com/api
```

---

## 🎉 Congratulations!

You've deployed a full-stack MERN application! This is a real-world skill used by professional developers.

**What you learned:**
- Cloud database hosting (MongoDB Atlas)
- Backend deployment (Render)
- Frontend deployment (Vercel)
- Environment variables management
- Debugging deployment issues

---

*Happy Deploying! 🚀*
