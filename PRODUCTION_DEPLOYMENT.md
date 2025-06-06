# 🚀 Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. **Environment Variables Setup**

Update your `config/config.env` with production values:

```bash
# Security (CHANGE THESE!)
SECRET_KEY=your-random-32-char-secret-key-here
ENCRYPTION_KEY=your-fernet-encryption-key-here

# Telegram API (Required)
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash

# Production URLs
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Database (Production)
DATABASE_URL=postgresql://user:password@host:5432/dbname
# OR keep SQLite for smaller deployments
DATABASE_URL=sqlite:///data/telegram_sender.db

# Security Settings
FLASK_ENV=production
FLASK_DEBUG=0
RATE_LIMIT_PER_MINUTE=30
MAX_RECIPIENTS_PER_MESSAGE=100
```

### 2. **Security Hardening**

```bash
# Generate secure keys
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

## 🐳 Option 1: Docker Deployment (Recommended)

### **Quick Start**

```bash
# 1. Clone and setup
git clone <your-repo>
cd telegram-bot

# 2. Update environment variables
cp config/config.env.example config/config.env
# Edit config/config.env with your values

# 3. Build and run
docker-compose up -d --build

# 4. Check status
docker-compose ps
docker-compose logs -f
```

### **Production Docker Compose**

Update `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: telegram_sender
      POSTGRES_USER: telegram_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - telegram-net

  # Backend API
  backend:
    build: .
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - API_ID=${API_ID}
      - API_HASH=${API_HASH}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - DATABASE_URL=postgresql://telegram_user:${POSTGRES_PASSWORD}@postgres:5432/telegram_sender
      - CORS_ORIGINS=${CORS_ORIGINS}
      - FLASK_ENV=production
    ports:
      - '8000:8000'
    depends_on:
      - postgres
    volumes:
      - ./sessions:/app/sessions
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - telegram-net

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    ports:
      - '3000:3000'
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - telegram-net

  # Reverse Proxy (Optional but recommended)
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - telegram-net

volumes:
  postgres_data:

networks:
  telegram-net:
    driver: bridge
```

## ☁️ Option 2: Cloud Platform Deployment

### **A. Railway (Easiest)**

1. **Setup Railway**

   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Deploy Backend**

   ```bash
   railway add
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   # In Railway dashboard, add all your config.env variables
   railway variables set SECRET_KEY=your-secret-key
   railway variables set API_ID=your-api-id
   # ... etc
   ```

### **B. Heroku**

1. **Setup**

   ```bash
   # Install Heroku CLI
   heroku create telegram-bot-backend
   heroku addons:create heroku-postgresql:mini
   ```

2. **Deploy**

   ```bash
   # Set environment variables
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set API_ID=your-api-id
   # ... etc

   # Deploy
   git push heroku main
   ```

### **C. Vercel (Frontend) + Railway (Backend)**

```bash
# Frontend on Vercel
cd frontend
npx vercel --prod

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## 🖥️ Option 3: VPS Deployment

### **Setup on Ubuntu/Debian VPS**

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Setup firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# 5. Clone and deploy
git clone <your-repo>
cd telegram-bot
cp config/config.env.example config/config.env
# Edit config/config.env

# 6. Run
docker-compose up -d --build
```

### **Setup Nginx Reverse Proxy**

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # API routes
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 📱 Frontend Production Build

Create `frontend/Dockerfile.prod`:

```dockerfile
# Frontend Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

Update `frontend/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
};

module.exports = nextConfig;
```

## 🔐 SSL Certificate Setup

### **Using Certbot (Let's Encrypt)**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Logs

### **Docker Logs**

```bash
# View logs
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend

# Monitor resources
docker stats
```

### **System Monitoring**

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Check system resources
htop
df -h
free -m
```

## 🔧 Maintenance Commands

```bash
# Update application
git pull
docker-compose down
docker-compose up -d --build

# Backup database
docker-compose exec postgres pg_dump -U telegram_user telegram_sender > backup.sql

# Restore database
docker-compose exec -T postgres psql -U telegram_user telegram_sender < backup.sql

# Clear logs
docker system prune -f
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Port conflicts**: Change ports in docker-compose.yml
2. **Permission issues**: Check file ownership and Docker permissions
3. **Memory issues**: Increase VPS RAM or optimize Docker settings
4. **Database connection**: Verify DATABASE_URL and network connectivity

### **Debug Commands**

```bash
# Check container status
docker-compose ps

# Enter container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check logs
docker-compose logs --tail=100 backend
```

## 📋 Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Domain DNS configured
- [ ] Test all functionality
- [ ] Security scan performed

## 🎯 Recommended Production Setup

For most users, I recommend:

1. **VPS**: DigitalOcean, Linode, or Vultr ($5-10/month)
2. **Domain**: From Namecheap, Cloudflare, etc.
3. **Deployment**: Docker Compose on VPS
4. **SSL**: Free Let's Encrypt certificate
5. **Monitoring**: Basic log monitoring + uptime checks

This gives you full control, good performance, and reasonable costs!
