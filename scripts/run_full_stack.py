#!/usr/bin/env python3
"""
Full Stack Telegram Sender - Run both backend and frontend
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

# Ensure we're in the root directory
root_dir = Path(__file__).parent.parent
os.chdir(root_dir)

def setup_environment():
    """Setup environment and check dependencies"""
    print("🔧 Setting up environment...")
    
    # Check if config exists
    if not os.path.exists('config/config.env'):
        print("❌ config/config.env not found!")
        print("📝 Please copy config/config.env.example to config/config.env and fill in your values")
        sys.exit(1)
    
    # Check if database exists, create if not
    if not os.path.exists('data/telegram_sender.db'):
        print("🗄️  Database not found, initializing...")
        subprocess.run([sys.executable, 'scripts/init_db.py'], check=True)
    
    print("✅ Environment ready!")

def start_backend():
    """Start the Flask backend server"""
    print("🚀 Starting backend server...")
    env = os.environ.copy()
    
    # Update paths for new structure
    env['PYTHONPATH'] = str(root_dir)
    
    process = subprocess.Popen(
        [sys.executable, 'backend/backend_server.py'],
        env=env,
        cwd=root_dir
    )
    return process

def start_frontend():
    """Start the Next.js frontend server"""
    print("🌐 Starting frontend server...")
    
    frontend_dir = root_dir / 'frontend'
    
    # Check if node_modules exists
    if not (frontend_dir / 'node_modules').exists():
        print("📦 Installing frontend dependencies...")
        subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
        
    # Start Next.js development server
    process = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=frontend_dir
    )
    return process

def main():
    """Main function to run both servers"""
    
    # Setup
    setup_environment()
    
    print("🚀 Starting Telegram Sender Full Stack Application")
    print("=" * 60)
    
    backend_process = None
    frontend_process = None
    
    def signal_handler(sig, frame):
        print("\n🛑 Shutting down servers...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start backend
        backend_process = start_backend()
        time.sleep(3)  # Give backend time to start
        
        # Start frontend
        frontend_process = start_frontend()
        time.sleep(2)  # Give frontend time to start
        
        print("\n✅ Both servers are starting up!")
        print("🌐 Frontend: http://localhost:3000")
        print("🚀 Backend API: http://localhost:8000")
        print("\n📖 Press Ctrl+C to stop both servers")
        print("=" * 60)
        
        # Keep the main process alive
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend process died!")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend process died!")
                break
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()

if __name__ == "__main__":
    main() 