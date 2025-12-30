# 🚀 Deployment Checklist - QR Attendance System v5.0

Use this checklist before deploying to production.

---

## 📋 Pre-Deployment Checks

### Environment Configuration
- [ ] Server `.env` file created from `.env.example`
- [ ] Client `.env` file created from `.env.example`
- [ ] `MONGODB_URI` set to production database
- [ ] `JWT_SECRET` is a strong, unique secret (32+ characters)
- [ ] `FRONTEND_URL` matches your Vercel deployment URL
- [ ] `VITE_API_URL` matches your Render deployment URL + `/api`
- [ ] `GOOGLE_CLIENT_ID` configured in both environments
- [ ] Google OAuth origins configured for production URLs

### Security
- [ ] No secrets committed to git (check with `git diff --cached`)
- [ ] `.env` files are in `.gitignore`
- [ ] JWT secret is different from development
- [ ] Redis password set (if using Redis)

### Database
- [ ] MongoDB indexes created for performance
- [ ] Backup strategy in place
- [ ] Connection string uses `+srv://` for Atlas

---

## 🔧 Deployment Steps

### 1. Backend (Render)

```bash
# Create new Web Service
1. Connect GitHub repository
2. Set root directory: server
3. Build command: npm install
4. Start command: npm start

# Environment Variables
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-production-secret
JWT_EXPIRE=7d
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NODE_ENV=production
```

### 2. Frontend (Vercel)

```bash
# Import project
1. Connect GitHub repository
2. Set root directory: client
3. Framework: Vite

# Environment Variables
VITE_API_URL=https://your-backend.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Google OAuth Setup

```
1. Google Cloud Console > APIs & Services > Credentials
2. Edit OAuth 2.0 Client
3. Add Authorized JavaScript Origins:
   - https://your-app.vercel.app
4. Add Authorized Redirect URIs (if needed):
   - https://your-app.vercel.app
5. Save and wait 5 minutes for propagation
```

---

## ✅ Post-Deployment Verification

### API Health Check
- [ ] `GET https://your-backend.onrender.com/api/health` returns 200
- [ ] No CORS errors in browser console

### Authentication
- [ ] Google Sign-In button appears
- [ ] Login flow completes successfully
- [ ] JWT token stored in localStorage

### Core Features
- [ ] Professor can create attendance session
- [ ] QR code generates and rotates
- [ ] Student can scan QR code
- [ ] Location permission prompt appears
- [ ] Attendance marked successfully
- [ ] Dashboard shows attendance record

### Mobile Testing
- [ ] UI responsive on mobile screens
- [ ] Touch targets are adequate size (48px+)
- [ ] Haptic feedback works on supported devices
- [ ] GPS accuracy shown correctly

### Security Features
- [ ] Replay attack blocked (same QR used twice)
- [ ] Out-of-range location rejected
- [ ] Device limit enforced (max 3)
- [ ] Proxy detection working (same device, different students)

---

## 🐛 Common Issues

### "CORS Error"
```
Solution: Ensure FRONTEND_URL in server .env matches exactly:
- Include https://
- No trailing slash
- Exact Vercel URL (not localhost)
```

### "Google Sign-In Not Working"
```
Solution:
1. Check VITE_GOOGLE_CLIENT_ID is set correctly
2. Verify authorized origins in Google Console
3. Wait 5 minutes after updating origins
4. Clear browser cache
```

### "MongoDB Connection Failed"
```
Solution:
1. Check MONGODB_URI format
2. Whitelist Render's IP in Atlas (or use 0.0.0.0/0)
3. Verify username/password URL encoded
```

### "Attendance Fails with Location Error"
```
Solution:
1. Ensure HTTPS is used (required for geolocation)
2. Check GPS is enabled on device
3. Verify session radius is reasonable (50-200m)
```

---

## 📊 Monitoring

### Recommended Services
- **Logs**: Render built-in logs
- **Database**: MongoDB Atlas monitoring
- **Uptime**: UptimeRobot (free tier)
- **Analytics**: Vercel Analytics

### Key Metrics to Watch
- API response times
- Error rates
- Active sessions
- Suspicious activity count

---

## 🔄 Rollback Plan

If issues occur:
1. Revert to previous commit on GitHub
2. Render/Vercel will auto-redeploy previous version
3. Check logs for error details
4. Fix and redeploy

---

*Last Updated: December 30, 2025*
*Version: 5.0.0*
