# 🚀 Telegram Sender - Secure Deployment Guide

This guide covers secure deployment of the Telegram Sender application for public use.

## 🔒 Security Features

### ✅ **Implemented Security Measures**

- **Environment-based configuration** - No hardcoded credentials
- **Data encryption** - Sensitive data encrypted at rest
- **Rate limiting** - Prevent abuse
- **CORS protection** - Restrict frontend origins
- **JWT authentication** - Secure session management
- **Phone number hashing** - Privacy protection
- **Non-root Docker containers** - Reduced attack surface

## 📋 Prerequisites

- Docker & Docker Compose
- Domain name (for HTTPS)
- SSL certificate (Let's Encrypt recommended)

## 🛠️ Setup Instructions

### Step 1: Clone and Configure

```bash
git clone <your-repo>
cd telegram-bot
cp config.env.example config.env
```

### Step 2: Generate Secure Keys

```bash
# Generate secret key (32+ characters)
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))" >> config.env

# Generate encryption key
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())" >> config.env

# Generate database password
python3 -c "import secrets; print('POSTGRES_PASSWORD=' + secrets.token_urlsafe(16))" >> config.env
```

### Step 3: Configure Environment

Edit `config.env`:

```bash
# Required - Get from https://my.telegram.org/apps
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash

# Security (generated above)
SECRET_KEY=your_generated_secret_key
ENCRYPTION_KEY=your_generated_encryption_key
POSTGRES_PASSWORD=your_generated_db_password

# Domain configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate limiting
RATE_LIMIT_PER_MINUTE=10
MAX_RECIPIENTS_PER_MESSAGE=50
```

### Step 4: Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

## 🌐 Deployment Options

### Option 1: Self-Hosted VPS

**Recommended for**: Full control, custom domains

```bash
# On your VPS
git clone <your-repo>
cd telegram-bot
# Configure as above
docker-compose up -d

# Setup reverse proxy (nginx)
sudo apt install nginx certbot python3-certbot-nginx
# Configure nginx for HTTPS
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Railway

**Recommended for**: Easy deployment, built-in HTTPS

1. **Fork the repository**
2. **Connect to Railway**
3. **Set environment variables** in Railway dashboard
4. **Deploy automatically**

### Option 3: Heroku

**Note**: Requires Heroku Postgres add-on

```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set SECRET_KEY=your_secret_key
heroku config:set API_ID=your_api_id
heroku config:set API_HASH=your_api_hash
heroku config:set ENCRYPTION_KEY=your_encryption_key

# Add Postgres
heroku addons:create heroku-postgresql:mini

# Deploy
git push heroku main
```

### Option 4: Digital Ocean App Platform

1. **Connect GitHub repository**
2. **Configure environment variables**
3. **Add database component**
4. **Deploy**

## 🔐 Security Checklist

### ✅ **Before Going Public**

- [ ] **Change all default passwords**
- [ ] **Set strong SECRET_KEY** (32+ characters)
- [ ] **Configure CORS_ORIGINS** to your domain only
- [ ] **Enable HTTPS** (SSL certificate)
- [ ] **Set up monitoring** and logging
- [ ] **Configure firewall** (only ports 80, 443, 22)
- [ ] **Regular backups** of database and sessions
- [ ] **Update dependencies** regularly

### ✅ **Environment Variables Validation**

```bash
# Check configuration
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv('config.env')

required = ['SECRET_KEY', 'API_ID', 'API_HASH', 'ENCRYPTION_KEY']
for var in required:
    if not os.getenv(var):
        print(f'❌ Missing: {var}')
    else:
        print(f'✅ Set: {var}')
"
```

## 📊 Monitoring & Maintenance

### Logging

```bash
# View application logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres
```

### Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U telegram_user telegram_sender > backup.sql

# Session files backup
tar -czf sessions_backup.tar.gz sessions/

# Restore database
docker-compose exec -T postgres psql -U telegram_user telegram_sender < backup.sql
```

### Updates

```bash
# Update application
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

## 🚨 Security Incident Response

### If Credentials Are Compromised

1. **Immediately rotate all keys**
2. **Revoke Telegram API access**
3. **Check logs for unauthorized access**
4. **Notify users if data was accessed**

### Generate New Keys

```bash
# New secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# New encryption key (requires data migration!)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## 📱 Frontend Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
```

### Netlify

1. **Connect GitHub repository**
2. **Set build command**: `npm run build`
3. **Set publish directory**: `out`
4. **Add environment variables**

## 🔍 Troubleshooting

### Common Issues

1. **CORS errors**: Check `CORS_ORIGINS` in config.env
2. **Database connection**: Verify PostgreSQL credentials
3. **Telegram API errors**: Check API_ID and API_HASH
4. **Encryption errors**: Verify ENCRYPTION_KEY format

### Debug Mode

```bash
# Enable debug logging
FLASK_DEBUG=1 docker-compose up backend
```

## 📞 Support

For issues:

1. Check logs first
2. Verify environment variables
3. Test with minimal configuration
4. Check firewall and network settings

## 🎯 Production Optimization

### Performance Tips

- **Use Redis** for session storage
- **PostgreSQL** instead of SQLite
- **CDN** for static assets
- **Load balancer** for high traffic
- **Monitor resource usage**

### Scaling

```yaml
# docker-compose.yml scaling
backend:
  deploy:
    replicas: 3
  # Add load balancer configuration
```

---

**🛡️ Remember**: Security is an ongoing process. Regularly update dependencies, monitor logs, and review access patterns.
