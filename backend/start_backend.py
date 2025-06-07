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
    directories = ['sessions', 'logs', 'data']
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
    print("📡 Starting Flask server with scheduler...")
    print("🌐 Frontend should connect to: http://localhost:8000")
    print("="*50 + "\n")
    
    # Start the backend server with proper initialization
    try:
        # Import required modules
        from backend_server import (
            app, DatabaseManager, TelegramManager, 
            ScheduledMessageProcessor, AsyncExecutor,
            DATABASE_FILE, SESSIONS_DIR, logger
        )
        
        # Initialize global managers (same as in backend_server.py __main__)
        print("🔧 Initializing database manager...")
        db_manager = DatabaseManager(DATABASE_FILE)
        
        print("🔧 Initializing telegram manager...")
        telegram_manager = TelegramManager(db_manager)
        
        print("🔧 Initializing async executor...")
        async_executor = AsyncExecutor()
        
        # Initialize and start the scheduled message processor
        print("🔧 Initializing message scheduler...")
        message_processor = ScheduledMessageProcessor(db_manager, telegram_manager)
        message_processor.start()
        
        # Set global variables in backend_server module
        import backend_server
        backend_server.db_manager = db_manager
        backend_server.telegram_manager = telegram_manager
        backend_server.async_executor = async_executor
        backend_server.message_processor = message_processor
        
        print("✅ All components initialized successfully!")
        logger.info("🚀 Starting Telegram Backend Server...")
        logger.info(f"📅 Scheduled message processor: ENABLED")
        logger.info(f"🗄️  Database: {DATABASE_FILE}")
        logger.info(f"📁 Sessions: {SESSIONS_DIR}")
        
        # Run Flask app
        app.run(debug=False, host='0.0.0.0', port=8000)
        
    except ImportError as e:
        print(f"❌ Error importing backend_server: {e}")
        print("Make sure backend_server.py is in the current directory")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        # Clean shutdown
        try:
            if 'message_processor' in locals():
                message_processor.stop()
            if 'async_executor' in locals():
                async_executor.close()
        except:
            pass
        print("✅ Server shutdown complete")
        print("👋 Backend server stopped")
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 