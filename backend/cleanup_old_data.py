#!/usr/bin/env python3
"""
Data Cleanup Script for Telegram Bot Backend
Automatically cleans up old data to maintain privacy promises
"""

import os
import time
import logging
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataCleaner:
    def __init__(self, db_file='telegram_sender.db', retention_days=30):
        self.db_file = db_file
        self.retention_days = retention_days
        self.cutoff_date = datetime.now() - timedelta(days=retention_days)
        
    def clean_database(self):
        """Clean old records from SQLite database"""
        try:
            with sqlite3.connect(self.db_file) as conn:
                cursor = conn.cursor()
                
                # Clean old scheduled messages
                cursor.execute('''
                    DELETE FROM scheduled_messages 
                    WHERE created_at < ? AND status IN ('sent', 'failed')
                ''', (self.cutoff_date.isoformat(),))
                
                deleted_messages = cursor.rowcount
                logger.info(f"Deleted {deleted_messages} old scheduled messages")
                
                # Clean old user sessions (keep active ones)
                cursor.execute('''
                    DELETE FROM user_sessions 
                    WHERE last_active < ?
                ''', (self.cutoff_date.isoformat(),))
                
                deleted_sessions = cursor.rowcount
                logger.info(f"Deleted {deleted_sessions} old user sessions")
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Database cleanup failed: {e}")
    
    def clean_session_files(self):
        """Clean old Telegram session files"""
        sessions_dir = Path('sessions')
        if not sessions_dir.exists():
            return
            
        deleted_count = 0
        cutoff_timestamp = self.cutoff_date.timestamp()
        
        for session_file in sessions_dir.glob('*.session'):
            try:
                # Check file modification time
                if session_file.stat().st_mtime < cutoff_timestamp:
                    session_file.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted old session file: {session_file.name}")
            except Exception as e:
                logger.error(f"Failed to delete {session_file}: {e}")
        
        logger.info(f"Deleted {deleted_count} old session files")
    
    def clean_logs(self):
        """Clean old log files"""
        logs_dir = Path('logs')
        if not logs_dir.exists():
            return
            
        deleted_count = 0
        cutoff_timestamp = self.cutoff_date.timestamp()
        
        for log_file in logs_dir.glob('*.log'):
            try:
                if log_file.stat().st_mtime < cutoff_timestamp:
                    log_file.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted old log file: {log_file.name}")
            except Exception as e:
                logger.error(f"Failed to delete {log_file}: {e}")
        
        logger.info(f"Deleted {deleted_count} old log files")
    
    def run_cleanup(self):
        """Run full cleanup process"""
        logger.info(f"Starting data cleanup (retention: {self.retention_days} days)")
        logger.info(f"Cutoff date: {self.cutoff_date}")
        
        self.clean_database()
        self.clean_session_files()
        self.clean_logs()
        
        logger.info("Data cleanup completed")

def main():
    """Main function for standalone execution"""
    cleaner = DataCleaner(retention_days=30)  # 30 days as promised
    cleaner.run_cleanup()

if __name__ == '__main__':
    main() 