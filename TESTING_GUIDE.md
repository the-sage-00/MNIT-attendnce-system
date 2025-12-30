# 🧪 QR Attendance System - Comprehensive Testing Guide

This guide covers all test scenarios to ensure the system is fully functional, secure, and ready for deployment. Follow these steps to validate each feature.

## 📋 Prerequisites
1. **Redis** must be running (Check connection in server console).
2. **Server** running: `npm run dev` in `/server` (Port 5000).
3. **Client** running: `npm run dev` in `/client` (Port 5173).
4. **GPS Enabled** on your testing device (or allow browser location).

---

## 🧑‍💻 Role-Based Testing Scenarios

### 1. 🛡️ Admin Role
**Credentials**: Log in with an admin account (or create one directly in DB/Seed).

| Feature | Action to Perform | Expected Outcome |
|---------|-------------------|------------------|
| **Login** | Enter Admin credentials. | Redirect to `/admin/dashboard`. |
| **Analytics** | Check the top dashboard cards. | Stats (Total Students, Sessions, etc.) are visible and non-zero. |
| **Pending Users** | Check "Pending Approvals". | List of professors waiting for approval (if any). |
| **Approve Prof** | Click "✓" on a pending professor. | User moves to approved list; "Success" Toast appears. |
| **Course List** | Navigate to "Courses" tab. | List of all courses in the system. |
| **Student List** | Navigate to "Students" tab. | List of registered students. |
| **Suspicious** | Check "Suspicious Activity" on Dashboard. | Alert cards for students with high suspicion scores (if any). |

### 2. 👨‍🏫 Professor Role
**Credentials**: Log in with a Professor account.

| Feature | Action to Perform | Expected Outcome |
|---------|-------------------|------------------|
| **Login** | Enter Professor credentials. | Redirect to `/professor/dashboard`. |
| **Create Course** | Click "+ New Course", fill form (Branch, Year). | Course appears in "My Courses" list with success Toast. |
| **Delete Course** | Click "🗑" on a course. | Confirmation dialog. If sessions exist -> asks to Archive. |
| **Start Session** | Click "▶ Start Session", allow Location. | Modal shows "Location acquired". Redirects to Live Session. |
| **Live Session** | View the Live Session screen. | QR Code (Dynamic) is visible. Countdown timer cycles. |
| **Show/Hide QR** | Toggle "Hide QR Code". | QR disappears/reappears. |
| **Session History** | Go back to Dashboard, check "Recent Sessions". | List of past sessions with "ENDED" or "LIVE" status. |
| **Course Rep.** | Click "📊 Attendance" on a course card. | Detailed list of students with % for that course. |
| **Export CSV** | Click "Export CSV" in Course Attendance. | A `.csv` file downloads with student data. |

### 3. 🎓 Student Role
**Credentials**: Log in with a Student account (Google Login recommended).

| Feature | Action to Perform | Expected Outcome |
|---------|-------------------|------------------|
| **Login** | Sign in with Google. | Redirect to `/student/dashboard`. |
| **Dashboard** | Check "My Dashboard". | Overall Attendance %, Recent Activity, and Course List visible. |
| **Progress** | Check "Course-wise Attendance". | Progress bars show green/yellow/red based on %. |
| **Mark Attend** | Click "📷 Mark Attendance". | Redirect to QR Scanner page. Camera opens. |
| **Scan QR** | Scan a Professor's active QR code. | **Success**: "Attendance Marked". **Fail**: "Too far" or "Invalid". |
| **Location** | Try scanning with Location OFF. | Error: "Location permission required". |
| **Proxy Test** | Try scanning the *same* QR from a 2nd device. | Error: "Device fingerprint mismatch" or "Already marked". |

---

## 🔒 Security & Edge Case Testing

### A. Geofencing (Location)
1.  **Valid Range**: Start a session. Stand within the radius (default 50m). Scan QR. -> **Success**.
2.  **Out of Range**: Use a location spoofer or move >100m away. Scan QR. -> **Error**: "You are too far from the class".

### B. Device Fingerprinting
1.  **Primary Device**: Login as Student A on Chrome (Laptop). Mark attendance. -> **Success**.
2.  **Device Change**: Login as Student A on Firefox (or Phone). Mark attendance for *same* session. -> **Warning**: "New device detected" (may trigger suspicion).
3.  **Proxy Attempt**: Student B sends QR picture to Student A. Student A scans it. -> **Error**: "QR Expired" (if >30s) or "Location mismatch".

### C. Network/Connectivity
1.  **Offline**: Turn off WiFi after loading scanner. Scan QR. -> **Error**: Network request fails, handles gracefully.

---

## 📝 Troubleshooting Checklist

-   [ ] **Toast Notifications**: Are they appearing instead of `alert()`?
-   [ ] **Loading States**: Do spinners appear while fetching data?
-   [ ] **Charts**: Are the pie/doughnut charts rendering?
-   [ ] **Dark Mode**: Does the theme toggle work on all pages?
-   [ ] **Logout**: Does logout clear the token and redirect to login?

## 🚀 Final Deployment check
1.  Ensure `.env` has `NODE_ENV=production`? (Keep `development` for testing).
2.  Check MongoDB connection string is secure.
3.  Verify Redis is persistent.
