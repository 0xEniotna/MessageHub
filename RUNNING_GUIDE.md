# 🚀 Running Guide: MessageHub - Local Development & Server Deployment

This guide covers how to run the MessageHub application locally and deploy it to a public server.

## 📋 Prerequisites

### Required

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **Telegram API credentials** from [my.telegram.org/apps](https://my.telegram.org/apps)

### Optional (for deployment)

- **Railway account** (recommended for easy deployment)
- **Domain name** (optional, for custom URLs)

---

## 🏠 Running Locally

### 1. Setup Configuration

```bash
# Copy the config template
cp config/config.env.example config/config.env

# Edit with your values
nano config/config.env
```

**Fill in these required values:**

```env
API_ID=your_api_id_here
API_HASH=your_api_hash_here
PHONE_NUMBER=your_phone_number_here  # Your phone with country code
SECRET_KEY=your-secret-key-32-plus-characters
ENCRYPTION_KEY=your-encryption-key-base64
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Initialize Database

```bash
python scripts/init_db.py
```

### 4. Run the Application

**Option A: Full Stack (Recommended)**

```bash
python scripts/run_full_stack.py
```

This starts both backend and frontend automatically.

**Option B: Run Separately**

```bash
# Terminal 1: Backend
python backend/backend_server.py

# Terminal 2: Frontend (in another terminal)
cd frontend
npm run dev
```

**Option C: Legacy CLI Only**

```bash
python scripts/telegram_sender.py
```

### 5. Access the Application

- **Web UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/health

---

## 🌍 Deploy to Server (Making it Public)

### Method 1: Railway (Recommended - Easy & Free)

Railway is the easiest way to deploy your app with a public URL.

#### 1. Prepare for Railway

```bash
# Make sure your config is ready
cp config/config.env.example railway.env
# Fill in railway.env with your production values
```

#### 2. Deploy Backend to Railway

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Link your repository
3. **Create Project**: "Deploy from GitHub repo"
4. **Configure Environment**:
   ```env
   API_ID=your_api_id
   API_HASH=your_api_hash
   PHONE_NUMBER=your_phone
   SECRET_KEY=generate-new-32-char-key
   ENCRYPTION_KEY=generate-new-encryption-key
   PORT=8000
   FLASK_ENV=production
   ```
5. **Deploy**: Railway will auto-deploy
6. **Get URL**: Note your backend URL (e.g., `https://myapp.railway.app`)

#### 3. Deploy Frontend to Vercel

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to your GitHub repo
# - Set build command: npm run build
# - Set output directory: .next
```

#### 4. Connect Frontend to Backend

Update your frontend environment:

```env
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
```

### Method 2: VPS/Server Deployment

For more control, deploy to your own VPS (DigitalOcean, Linode, AWS EC2).

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3 python3-pip nodejs npm nginx git -y

# Clone your repo
git clone https://github.com/yourusername/telegram-bot.git
cd telegram-bot
```

#### 2. Backend Setup

```bash
# Install Python deps
pip3 install -r requirements.txt

# Setup config
cp config/config.env.example config/config.env
nano config/config.env  # Fill in your values

# Initialize database
python3 scripts/init_db.py

# Create systemd service
sudo nano /etc/systemd/system/telegram-backend.service
```

**Service file:**

```ini
[Unit]
Description=Telegram Sender Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/telegram-bot
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/python3 backend/backend_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```
