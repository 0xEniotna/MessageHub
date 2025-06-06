# 🚀 Telegram Sender - Complete Setup Guide

This guide will help you set up the complete Telegram message sender application with both backend and frontend.

## 📋 Prerequisites

Before starting, make sure you have:

- **Python 3.7+** installed
- **Node.js 16+** and **npm** installed
- **Telegram API credentials** (API ID and API Hash)

## 🔑 Getting Telegram API Credentials

1. Go to [my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your Telegram account
3. Click "Create application"
4. Fill in the required information:
   - App title: `Telegram Sender`
   - Short name: `telegram-sender`
   - Platform: `Desktop`
5. Copy your **API ID** and **API Hash** - you'll need these later

## 🚀 Quick Start (Recommended)

### Option 1: Start Everything at Once

```bash
python run_full_stack.py
```

This will automatically:

- Install Python dependencies
- Install Node.js dependencies
- Start the backend server (port 8000)
- Start the frontend server (port 3000)

### Option 2: Start Servers Separately

#### Start Backend Only

```bash
python start_backend.py
```

#### Start Frontend Only

```bash
npm install
npm run dev
```

## 🔧 Manual Setup (Advanced)

### Backend Setup

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements-backend.txt
   ```

2. **Create necessary directories:**

   ```bash
   mkdir sessions logs
   ```

3. **Set up environment (optional):**

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the backend:**
   ```bash
   python backend_server.py
   ```

### Frontend Setup

1. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

## 🌐 Accessing the Application

Once both servers are running:

- **Frontend (Web Interface)**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/health

## 🔐 First Time Setup

1. **Open the web interface** at http://localhost:3000
2. **Go to Settings tab**
3. **Enter your Telegram credentials:**
   - API ID (from my.telegram.org)
   - API Hash (from my.telegram.org)
   - Phone Number (with country code, e.g., +1234567890)
4. **Click "Connect"**
5. **Enter verification code** sent to your phone
6. **Enter 2FA password** if you have two-factor authentication enabled

## 📱 Using the Application

### Creating Group Lists

1. Go to **Group Lists** tab
2. Click **"New List"**
3. Enter a name for your list
4. Add recipients by:
   - Username (e.g., @username)
   - User ID (e.g., 123456789)
   - Group ID (e.g., -1001234567890)

### Sending Messages

1. Go to **Compose Message** tab
2. Select a group list
3. Type your message
4. Either:
   - Click **"Send Now"** for immediate delivery
   - Check **"Schedule for later"** and set date/time

### Managing Scheduled Messages

1. Go to **Scheduled Messages** tab
2. View all pending, sent, and failed messages
3. Execute pending messages manually
4. Delete unwanted scheduled messages

## 🧪 Testing the Setup

### Test Backend API

```bash
python test_backend.py
```

This will verify:

- Backend server is running
- API endpoints are responding
- Authentication is working
- CORS is configured

### Test Frontend Connection

1. Open http://localhost:3000
2. Check browser console for errors
3. Try connecting to Telegram in Settings

## 🐛 Troubleshooting

### Common Issues

#### "Cannot connect to backend"

- Make sure backend is running on port 8000
- Check if port is already in use: `lsof -i :8000`
- Try restarting the backend: `python start_backend.py`

#### "Invalid phone number format"

- Include country code (e.g., +1 for US)
- Use format: +1234567890

#### "Failed to resolve entity"

- Check group/user identifier format
- Try different formats: @username, ID, etc.
- Make sure you have access to the group/user

#### "Module not found" errors

- Install dependencies: `pip install -r requirements-backend.txt`
- Make sure you're in the correct directory

#### Frontend won't start

- Install dependencies: `npm install`
- Check Node.js version: `node --version` (should be 16+)
- Clear npm cache: `npm cache clean --force`

### Debug Mode

Both servers run in debug mode by default:

- **Backend**: Detailed error logs in console
- **Frontend**: Hot reload on code changes

### Logs and Data

- **Telegram sessions**: `sessions/` directory
- **Database**: `telegram_sender.db` file
- **Frontend data**: Browser localStorage

## 🔒 Security Notes

- **API credentials** are stored locally and sent to your own backend
- **Session files** are stored locally in `sessions/` directory
- **JWT tokens** expire after 7 days
- **Database** contains only your own data

## 📁 Project Structure

```
telegram-bot/
├── 🐍 Backend Files
│   ├── backend_server.py          # Main Flask API server
│   ├── start_backend.py           # Backend startup script
│   ├── requirements-backend.txt   # Python dependencies
│   └── telegram_sender.py         # Original CLI tool
├── ⚛️ Frontend Files
│   ├── app/                       # Next.js app directory
│   ├── package.json              # Node.js dependencies
│   └── tailwind.config.js        # Styling configuration
├── 🚀 Utility Scripts
│   ├── run_full_stack.py         # Start both servers
│   ├── test_backend.py           # Test backend API
│   └── SETUP.md                  # This file
└── 📊 Data Files
    ├── sessions/                  # Telegram session files
    ├── telegram_sender.db         # SQLite database
    └── .env                       # Environment variables
```

## 🚀 Production Deployment

### Backend (Python)

For production, consider:

- Using **Gunicorn** or **uWSGI** instead of Flask dev server
- Setting up **reverse proxy** with Nginx
- Using **PostgreSQL** instead of SQLite
- Implementing **proper logging**

### Frontend (Next.js)

Deploy to **Vercel** (recommended):

```bash
npm run build
vercel --prod
```

Or other platforms:

- **Netlify**
- **AWS Amplify**
- **Digital Ocean App Platform**

## 🆘 Getting Help

If you encounter issues:

1. **Check this troubleshooting section**
2. **Run the test script**: `python test_backend.py`
3. **Check console logs** for detailed error messages
4. **Verify your Telegram API credentials**
5. **Make sure both servers are running**

## 🎯 Next Steps

Once everything is working:

1. **Create your first group list**
2. **Send a test message**
3. **Try scheduling a message**
4. **Export your data as backup**
5. **Explore the API endpoints**

## 📄 Additional Resources

- **Telegram API Documentation**: https://core.telegram.org/api
- **Telethon Documentation**: https://docs.telethon.dev/
- **Next.js Documentation**: https://nextjs.org/docs
- **Flask Documentation**: https://flask.palletsprojects.com/

---

🎉 **Congratulations!** You now have a fully functional Telegram message sender with a modern web interface!
