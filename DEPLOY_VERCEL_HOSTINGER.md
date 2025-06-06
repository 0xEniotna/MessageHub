# 🚀 Deploy to Vercel + Hostinger VPS

## 🎯 Architecture

- **Frontend**: Vercel (Global CDN, automatic SSL)
- **Backend API**: Hostinger VPS (Your own server)
- **Database**: PostgreSQL on VPS or SQLite
- **Total Cost**: Hostinger VPS (~$3-10/month) + Vercel (Free)

## 📋 Prerequisites

- Hostinger VPS with SSH access
- GitHub account
- Vercel account
- Your Telegram API credentials
- Domain name (optional but recommended)

## 🖥️ Step 1: Setup Hostinger VPS

### 1.1 Connect to Your VPS

```bash
# Connect via SSH
ssh root@your-vps-ip
# or
ssh username@your-vps-ip
```

### 1.2 Update System

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git nano htop ufw
```

### 1.3 Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (replace 'username' with your user)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.4 Setup Firewall

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8000  # For backend API
sudo ufw --force enable

# Check status
sudo ufw status
```

### 1.5 Create Application Directory

```bash
# Create app directory
sudo mkdir -p /opt/telegram-bot
sudo chown $USER:$USER /opt/telegram-bot
cd /opt/telegram-bot
```

## 📦 Step 2: Deploy Backend to VPS

### 2.1 Clone Your Repository

```bash
# Clone your repo (replace with your GitHub URL)
git clone https://github.com/yourusername/telegram-bot.git .

# Or upload files via SCP if not using Git
# scp -r ./telegram-bot username@your-vps-ip:/opt/telegram-bot/
```

### 2.2 Create Production Environment File

```bash
# Create production config
nano config/config.env.prod
```

Add your production configuration:

```bash
# Security (Generate new secure keys!)
SECRET_KEY=your-super-secure-32-char-secret-key-here
ENCRYPTION_KEY=your-fernet-encryption-key-here

# Telegram API
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=0
HOST=0.0.0.0
PORT=8000

# Database (Choose one option)
# Option 1: SQLite (Simple, good for small usage)
DATABASE_URL=sqlite:///data/telegram_sender.db

# Option 2: PostgreSQL (Better for production)
# DATABASE_URL=postgresql://telegram_user:secure_password@localhost:5432/telegram_sender

# CORS (Update after Vercel deployment)
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=50
MAX_RECIPIENTS_PER_MESSAGE=200
SESSION_TIMEOUT_HOURS=24
```

### 2.3 Generate Secure Keys

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

### 2.4 Create VPS Docker Compose

Create `docker-compose.vps.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database (Optional - remove if using SQLite)
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: telegram_sender
      POSTGRES_USER: telegram_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure_password_change_me}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    networks:
      - telegram-net
    ports:
      - '127.0.0.1:5432:5432'

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - config/config.env.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - '8000:8000'
    volumes:
      - ./sessions:/app/sessions
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    restart: unless-stopped
    networks:
      - telegram-net
    depends_on:
      - postgres # Remove if using SQLite

volumes:
  postgres_data:

networks:
  telegram-net:
    driver: bridge
```

### 2.5 Create Nginx Configuration

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/telegram-bot
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com your-vps-ip;

    # API routes
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 200;
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

### 2.6 Enable Nginx Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2.7 Deploy Backend

```bash
# Build and start services
docker-compose -f docker-compose.vps.yml up -d --build

# Check status
docker-compose -f docker-compose.vps.yml ps

# View logs
docker-compose -f docker-compose.vps.yml logs -f backend
```

### 2.8 Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend API URL

In your frontend code, update the API URL to point to your VPS:

```bash
# In frontend/.env.local or vercel.json
NEXT_PUBLIC_API_URL=https://your-domain.com
# or
NEXT_PUBLIC_API_URL=http://your-vps-ip:8000
```

### 3.2 Deploy to Vercel

```bash
# From your local machine
cd frontend
npx vercel --prod

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 3.3 Update CORS on VPS

```bash
# SSH back to your VPS
ssh username@your-vps-ip

# Update CORS in config file
nano /opt/telegram-bot/config/config.env.prod

# Update this line:
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com

# Restart backend
cd /opt/telegram-bot
docker-compose -f docker-compose.vps.yml restart backend
```

## 🔧 Step 4: Monitoring & Maintenance

### 4.1 Create Backup Script

```bash
# Create backup script
nano /opt/telegram-bot/backup.sh
```

Add this content:

```bash
#!/bin/bash
BACKUP_DIR="/opt/telegram-bot/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database (if using PostgreSQL)
docker-compose -f docker-compose.vps.yml exec -T postgres pg_dump -U telegram_user telegram_sender > $BACKUP_DIR/db_backup_$DATE.sql

# Backup sessions and data
tar -czf $BACKUP_DIR/sessions_backup_$DATE.tar.gz sessions/
tar -czf $BACKUP_DIR/data_backup_$DATE.tar.gz data/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/telegram-bot/backup.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /opt/telegram-bot/backup.sh
```

### 4.2 Setup Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/telegram-bot
```

Add:

```
/opt/telegram-bot/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/telegram-bot/docker-compose.vps.yml restart backend
    endscript
}
```

### 4.3 Monitoring Commands

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check Docker containers
docker ps

# View backend logs
docker-compose -f docker-compose.vps.yml logs -f backend

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor API health
curl http://localhost:8000/api/health
```

## 🚀 Step 5: Useful Management Commands

### 5.1 Update Application

```bash
# SSH to VPS
ssh username@your-vps-ip
cd /opt/telegram-bot

# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml up -d --build

# Check status
docker-compose -f docker-compose.vps.yml ps
```

### 5.2 Database Management

```bash
# Access PostgreSQL (if using)
docker-compose -f docker-compose.vps.yml exec postgres psql -U telegram_user telegram_sender

# Backup database
docker-compose -f docker-compose.vps.yml exec postgres pg_dump -U telegram_user telegram_sender > backup.sql

# Restore database
docker-compose -f docker-compose.vps.yml exec -T postgres psql -U telegram_user telegram_sender < backup.sql
```

### 5.3 Troubleshooting

```bash
# Check if services are running
sudo systemctl status nginx
docker-compose -f docker-compose.vps.yml ps

# Check ports
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :80

# Check firewall
sudo ufw status

# Test API directly
curl -X GET http://localhost:8000/api/health

# Check Docker logs
docker-compose -f docker-compose.vps.yml logs backend
```

## 💰 Cost Breakdown

### Hostinger VPS

- **VPS 1**: ~$3.99/month (1 vCPU, 1GB RAM) - Good for testing
- **VPS 2**: ~$7.99/month (2 vCPU, 2GB RAM) - Recommended for production
- **VPS 3**: ~$15.99/month (4 vCPU, 4GB RAM) - High traffic

### Vercel

- **Hobby**: Free (perfect for frontend)
- **Pro**: $20/month (if you need commercial features)

### Domain (Optional)

- ~$10-15/year from Hostinger or other registrars

### **Total: $4-16/month**

## 🎉 Success!

Your setup now includes:

- ✅ Backend API running on your Hostinger VPS
- ✅ Frontend deployed on Vercel's global CDN
- ✅ SSL certificates for security
- ✅ Automated backups
- ✅ Monitoring and logging
- ✅ Easy update process

Perfect for production use with full control over your backend! 🚀

## 🔧 Quick Reference Commands

```bash
# SSH to VPS
ssh username@your-vps-ip

# Check application status
cd /opt/telegram-bot && docker-compose -f docker-compose.vps.yml ps

# View logs
docker-compose -f docker-compose.vps.yml logs -f backend

# Restart services
docker-compose -f docker-compose.vps.yml restart

# Update application
git pull && docker-compose -f docker-compose.vps.yml up -d --build

# Backup
./backup.sh

# Check system resources
htop && df -h
```
