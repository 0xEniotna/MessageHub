# 🚀 Deploy to Vercel + Railway

## 🎯 Architecture

- **Frontend**: Vercel (Global CDN, automatic SSL)
- **Backend API**: Railway (Managed hosting, PostgreSQL included)
- **Database**: Railway PostgreSQL
- **Total Cost**: ~$5-10/month

## 📋 Prerequisites

- GitHub account
- Vercel account
- Railway account
- Your Telegram API credentials

## 🚂 Step 1: Deploy Backend to Railway

### 1.1 Setup Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize in your project root
cd /path/to/telegram-bot
railway init
```

### 1.2 Create Railway Project

```bash
# Create new project
railway new
# Choose: "Empty Project"
# Name: "telegram-bot-backend"
```

### 1.3 Add PostgreSQL Database

```bash
# Add PostgreSQL service
railway add -s postgresql

# This automatically creates a database and sets DATABASE_URL
```

### 1.4 Set Environment Variables

In Railway Dashboard (https://railway.app), go to your project and add these variables:

```bash
# Required Telegram API
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash

# Security Keys (Generate new ones!)
SECRET_KEY=your-32-char-secret-key
ENCRYPTION_KEY=your-fernet-encryption-key

# Flask Config
FLASK_ENV=production
FLASK_DEBUG=0

# CORS (Update after Vercel deployment)
CORS_ORIGINS=https://your-vercel-app.vercel.app

# Rate Limiting
RATE_LIMIT_PER_MINUTE=30
MAX_RECIPIENTS_PER_MESSAGE=100

# Railway automatically provides:
# DATABASE_URL (PostgreSQL connection)
# PORT (Railway's dynamic port)
```

### 1.5 Generate Secure Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

### 1.6 Update Backend for Railway

Create `railway.dockerfile` in your root directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ curl && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

# Copy backend code
COPY backend/ .

# Create directories
RUN mkdir -p sessions logs data

# Railway provides PORT environment variable
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start with gunicorn
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 backend_server:app
```

### 1.7 Deploy to Railway

```bash
# Deploy using the Railway Dockerfile
railway up --dockerfile railway.dockerfile

# Check deployment status
railway status

# View logs
railway logs
```

### 1.8 Get Your Backend URL

```bash
# Get the public URL
railway domain

# Example output: https://telegram-bot-backend-production.up.railway.app
```

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Connect GitHub Repository

1. Push your code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Select the `frontend` folder as root directory

### 2.2 Configure Build Settings

In Vercel dashboard:

- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`

### 2.3 Set Environment Variables

In Vercel Project Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

### 2.4 Deploy

```bash
# Option 1: Deploy via Vercel CLI
cd frontend
npx vercel --prod

# Option 2: Deploy via GitHub (automatic)
# Just push to main branch, Vercel will auto-deploy
```

## 🔧 Step 3: Configure CORS

### 3.1 Update Railway CORS

Go back to Railway dashboard and update the CORS environment variable:

```bash
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

### 3.2 Redeploy Railway

```bash
railway up --dockerfile railway.dockerfile
```

## 🎯 Step 4: Custom Domain (Optional)

### 4.1 Add Domain to Vercel

1. Go to Vercel Project Settings → Domains
2. Add your custom domain (e.g., `your-app.com`)
3. Configure DNS records as shown by Vercel

### 4.2 Update CORS for Custom Domain

In Railway, update CORS_ORIGINS to include your custom domain.

## ✅ Step 5: Test Deployment

### 5.1 Check Backend Health

```bash
curl https://your-railway-backend.railway.app/api/health
```

### 5.2 Test Frontend

1. Visit your Vercel URL
2. Try logging in with Telegram credentials
3. Test sending messages
4. Check browser console for any errors

## 📊 Step 6: Monitoring & Maintenance

### 6.1 Railway Monitoring

- Railway dashboard shows CPU, memory, and request metrics
- View logs: `railway logs`
- Scale resources in Railway dashboard if needed

### 6.2 Vercel Analytics

- Enable Vercel Analytics in project settings
- Monitor page load times and user behavior

### 6.3 Database Backup

```bash
# Create database backup via Railway CLI
railway run pg_dump $DATABASE_URL > backup.sql
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. CORS Errors

```bash
# Update CORS in Railway
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

#### 2. Build Failures

```bash
# Check Railway logs
railway logs

# Check Vercel deployment logs in dashboard
```

#### 3. Database Connection Issues

```bash
# Verify DATABASE_URL is set in Railway
railway vars

# Test database connection
railway run python -c "import os; print(os.getenv('DATABASE_URL'))"
```

#### 4. Environment Variables Not Working

- Make sure variables are set in both Railway AND Vercel
- Redeploy after changing environment variables
- Check spelling and formatting

## 💰 Cost Breakdown

### Railway (~$5/month)

- Starter plan: $5/month
- Includes: 512MB RAM, PostgreSQL database
- $0.000463/GB-hour usage-based pricing

### Vercel (Free/Pro)

- Hobby (Free): Perfect for personal projects
- Pro ($20/month): For commercial use, better performance

### Total: $5-25/month depending on usage

## 🚀 Quick Commands Reference

```bash
# Railway Commands
railway login
railway init
railway up --dockerfile railway.dockerfile
railway logs
railway domain
railway vars

# Vercel Commands
npx vercel --prod
npx vercel domains
npx vercel env

# Update deployment
git push origin main  # Auto-deploys to Vercel
railway up --dockerfile railway.dockerfile  # Manual Railway deploy
```

## 🎉 Success!

Your Telegram messaging tool is now deployed with:

- ⚡ Global CDN for fast frontend loading
- 🔒 Automatic SSL certificates
- 📊 PostgreSQL database
- 🔄 Automatic deployments from Git
- 📈 Built-in monitoring and analytics

Perfect for production use! 🚀
