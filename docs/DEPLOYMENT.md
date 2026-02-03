# 🚀 Mini-Bank Deployment Guide

This guide will help you deploy your Mini-Bank application with the frontend on Vercel and backend on Render.

## 📋 Prerequisites

- GitHub repository with your code
- Vercel account (free)
- Render account (free)
- PostgreSQL database (provided by Render)

## 🔧 Backend Deployment on Render

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy Backend on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `mini-bank-backend`
   - **Environment**: `Python 3`
   - **Python Version**: `3.12.6` ⚠️ **CRITICAL: Must be 3.12.6, not 3.13**
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt && flask db upgrade`
   - **Start Command**: `gunicorn main:app`
   - **Root Directory**: `backend`

**⚠️ IMPORTANT**: Python 3.13 is not compatible with psycopg2-binary. Use Python 3.12.6 for stable deployment.

5. **Set Environment Variables:**
   - `FLASK_ENV`: `production`
   - `JWT_SECRET_KEY`: Generate a secure random string (32+ characters)
   - `FRONTEND_URL`: `https://your-frontend-url.vercel.app` (update after frontend deployment)

6. **Create Database:**
   - Click "New +" → "PostgreSQL"
   - **Name**: `minibank-db`
   - **Plan**: Free
   - Copy the **External Database URL**

7. **Update Environment Variables:**
   - `DATABASE_URL`: Paste the PostgreSQL connection string from step 6

8. **Deploy**: Click "Create Web Service"

### Step 3: Initialize Database

After deployment, you need to create the admin user and sample data:

1. **Get your backend URL** (e.g., `https://mini-bank-backend.onrender.com`)
2. **Test the health endpoint**: `https://your-backend-url.onrender.com/api/health`
3. **Create admin user** (run this in your local terminal):

```bash
# Replace YOUR_BACKEND_URL with your actual Render URL
curl -X POST https://YOUR_BACKEND_URL.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@minibank.com",
    "password": "admin123",
    "role": "admin"
  }'
```

## 🎨 Frontend Deployment on Vercel

### Step 1: Deploy Frontend on Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Set Environment Variables:**
   - `VITE_API_BASE_URL`: `https://your-backend-url.onrender.com/api`

6. **Deploy**: Click "Deploy"

### Step 2: Update Backend CORS

After getting your Vercel URL:

1. **Go to Render Dashboard** → Your Backend Service → Environment
2. **Update `FRONTEND_URL`** to your Vercel URL (e.g., `https://mini-bank-frontend.vercel.app`)
3. **Redeploy** the backend service

## 🔄 Complete Deployment Flow

```mermaid
graph TD
    A[GitHub Repository] --> B[Render Backend]
    A --> C[Vercel Frontend]
    B --> D[PostgreSQL Database]
    C --> E[Static Files CDN]
    B --> F[API Endpoints]
    C --> F
    F --> G[Production App]
```

## 🌐 Production URLs

After deployment, you'll have:

- **Frontend**: `https://your-app-name.vercel.app`
- **Backend API**: `https://your-app-name.onrender.com/api`
- **Health Check**: `https://your-app-name.onrender.com/api/health`

## 🔐 Default Login Credentials

- **Email**: `admin@minibank.com`
- **Password**: `admin123`
- **Role**: `admin`

## 🛠️ Environment Variables Summary

### Backend (Render)
```
FLASK_ENV=production
DATABASE_URL=postgresql://... (from Render)
JWT_SECRET_KEY=your-secure-key
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

## 🔍 Troubleshooting

### Common Issues

1. **psycopg2 Import Error** (Most Common)
   - **Root Cause**: Python 3.13 removed `_PyInterpreterState_Get` symbol that psycopg2-binary depends on
   - **Solution**: Use Python 3.12.6 instead of 3.13
   - **Steps**:
     1. Delete your current Render service
     2. Create a new Web Service
     3. **CRITICAL**: Select Python Version `3.12.6` (not 3.13)
     4. Use the same configuration as before
   - **Alternative**: If you must use Python 3.13, switch to psycopg3:
     ```bash
     pip uninstall psycopg2-binary
     pip install "psycopg[binary]"
     # Update connection string to: postgresql+psycopg://user:pass@host:port/db
     ```

2. **CORS Errors**
   - Ensure `FRONTEND_URL` is set correctly in backend
   - Check that frontend URL matches exactly (including https)

3. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Check if database is running on Render

4. **Build Failures**
   - Check build logs in Render/Vercel
   - Ensure all dependencies are in requirements.txt/package.json
   - Try upgrading pip: `pip install --upgrade pip`

6. **API Not Working**
   - Test health endpoint: `/api/health`
   - Check backend logs in Render dashboard

### Health Checks

- **Backend**: `https://your-backend.onrender.com/api/health`
- **Frontend**: Should load the login page

## 📊 Monitoring

- **Render**: Monitor backend performance and logs
- **Vercel**: Monitor frontend performance and analytics
- **Database**: Monitor PostgreSQL usage in Render

## 🔄 Updates

To update your deployed app:

1. **Make changes locally**
2. **Commit and push to GitHub**
3. **Render and Vercel will auto-deploy** (if auto-deploy is enabled)
4. **Or manually trigger deployment** from their dashboards

## 💰 Cost

- **Render**: Free tier available (with limitations)
- **Vercel**: Free tier available (generous limits)
- **Total**: $0/month for small applications

## 🎉 Success!

Your Mini-Bank application should now be live and accessible from anywhere!
