#!/usr/bin/env python3
"""
Initialize SQLite database for Telegram Sender
"""

import sqlite3
import os
from dotenv import load_dotenv

def init_database():
    # Load config from the new config directory
    load_dotenv('config/config.env')
    
    # Get database file path - store in data directory
    db_url = os.getenv('DATABASE_URL', 'sqlite:///data/telegram_sender.db')
    db_file = db_url.replace('sqlite:///', '')
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    print(f'🗄️  Creating database: {db_file}')
    
    # Create database and tables
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # Create scheduled_messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduled_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL,
            recipients TEXT NOT NULL,
            message TEXT NOT NULL,
            scheduled_for TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            executed_at TEXT NULL
        )
    ''')
    
    # Create user_sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            phone_number TEXT PRIMARY KEY,
            api_id TEXT NOT NULL,
            api_hash TEXT NOT NULL,
            session_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_active TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create indexes for better performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_scheduled_messages_phone ON scheduled_messages(phone_number)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active)')
    
    conn.commit()
    
    # Verify tables were created
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    conn.close()
    
    print('✅ Database created successfully!')
    print('✅ Tables created:')
    for table in tables:
        print(f'   - {table[0]}')
    
    print(f'📁 Database file: {db_file}')
    print(f'📊 Database size: {os.path.getsize(db_file) if os.path.exists(db_file) else 0} bytes')

if __name__ == '__main__':
    init_database() 