#!/usr/bin/env python3
"""
WSGI entry point for production deployment
"""

import os
import sys
import logging

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/app.log')
    ]
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    try:
        # Create necessary directories
        os.makedirs('sessions', exist_ok=True)
        os.makedirs('logs', exist_ok=True)
        os.makedirs('data', exist_ok=True)
        
        # Import the Flask app and required components
        from backend_server import (
            app, DatabaseManager, TelegramManager, 
            ScheduledMessageProcessor, AsyncExecutor,
            DATABASE_FILE, SESSIONS_DIR, logger as app_logger
        )
        
        logger.info("🔧 Initializing backend components...")
        
        # Initialize global managers
        db_manager = DatabaseManager(DATABASE_FILE)
        telegram_manager = TelegramManager(db_manager)
        async_executor = AsyncExecutor()
        
        # Initialize and start the scheduled message processor
        message_processor = ScheduledMessageProcessor(db_manager, telegram_manager)
        message_processor.start()
        
        # Set global variables in backend_server module
        import backend_server
        backend_server.db_manager = db_manager
        backend_server.telegram_manager = telegram_manager
        backend_server.async_executor = async_executor
        backend_server.message_processor = message_processor
        
        # Restore existing Telegram sessions
        logger.info("🔄 Restoring existing Telegram sessions...")
        from backend_server import run_async
        run_async(telegram_manager.restore_existing_sessions())
        
        logger.info("✅ Backend application initialized successfully!")
        logger.info(f"📅 Scheduled message processor: {'ENABLED' if message_processor.running else 'DISABLED'}")
        logger.info(f"🗄️  Database: {DATABASE_FILE}")
        logger.info(f"📁 Sessions: {SESSIONS_DIR}")
        
        return app
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize application: {str(e)}")
        raise

# Create the WSGI application
application = create_app()

# For compatibility
app = application

if __name__ == "__main__":
    # This is only for development - don't use in production
    application.run(debug=False, host='0.0.0.0', port=8000) 