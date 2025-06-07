#!/bin/bash

# Production deployment script for Telegram Bot Backend
# This script helps transition from development to production setup

echo "🚀 Telegram Bot Backend - Production Deployment"
echo "================================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python 3
if ! command_exists python3; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check current directory
if [ ! -f "backend_server.py" ]; then
    echo "❌ backend_server.py not found. Are you in the backend directory?"
    exit 1
fi

echo "✅ Found backend_server.py"

# Check if systemd service exists
SERVICE_NAME="telegram-bot-backend"
if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    echo "🛑 Stopping existing service: $SERVICE_NAME"
    sudo systemctl stop $SERVICE_NAME
fi

# Install/update requirements
echo "📦 Installing production requirements..."
python3 -m pip install -r requirements-backend.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p sessions logs data

# Set proper permissions
echo "🔒 Setting permissions..."
chmod +x start_production.py
chmod +x wsgi.py

# Test the WSGI application
echo "🧪 Testing WSGI application..."
python3 -c "
try:
    from wsgi import application
    print('✅ WSGI application loads successfully')
except Exception as e:
    print(f'❌ WSGI application failed to load: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ WSGI test failed. Check the error above."
    exit 1
fi

# Show production startup command
echo ""
echo "🎉 Production setup complete!"
echo ""
echo "To start in production mode:"
echo "  python3 start_production.py"
echo ""
echo "Or directly with Gunicorn:"
echo "  gunicorn -c gunicorn.conf.py wsgi:application"
echo ""
echo "To run as a systemd service, update your service file to use:"
echo "  ExecStart=$(which python3) $(pwd)/start_production.py"
echo "  # OR"
echo "  ExecStart=$(which gunicorn) -c $(pwd)/gunicorn.conf.py wsgi:application"
echo ""
echo "Logs will be written to:"
echo "  - logs/app.log (application logs)"
echo "  - logs/gunicorn_access.log (access logs)"
echo "  - logs/gunicorn_error.log (error logs)"
echo ""

# Check if service file needs updating
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    echo "⚠️  Found existing systemd service file."
    echo "   You may need to update it to use the new production startup."
    echo "   Run: sudo systemctl edit $SERVICE_NAME"
    echo "   Or: sudo nano /etc/systemd/system/$SERVICE_NAME.service"
fi

echo "Ready for production! 🚀" 