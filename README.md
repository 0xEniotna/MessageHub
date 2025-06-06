# 🚀 Telegram Message Sender

A modern, retro-styled web application for sending messages and media through Telegram with group management capabilities.

## ✨ Features

- 🎨 **Retro 90s Web Design** - Authentic nostalgic interface
- 📱 **Telegram Integration** - Send messages and media via Telegram API
- 👥 **Group Management** - Create and manage contact lists
- 🖼️ **Image Support** - Send images with drag-drop and paste functionality
- ⏰ **Message Scheduling** - Schedule messages for later delivery
- 💾 **Local Storage** - Persistent contact lists and settings
- 🔒 **Secure Authentication** - JWT-based session management
- 🌐 **Production Ready** - Docker deployment with monitoring

## 🏗️ Architecture

- **Frontend**: Next.js with retro CSS styling
- **Backend**: Flask API with Telethon for Telegram integration
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens with encrypted storage
- **Deployment**: Docker containers with Nginx reverse proxy

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Telegram API credentials from [my.telegram.org](https://my.telegram.org)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/telegram-bot.git
cd telegram-bot
```

### 2. Setup Configuration

```bash
# Copy example config
cp config/config.env.example config/config.env

# Generate secure keys
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

# Edit config/config.env with your values
nano config/config.env
```

### 3. Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements-backend.txt
python backend_server.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 4. Docker Setup (Recommended)

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 📦 Deployment Options

### Option 1: Vercel + Hostinger VPS

- **Frontend**: Deploy to Vercel (free)
- **Backend**: Deploy to your Hostinger VPS
- **Guide**: See `DEPLOY_VERCEL_HOSTINGER.md`
- **Cost**: ~$4-16/month

### Option 2: Vercel + Railway

- **Frontend**: Deploy to Vercel (free)
- **Backend**: Deploy to Railway
- **Guide**: See `DEPLOY_VERCEL_RAILWAY.md`
- **Cost**: ~$5-25/month

### Option 3: Full Docker Deployment

- **Everything**: Docker containers on any VPS
- **Guide**: See `PRODUCTION_DEPLOYMENT.md`
- **Cost**: VPS pricing only

## 🔧 Configuration

### Required Environment Variables

```bash
# Security (Generate new ones!)
SECRET_KEY=your-32-char-secret-key
ENCRYPTION_KEY=your-fernet-key

# Telegram API (from my.telegram.org)
API_ID=your_api_id
API_HASH=your_api_hash

# Database
DATABASE_URL=sqlite:///data/telegram_sender.db

# CORS (your frontend URLs)
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

### Optional Configuration

```bash
# Rate limiting
RATE_LIMIT_PER_MINUTE=30
MAX_RECIPIENTS_PER_MESSAGE=100

# File uploads
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=png,jpg,jpeg,gif,webp

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/telegram_sender.log
```

## 🛠️ Development

### Backend API

```bash
cd backend
python backend_server.py
```

API will be available at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Database Management

```bash
# Initialize database
python scripts/init_db.py

# View database
sqlite3 data/telegram_sender.db
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/login` - Login with Telegram credentials
- `POST /api/auth/verify` - Verify phone code
- `POST /api/auth/logout` - Logout and cleanup

### Messages

- `POST /api/messages/send` - Send text message
- `POST /api/messages/send-media` - Send message with images
- `GET /api/messages/history` - Get message history

### Groups

- `GET /api/groups` - List all groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/{id}` - Update group
- `DELETE /api/groups/{id}` - Delete group

### Health

- `GET /api/health` - API health check

## 🔒 Security Features

- JWT token authentication
- Encrypted credential storage
- Rate limiting protection
- CORS configuration
- Secure headers
- Input validation
- File type restrictions
- Session timeout

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**

   - Update `CORS_ORIGINS` in config
   - Restart backend after changes

2. **Database Errors**

   - Run `python scripts/init_db.py`
   - Check database permissions

3. **Telegram API Errors**

   - Verify API_ID and API_HASH
   - Check phone number format
   - Ensure account isn't restricted

4. **File Upload Issues**
   - Check file size limits
   - Verify allowed file types
   - Ensure proper permissions

### Logs

```bash
# Backend logs
tail -f logs/telegram_sender.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational and personal use only. Ensure compliance with Telegram's Terms of Service and applicable laws. The developers are not responsible for misuse of this software.

## 🆘 Support

- Create an issue for bug reports
- Check existing issues before creating new ones
- Provide detailed information for faster resolution

---

**Remember**: Never commit sensitive data like API keys or session files to version control!
