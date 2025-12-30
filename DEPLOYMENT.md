# 🚀 Deployment Guide

This guide walks you through deploying the **MNIT Attendance System** with:
- **Backend** → [Render](https://render.com)
- **Frontend** → [Vercel](https://vercel.com)

---

## 📋 Prerequisites

Before deploying, make sure you have:
- A [GitHub](https://github.com) account with your code pushed
- A [Render](https://render.com) account (free tier available)
- A [Vercel](https://vercel.com) account (free tier available)
- Your MongoDB Atlas connection string ready

---

## 🖥️ Backend Deployment (Render)

### Step 1: Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing your project

### Step 2: Configure the Service

| Setting | Value |
|---------|-------|
| **Name** | `mnit-attendance-api` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |

### Step 3: Add Environment Variables

Click **"Environment"** and add these variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-url.vercel.app

# Admin Credentials
ADMIN_EMAIL=admin@classcheck.com
ADMIN_PASSWORD=Admin@123

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
```

> ⚠️ **Important:** Update `FRONTEND_URL` after deploying the frontend on Vercel!

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for the build to complete (usually 2-5 minutes)
3. Copy your backend URL (e.g., `https://mnit-attendance-api.onrender.com`)

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository

### Step 2: Configure the Project

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Step 3: Add Environment Variables

Add these environment variables:

```env
VITE_API_URL=https://your-render-backend-url.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

> 📝 Replace `your-render-backend-url` with your actual Render URL from the backend deployment.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your frontend is now live! 🎉

---

## 🔄 Post-Deployment Steps

### 1. Update Backend FRONTEND_URL

Go back to Render and update the `FRONTEND_URL` environment variable with your Vercel URL:
```
FRONTEND_URL=https://your-app.vercel.app
```

### 2. Update Google OAuth Authorized URLs

In [Google Cloud Console](https://console.cloud.google.com):

1. Navigate to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - `https://your-app.vercel.app`
4. Add to **Authorized redirect URIs**:
   - `https://your-app.vercel.app`
   - `https://your-render-backend.onrender.com/api/auth/google/callback`

### 3. Test Your Deployment

- Visit your Vercel URL
- Try logging in with admin credentials
- Test Google OAuth login
- Verify attendance features work correctly

---

## 🔧 Troubleshooting

### Backend Issues

| Problem | Solution |
|---------|----------|
| MongoDB connection fails | Verify `MONGODB_URI` and whitelist Render IPs in MongoDB Atlas (or use `0.0.0.0/0` for all IPs) |
| CORS errors | Ensure `FRONTEND_URL` matches your Vercel URL exactly |
| Build fails | Check Node version compatibility in `package.json` |

### Frontend Issues

| Problem | Solution |
|---------|----------|
| API calls fail | Verify `VITE_API_URL` points to your Render backend |
| Blank page | Check browser console for errors, ensure build succeeded |
| Google login fails | Update authorized origins in Google Cloud Console |

---

## 📊 Monitoring

### Render
- View logs in the **Logs** tab of your service
- Monitor performance in the **Metrics** tab

### Vercel
- View build logs in the **Deployments** tab
- Check analytics in the **Analytics** tab (Pro plan)

---

## 🔄 Automatic Deployments

Both Render and Vercel support **automatic deployments** when you push to your main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Your changes will automatically deploy to both platforms! 🚀

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Render/Vercel documentation
3. Open an issue on the GitHub repository

Happy deploying! 🎊
