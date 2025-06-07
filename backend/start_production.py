#!/usr/bin/env python3
"""
Production startup script for the Telegram Sender Backend
Uses Gunicorn WSGI server for production deployment
"""

import os
import sys
import subprocess
import signal
import time
import logging

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 7):
        print("Error: Python 3.7 or higher is required")
        sys.exit(1)

def install_requirements():
    """Install required packages"""
    print("Installing requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements-backend.txt"])
        print("✅ Requirements installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements")
        sys.exit(1)

def create_directories():
    """Create necessary directories"""
    directories = ['sessions', 'logs', 'data']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✅ Created directory: {directory}")

def setup_environment():
    """Set up environment variables for production"""
    env_file = '.env'
    if not os.path.exists(env_file):
        print(f"⚠️  Warning: {env_file} not found. Creating basic configuration...")
        with open(env_file, 'w') as f:
            f.write("# Telegram Sender Backend Configuration - PRODUCTION\n")
            f.write("SECRET_KEY=your-secret-key-change-this-in-production-32-chars-minimum\n")
            f.write("FLASK_ENV=production\n")
            f.write("FLASK_DEBUG=0\n")
            f.write("DATABASE_URL=sqlite:///telegram_sender.db\n")
            f.write("CORS_ORIGINS=http://localhost:3000,https://telegram-mass-sender.vercel.app\n")
        print(f"✅ Created {env_file} file")
        print("🔴 IMPORTANT: Update the SECRET_KEY in .env file before running in production!")

def check_gunicorn():
    """Check if Gunicorn is available"""
    try:
        subprocess.check_output([sys.executable, "-m", "gunicorn", "--version"])
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def start_gunicorn():
    """Start the application using Gunicorn"""
    print("\n" + "="*60)
    print("🚀 Starting Telegram Bot Backend with Gunicorn")
    print("🌐 Production WSGI Server")
    print("📍 Binding to: 127.0.0.1:8000 (localhost)")
    print("🔧 Workers: Auto-configured based on CPU cores")
    print("📊 Monitoring: Check logs/gunicorn_*.log")
    print("🛑 Stop with: Ctrl+C or kill the process")
    print("="*60 + "\n")
    
    try:
        # Start Gunicorn with the configuration file
        cmd = [
            sys.executable, "-m", "gunicorn",
            "-c", "gunicorn.conf.py",
            "wsgi:application"
        ]
        
        print(f"🔄 Running command: {' '.join(cmd)}")
        process = subprocess.Popen(cmd)
        
        # Wait for the process
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Received shutdown signal...")
        if process:
            print("🔄 Terminating Gunicorn process...")
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                print("⚡ Force killing Gunicorn process...")
                process.kill()
        print("✅ Shutdown complete")
    except Exception as e:
        print(f"❌ Error starting Gunicorn: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("🚀 Starting Telegram Sender Backend (Production Mode)...")
    
    # Check Python version
    check_python_version()
    
    # Create directories
    create_directories()
    
    # Setup environment
    setup_environment()
    
    # Install requirements
    install_requirements()
    
    # Check if Gunicorn is available
    if not check_gunicorn():
        print("❌ Gunicorn not found. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "gunicorn"])
            print("✅ Gunicorn installed successfully")
        except subprocess.CalledProcessError:
            print("❌ Failed to install Gunicorn")
            sys.exit(1)
    
    # Check if wsgi.py exists
    if not os.path.exists('wsgi.py'):
        print("❌ wsgi.py not found. This file is required for production deployment.")
        sys.exit(1)
    
    # Check if gunicorn.conf.py exists
    if not os.path.exists('gunicorn.conf.py'):
        print("❌ gunicorn.conf.py not found. This file is required for production deployment.")
        sys.exit(1)
    
    print("✅ All prerequisites met!")
    
    # Start Gunicorn
    start_gunicorn()

if __name__ == "__main__":
    main() 