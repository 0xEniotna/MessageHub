#!/usr/bin/env python3
"""
Startup script for the Telegram Sender Backend
"""

import os
import sys
import subprocess
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
    directories = ['sessions', 'logs']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✅ Created directory: {directory}")

def setup_environment():
    """Set up environment variables"""
    env_file = '.env'
    if not os.path.exists(env_file):
        with open(env_file, 'w') as f:
            f.write("# Telegram Sender Backend Configuration\n")
            f.write("SECRET_KEY=your-secret-key-change-this-in-production\n")
            f.write("FLASK_ENV=development\n")
            f.write("FLASK_DEBUG=1\n")
        print(f"✅ Created {env_file} file")

def main():
    """Main startup function"""
    print("🚀 Starting Telegram Sender Backend...")
    
    # Check Python version
    check_python_version()
    
    # Create directories
    create_directories()
    
    # Setup environment
    setup_environment()
    
    # Install requirements
    install_requirements()
    
    print("\n" + "="*50)
    print("🎉 Backend setup complete!")
    print("📡 Starting Flask server...")
    print("🌐 Frontend should connect to: http://localhost:8000")
    print("="*50 + "\n")
    
    # Start the backend server
    try:
        from backend_server import app
        app.run(debug=True, host='0.0.0.0', port=8000)
    except ImportError as e:
        print(f"❌ Error importing backend_server: {e}")
        print("Make sure backend_server.py is in the current directory")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Backend server stopped")

if __name__ == "__main__":
    main() 