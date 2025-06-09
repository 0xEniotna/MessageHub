#!/usr/bin/env python3
"""
Flask backend server for Telegram Sender Frontend
Integrates with the existing telegram_sender.py functionality
SECURITY ENHANCED VERSION
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio
import json
import os
import logging
from datetime import datetime, timedelta
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneNumberInvalidError
from telethon.tl.types import User, Chat, Channel
import jwt
import threading
import time
from typing import Dict, List, Optional
import sqlite3
from contextlib import contextmanager
import concurrent.futures
from functools import wraps
import hashlib
import base64
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import tempfile
from werkzeug.utils import secure_filename

# Configure logging first
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration
config_paths = [
    'config/config.env.prod',
    'config/config.env',
    '.env'
]

for config_path in config_paths:
    if os.path.exists(config_path):
        load_dotenv(config_path)
        break
else:
    logger.warning("No config.env file found. Using environment variables.")

app = Flask(__name__)

# Security Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'change-this-in-production-use-32-plus-chars')
if len(SECRET_KEY) < 32:
    logger.warning("SECRET_KEY should be at least 32 characters for security!")

ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    # Generate a new encryption key if none exists
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    logger.warning(f"Generated new encryption key: {ENCRYPTION_KEY}")
    logger.warning("Please save this key to your config.env file!")

# Initialize encryption
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

# CORS Configuration
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=allowed_origins)

# Configuration
SESSIONS_DIR = 'sessions'
DATABASE_FILE = os.getenv('DATABASE_URL', 'telegram_sender.db').replace('sqlite:///', '')

# Rate limiting
RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '10'))
MAX_RECIPIENTS_PER_MESSAGE = int(os.getenv('MAX_RECIPIENTS_PER_MESSAGE', '50'))

# Note: API_ID and API_HASH are provided per-user through the login form
# No global validation needed since each user has their own credentials

# Global variables
telegram_manager = None
async_executor = None
db_manager = None
message_processor = None

# Rate limiting storage (in production, use Redis)
rate_limit_storage = {}

def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data before storage"""
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data after retrieval"""
    return cipher_suite.decrypt(encrypted_data.encode()).decode()

def rate_limit(max_requests: int = RATE_LIMIT_PER_MINUTE):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            now = datetime.now()
            minute_ago = now - timedelta(minutes=1)
            
            # Clean old entries
            if client_ip in rate_limit_storage:
                rate_limit_storage[client_ip] = [
                    req_time for req_time in rate_limit_storage[client_ip] 
                    if req_time > minute_ago
                ]
            else:
                rate_limit_storage[client_ip] = []
            
            # Check rate limit
            if len(rate_limit_storage[client_ip]) >= max_requests:
                return jsonify({
                    'success': False,
                    'error': 'Rate limit exceeded. Please try again later.'
                }), 429
            
            # Add current request
            rate_limit_storage[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def hash_phone_number(phone_number: str) -> str:
    """Hash phone number for privacy"""
    return hashlib.sha256(phone_number.encode()).hexdigest()[:16]

class AsyncExecutor:
    """Thread-safe async executor for running async operations"""
    
    def __init__(self):
        self.loop = None
        self.thread = None
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        self._start_loop()
    
    def _start_loop(self):
        """Start the event loop in a separate thread"""
        def run_loop():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()
        
        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()
        
        # Wait for loop to be ready
        while self.loop is None:
            time.sleep(0.01)
    
    def run_async(self, coro):
        """Run an async coroutine and return the result"""
        if self.loop is None:
            raise RuntimeError("Event loop not initialized")
        
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        return future.result(timeout=30)  # 30 second timeout
    
    def close(self):
        """Clean shutdown of the executor"""
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.thread:
            self.thread.join(timeout=5)
        self.executor.shutdown(wait=True)

class DatabaseManager:
    """Handle SQLite database operations"""
    
    def __init__(self, db_file: str):
        self.db_file = db_file
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            conn.execute('''
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
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_sessions (
                    phone_number TEXT PRIMARY KEY,
                    api_id TEXT NOT NULL,
                    api_hash TEXT NOT NULL,
                    session_data TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_active TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def save_scheduled_message(self, phone_number: str, recipients: List, message: str, scheduled_for: str) -> int:
        """Save a scheduled message"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO scheduled_messages (phone_number, recipients, message, scheduled_for)
                VALUES (?, ?, ?, ?)
            ''', (phone_number, json.dumps(recipients), message, scheduled_for))
            conn.commit()
            return cursor.lastrowid
    
    def get_scheduled_messages(self, phone_number: Optional[str] = None) -> List[Dict]:
        """Get scheduled messages"""
        with self.get_connection() as conn:
            if phone_number:
                cursor = conn.execute('''
                    SELECT * FROM scheduled_messages WHERE phone_number = ?
                    ORDER BY scheduled_for ASC
                ''', (phone_number,))
            else:
                cursor = conn.execute('''
                    SELECT * FROM scheduled_messages ORDER BY scheduled_for ASC
                ''')
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    'id': str(row['id']),
                    'phone_number': row['phone_number'],
                    'recipients': json.loads(row['recipients']),
                    'message': row['message'],
                    'scheduled_for': row['scheduled_for'],
                    'status': row['status'],
                    'created_at': row['created_at'],
                    'executed_at': row['executed_at']
                })
            return messages
    
    def update_message_status(self, message_id: int, status: str, executed_at: Optional[str] = None):
        """Update message status"""
        with self.get_connection() as conn:
            if executed_at:
                conn.execute('''
                    UPDATE scheduled_messages 
                    SET status = ?, executed_at = ?
                    WHERE id = ?
                ''', (status, executed_at, message_id))
            else:
                conn.execute('''
                    UPDATE scheduled_messages 
                    SET status = ?
                    WHERE id = ?
                ''', (status, message_id))
            conn.commit()
    
    def delete_scheduled_message(self, message_id: int, phone_number: str) -> bool:
        """Delete a scheduled message (only if it belongs to the user)"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                'DELETE FROM scheduled_messages WHERE id = ? AND phone_number = ?', 
                (message_id, phone_number)
            )
            conn.commit()
            return cursor.rowcount > 0
    
    def save_user_session(self, phone_number: str, api_id: str, api_hash: str):
        """Save user session info"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO user_sessions (phone_number, api_id, api_hash, last_active)
                VALUES (?, ?, ?, ?)
            ''', (phone_number, api_id, api_hash, datetime.now().isoformat()))
            conn.commit()

class TelegramManager:
    """Manage Telegram clients and operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.clients: Dict[str, TelegramClient] = {}
        self.db_manager = db_manager
        self.pending_codes: Dict[str, Dict] = {}  # Store pending verification codes
        
        logger.info("✅ TelegramManager initialized")
    
    async def restore_existing_sessions(self):
        """Restore existing Telegram sessions from database and session files"""
        try:
            # Get all saved user sessions from database
            with self.db_manager.get_connection() as conn:
                cursor = conn.execute('SELECT phone_number, api_id, api_hash FROM user_sessions')
                sessions = cursor.fetchall()
            
            restored_count = 0
            for session in sessions:
                phone_number = session['phone_number']
                api_id = session['api_id']
                api_hash = session['api_hash']
                
                try:
                    session_file = f"{SESSIONS_DIR}/{phone_number}.session"
                    
                    # Check if session file exists
                    if os.path.exists(session_file):
                        # Try to restore the client
                        client = TelegramClient(session_file, int(api_id), api_hash)
                        await client.connect()
                        
                        if await client.is_user_authorized():
                            self.clients[phone_number] = client
                            restored_count += 1
                            logger.info(f"✅ Restored session for {phone_number}")
                        else:
                            logger.warning(f"⚠️  Session expired for {phone_number}")
                            await client.disconnect()
                    else:
                        logger.warning(f"⚠️  Session file not found for {phone_number}")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to restore session for {phone_number}: {str(e)}")
            
            if restored_count > 0:
                logger.info(f"🎉 Successfully restored {restored_count} Telegram session(s)")
            else:
                logger.info("ℹ️  No existing sessions to restore")
                
        except Exception as e:
            logger.error(f"❌ Error restoring sessions: {str(e)}")
    
    async def create_client(self, api_id: str, api_hash: str, phone_number: str) -> Dict:
        """Create and authenticate Telegram client"""
        try:
            session_file = f"{SESSIONS_DIR}/{phone_number}.session"
            client = TelegramClient(session_file, int(api_id), api_hash)
            
            await client.connect()
            
            if not await client.is_user_authorized():
                # Send verification code
                result = await client.send_code_request(phone_number)
                
                # Store pending verification info
                self.pending_codes[phone_number] = {
                    'client': client,
                    'api_id': api_id,
                    'api_hash': api_hash,
                    'phone_code_hash': result.phone_code_hash,
                    'created_at': datetime.now()
                }
                
                return {
                    'success': False,
                    'requires_code': True,
                    'message': 'Verification code sent to your phone. Please provide the code.'
                }
            else:
                # Already authorized
                self.clients[phone_number] = client
                self.db_manager.save_user_session(phone_number, api_id, api_hash)
                
                return {
                    'success': True,
                    'message': 'Successfully connected to Telegram'
                }
                
        except PhoneNumberInvalidError:
            return {
                'success': False,
                'message': 'Invalid phone number format'
            }
        except Exception as e:
            logger.error(f"Error creating client: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to connect: {str(e)}'
            }
    
    async def verify_code(self, phone_number: str, code: str, password: Optional[str] = None) -> Dict:
        """Verify the authentication code"""
        if phone_number not in self.pending_codes:
            return {
                'success': False,
                'message': 'No pending verification for this phone number'
            }
        
        try:
            pending = self.pending_codes[phone_number]
            client = pending['client']
            
            if password:
                # Two-factor authentication
                await client.sign_in(password=password)
            else:
                # Regular code verification
                await client.sign_in(phone_number, code, phone_code_hash=pending['phone_code_hash'])
            
            # Successfully authenticated
            self.clients[phone_number] = client
            self.db_manager.save_user_session(phone_number, pending['api_id'], pending['api_hash'])
            
            # Clean up pending verification
            del self.pending_codes[phone_number]
            
            return {
                'success': True,
                'message': 'Successfully authenticated with Telegram'
            }
            
        except SessionPasswordNeededError:
            return {
                'success': False,
                'requires_password': True,
                'message': 'Two-factor authentication enabled. Please provide your password.'
            }
        except PhoneCodeInvalidError:
            return {
                'success': False,
                'message': 'Invalid verification code'
            }
        except Exception as e:
            logger.error(f"Error verifying code: {str(e)}")
            return {
                'success': False,
                'message': f'Verification failed: {str(e)}'
            }
    
    async def get_dialogs(self, phone_number: str) -> List[Dict]:
        """Get all dialogs/chats for a user"""
        if phone_number not in self.clients:
            raise Exception("Client not connected")
        
        client = self.clients[phone_number]
        dialogs = await client.get_dialogs()
        
        chats = []
        for dialog in dialogs:
            entity = dialog.entity
            
            # Determine chat type and extract info
            if isinstance(entity, User):
                chat_type = 'user'
                name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                if not name:
                    name = entity.username or f"User {entity.id}"
            elif isinstance(entity, Chat):
                chat_type = 'group'
                name = entity.title
            elif isinstance(entity, Channel):
                chat_type = 'channel' if entity.broadcast else 'supergroup'
                name = entity.title
            else:
                continue
            
            chats.append({
                'id': str(entity.id),
                'name': name,
                'type': chat_type,
                'username': getattr(entity, 'username', None),
                'participants_count': getattr(entity, 'participants_count', None)
            })
        
        return chats
    
    async def send_message_to_recipients(self, phone_number: str, recipients: List[Dict], message: str) -> List[Dict]:
        """Send message to multiple recipients"""
        if phone_number not in self.clients:
            raise Exception("Client not connected")
        
        client = self.clients[phone_number]
        results = []
        
        for recipient in recipients:
            try:
                # Try to resolve entity
                entity = None
                identifier = recipient['identifier']
                
                # Try different methods to get the entity
                if identifier.startswith('@'):
                    entity = await client.get_entity(identifier)
                elif identifier.startswith('-100'):
                    # Supergroup/channel ID
                    entity = await client.get_entity(int(identifier))
                elif identifier.isdigit() or (identifier.startswith('-') and identifier[1:].isdigit()):
                    # Regular ID
                    entity = await client.get_entity(int(identifier))
                else:
                    # Try as username without @
                    entity = await client.get_entity(f"@{identifier}")
                
                if entity:
                    await client.send_message(entity, message)
                    results.append({
                        'recipient': recipient['name'],
                        'identifier': identifier,
                        'success': True
                    })
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                else:
                    results.append({
                        'recipient': recipient['name'],
                        'identifier': identifier,
                        'success': False,
                        'error': 'Could not resolve entity'
                    })
                    
            except Exception as e:
                logger.error(f"Error sending to {recipient['name']}: {str(e)}")
                results.append({
                    'recipient': recipient['name'],
                    'identifier': recipient.get('identifier', 'unknown'),
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    async def send_message_with_media_to_recipients(self, phone_number: str, recipients: List[Dict], message: str, image_files: List) -> List[Dict]:
        """Send message with images to multiple recipients"""
        if phone_number not in self.clients:
            raise Exception("Client not connected")
        
        client = self.clients[phone_number]
        results = []
        
        # Save uploaded files temporarily
        temp_files = []
        try:
            for image_file in image_files:
                # Create temporary file
                temp_fd, temp_path = tempfile.mkstemp(suffix=f"_{secure_filename(image_file.filename)}")
                temp_files.append(temp_path)
                
                # Save uploaded file to temporary location
                with os.fdopen(temp_fd, 'wb') as temp_file:
                    image_file.save(temp_file)
                
                logger.info(f"Saved image to temporary file: {temp_path}")
            
            # Send to each recipient
            for recipient in recipients:
                try:
                    # Try to resolve entity
                    entity = None
                    identifier = recipient['identifier']
                    
                    # Try different methods to get the entity
                    if identifier.startswith('@'):
                        entity = await client.get_entity(identifier)
                    elif identifier.startswith('-100'):
                        # Supergroup/channel ID
                        entity = await client.get_entity(int(identifier))
                    elif identifier.isdigit() or (identifier.startswith('-') and identifier[1:].isdigit()):
                        # Regular ID
                        entity = await client.get_entity(int(identifier))
                    else:
                        # Try as username without @
                        entity = await client.get_entity(f"@{identifier}")
                    
                    if entity:
                        # Send message with images
                        if len(temp_files) == 1:
                            # Single image
                            await client.send_message(entity, message, file=temp_files[0])
                        else:
                            # Multiple images
                            await client.send_message(entity, message, file=temp_files)
                        
                        results.append({
                            'recipient': recipient['name'],
                            'identifier': identifier,
                            'success': True
                        })
                        
                        # Rate limiting
                        await asyncio.sleep(2)  # Slightly longer delay for media
                    else:
                        results.append({
                            'recipient': recipient['name'],
                            'identifier': identifier,
                            'success': False,
                            'error': 'Could not resolve entity'
                        })
                        
                except Exception as e:
                    logger.error(f"Error sending media to {recipient['name']}: {str(e)}")
                    results.append({
                        'recipient': recipient['name'],
                        'identifier': recipient.get('identifier', 'unknown'),
                        'success': False,
                        'error': str(e)
                    })
        
        finally:
            # Clean up temporary files
            for temp_path in temp_files:
                try:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                        logger.info(f"Cleaned up temporary file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {temp_path}: {str(e)}")
        
        return results
    
    def is_connected(self, phone_number: str) -> bool:
        """Check if client is connected"""
        return phone_number in self.clients
    
    async def close_all_sessions(self):
        """Close all active Telegram sessions"""
        logger.info("🔄 Closing all Telegram sessions...")
        closed_count = 0
        
        for phone_number, client in list(self.clients.items()):
            try:
                await client.disconnect()
                closed_count += 1
                logger.info(f"✅ Closed session for {phone_number}")
            except Exception as e:
                logger.error(f"❌ Error closing session for {phone_number}: {str(e)}")
        
        self.clients.clear()
        
        if closed_count > 0:
            logger.info(f"🎉 Successfully closed {closed_count} Telegram session(s)")
        else:
            logger.info("ℹ️  No sessions to close")

# Initialize components
db_manager = DatabaseManager(DATABASE_FILE)
telegram_manager = TelegramManager(db_manager)

def generate_token(phone_number: str) -> str:
    """Generate JWT token for authentication"""
    payload = {
        'phone_number': phone_number,
        'exp': datetime.utcnow() + timedelta(days=7)  # 7 days expiry
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return phone number"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['phone_number']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def run_async(coro):
    """Run async function in sync context using the global executor"""
    global async_executor
    if async_executor is None:
        async_executor = AsyncExecutor()
    return async_executor.run_async(coro)

def get_auth_token(request) -> tuple:
    """Safely extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None, ('No authorization header', 401)
    
    auth_parts = auth_header.split(' ')
    if len(auth_parts) != 2 or auth_parts[0] != 'Bearer':
        return None, ('Invalid authorization header format', 401)
    
    token = auth_parts[1]
    phone_number = verify_token(token)
    
    if not phone_number:
        return None, ('Not authenticated', 401)
    
    return phone_number, None

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'scheduler_running': message_processor.running if message_processor else False
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate with Telegram"""
    data = request.get_json()
    api_id = data.get('api_id')
    api_hash = data.get('api_hash')
    phone_number = data.get('phone_number')
    
    if not all([api_id, api_hash, phone_number]):
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    
    try:
        result = run_async(telegram_manager.create_client(api_id, api_hash, phone_number))
        
        if result['success']:
            token = generate_token(phone_number)
            result['session_token'] = token
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to connect: {str(e)}'
        }), 500

@app.route('/api/auth/verify', methods=['POST'])
def verify_code():
    """Verify authentication code"""
    data = request.get_json()
    phone_number = data.get('phone_number')
    code = data.get('code')
    password = data.get('password')
    
    if not phone_number or not code:
        return jsonify({'success': False, 'message': 'Missing phone number or code'}), 400
    
    try:
        result = run_async(telegram_manager.verify_code(phone_number, code, password))
        
        if result['success']:
            token = generate_token(phone_number)
            result['session_token'] = token
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Verification failed: {str(e)}'
        }), 500

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check authentication status"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'connected': False}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number:
        return jsonify({'connected': False}), 401
    
    return jsonify({
        'connected': telegram_manager.is_connected(phone_number),
        'phone_number': phone_number
    })

@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Get all available chats"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number or not telegram_manager.is_connected(phone_number):
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        chats = run_async(telegram_manager.get_dialogs(phone_number))
        return jsonify({'chats': chats})
        
    except Exception as e:
        logger.error(f"Error getting chats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/send', methods=['POST'])
def send_message():
    """Send message to recipients"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number or not telegram_manager.is_connected(phone_number):
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    recipients = data.get('recipients', [])
    message = data.get('message', '')
    schedule_for = data.get('schedule_for')
    timezone_offset = data.get('timezone_offset')  # Client timezone offset in minutes
    
    if not recipients or not message:
        return jsonify({'error': 'Missing recipients or message'}), 400
    
    try:
        if schedule_for:
            # Handle timezone conversion for scheduled messages
            if timezone_offset is not None:
                # Convert client time to UTC
                try:
                    # Parse the client's local time
                    local_time = datetime.fromisoformat(schedule_for)
                    
                    # Convert to UTC by adding the timezone offset
                    # timezone_offset from getTimezoneOffset() is negative for timezones ahead of UTC
                    # Example: CET (UTC+1) returns -60, so: local_time + (-60) = local_time - 60 = UTC
                    utc_time = local_time + timedelta(minutes=timezone_offset)
                    
                    # Store in UTC format
                    schedule_for_utc = utc_time.isoformat() + 'Z'
                    
                    logger.info(f"🌍 Timezone conversion: {schedule_for} (local) → {schedule_for_utc} (UTC), offset: {timezone_offset}min")
                    
                    message_id = db_manager.save_scheduled_message(phone_number, recipients, message, schedule_for_utc)
                except Exception as e:
                    logger.error(f"Timezone conversion error: {str(e)}")
                    # Fallback to original behavior
                    message_id = db_manager.save_scheduled_message(phone_number, recipients, message, schedule_for)
            else:
                # No timezone info provided - save as-is (legacy behavior)
                message_id = db_manager.save_scheduled_message(phone_number, recipients, message, schedule_for)
            
            return jsonify({
                'success': True,
                'message': 'Message scheduled successfully',
                'scheduled_id': message_id
            })
        else:
            # Send immediately
            results = run_async(telegram_manager.send_message_to_recipients(phone_number, recipients, message))
            
            sent_count = sum(1 for r in results if r['success'])
            failed_count = len(results) - sent_count
            
            return jsonify({
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'results': results
            })
            
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/send-media', methods=['POST'])
@rate_limit()
def send_message_with_media():
    """Send message with images to recipients"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number or not telegram_manager.is_connected(phone_number):
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Parse form data
        recipients_json = request.form.get('recipients')
        message = request.form.get('message', '')
        schedule_for = request.form.get('schedule_for')
        
        if not recipients_json:
            return jsonify({'error': 'Missing recipients'}), 400
        
        try:
            recipients = json.loads(recipients_json)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid recipients format'}), 400
        
        # Get uploaded images
        image_files = []
        for key in request.files:
            if key.startswith('images'):
                image_files.append(request.files[key])
        
        # Validate we have either message or images
        if not message and not image_files:
            return jsonify({'error': 'Missing message or images'}), 400
        
        # Validate image files
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        for image_file in image_files:
            if image_file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            file_ext = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''
            if file_ext not in allowed_extensions:
                return jsonify({'error': f'Invalid file type: {file_ext}. Allowed: {", ".join(allowed_extensions)}'}), 400
        
        # Check file size (10MB limit per file)
        max_size = 10 * 1024 * 1024  # 10MB
        for image_file in image_files:
            image_file.seek(0, 2)  # Seek to end
            file_size = image_file.tell()
            image_file.seek(0)  # Reset to beginning
            
            if file_size > max_size:
                return jsonify({'error': f'File too large: {image_file.filename}. Max size: 10MB'}), 400
        
        logger.info(f"Sending message with {len(image_files)} images to {len(recipients)} recipients")
        
        if schedule_for:
            # Note: Scheduling with media is not implemented yet
            return jsonify({'error': 'Scheduling messages with media is not yet supported'}), 400
        else:
            # Send immediately
            if image_files:
                results = run_async(telegram_manager.send_message_with_media_to_recipients(
                    phone_number, recipients, message, image_files
                ))
            else:
                # Fallback to text-only if no images
                results = run_async(telegram_manager.send_message_to_recipients(
                    phone_number, recipients, message
                ))
            
            sent_count = sum(1 for r in results if r['success'])
            failed_count = len(results) - sent_count
            
            return jsonify({
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'results': results,
                'media_count': len(image_files)
            })
            
    except Exception as e:
        logger.error(f"Error sending message with media: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/scheduled', methods=['GET'])
def get_scheduled_messages():
    """Get all scheduled messages"""
    phone_number, error = get_auth_token(request)
    if error:
        return jsonify({'error': error[0]}), error[1]
    
    try:
        messages = db_manager.get_scheduled_messages(phone_number)
        return jsonify({'messages': messages})
        
    except Exception as e:
        logger.error(f"Error getting scheduled messages: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/execute/<int:message_id>', methods=['POST'])
def execute_scheduled_message(message_id):
    """Execute a scheduled message immediately"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number or not telegram_manager.is_connected(phone_number):
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Get the message
        messages = db_manager.get_scheduled_messages(phone_number)
        message = next((m for m in messages if m['id'] == str(message_id)), None)
        
        if not message:
            return jsonify({'error': 'Message not found'}), 404
        
        if message['status'] != 'pending':
            return jsonify({'error': 'Message already processed'}), 400
        
        # Execute the message
        results = run_async(telegram_manager.send_message_to_recipients(
            phone_number, 
            message['recipients'], 
            message['message']
        ))
        
        # Update status
        sent_count = sum(1 for r in results if r['success'])
        status = 'sent' if sent_count > 0 else 'failed'
        db_manager.update_message_status(message_id, status, datetime.now().isoformat())
        
        return jsonify({
            'success': True,
            'sent_count': sent_count,
            'failed_count': len(results) - sent_count,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error executing message: {str(e)}")
        db_manager.update_message_status(message_id, 'failed', datetime.now().isoformat())
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/<int:message_id>', methods=['DELETE'])
def delete_scheduled_message(message_id):
    """Delete a scheduled message"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        success = db_manager.delete_scheduled_message(message_id, phone_number)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Message not found'}), 404
            
    except Exception as e:
        logger.error(f"Error deleting message: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/status', methods=['GET'])
def scheduler_status():
    """Get scheduler status and stats"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Get scheduled message stats for this user only
        user_messages = db_manager.get_scheduled_messages(phone_number)
        pending_count = len([m for m in user_messages if m['status'] == 'pending'])
        sent_count = len([m for m in user_messages if m['status'] == 'sent'])
        failed_count = len([m for m in user_messages if m['status'] == 'failed'])
        
        return jsonify({
            'scheduler_running': message_processor.running if message_processor else False,
            'server_time': datetime.now().isoformat(),
            'server_timezone': 'UTC' if datetime.now().utcoffset() is None else str(datetime.now().utcoffset()),
            'stats': {
                'pending_messages': pending_count,
                'sent_messages': sent_count,
                'failed_messages': failed_count,
                'total_messages': len(user_messages)
            },
            'next_check': 'Every 30 seconds',
            'timezone': 'Server local time'
        })
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/debug', methods=['GET'])
def scheduler_debug():
    """Debug endpoint to check scheduled messages and timing"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    phone_number = verify_token(token)
    
    if not phone_number:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        messages = db_manager.get_scheduled_messages(phone_number)
        now = datetime.now()
        
        debug_info = {
            'server_time': now.isoformat(),
            'server_timezone': 'UTC',
            'messages': []
        }
        
        for message in messages:
            if message['status'] == 'pending':
                try:
                    scheduled_for_str = message['scheduled_for']
                    scheduled_time = datetime.fromisoformat(scheduled_for_str.replace('Z', '+00:00'))
                    if scheduled_time.tzinfo:
                        scheduled_time = scheduled_time.replace(tzinfo=None)
                    
                    time_diff = (scheduled_time - now).total_seconds()
                    
                    debug_info['messages'].append({
                        'id': message['id'],
                        'scheduled_for_original': scheduled_for_str,
                        'scheduled_for_parsed': scheduled_time.isoformat(),
                        'time_until_due_seconds': int(time_diff),
                        'time_until_due_minutes': int(time_diff / 60),
                        'is_due': scheduled_time <= now,
                        'recipients_count': len(message['recipients']) if isinstance(message['recipients'], list) else 'unknown'
                    })
                except Exception as e:
                    debug_info['messages'].append({
                        'id': message['id'],
                        'error': f"Failed to parse: {str(e)}",
                        'scheduled_for_original': message['scheduled_for']
                    })
        
        return jsonify(debug_info)
        
    except Exception as e:
        logger.error(f"Error in scheduler debug: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/timezone-info', methods=['GET'])
def timezone_info():
    """Get server timezone information"""
    now = datetime.now()
    return jsonify({
        'server_time_utc': now.isoformat() + 'Z',
        'server_timezone': 'UTC',
        'instructions': {
            'frontend': 'Send timezone_offset in minutes with scheduled messages',
            'example': 'For EST (UTC-5): timezone_offset = -300, for CET (UTC+1): timezone_offset = 60'
        }
    })

class ScheduledMessageProcessor:
    """Background processor for scheduled messages"""
    
    def __init__(self, db_manager, telegram_manager):
        self.db_manager = db_manager
        self.telegram_manager = telegram_manager
        self.running = False
        self.thread = None
    
    def start(self):
        """Start the background scheduler"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("📅 Scheduled message processor started")
    
    def stop(self):
        """Stop the background scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("📅 Scheduled message processor stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self._process_due_messages()
                # Sleep for 30 seconds (check twice per minute for better accuracy)
                time.sleep(30)
            except Exception as e:
                logger.error(f"Error in scheduler: {str(e)}")
                time.sleep(60)  # Wait longer on error
    
    def _process_due_messages(self):
        """Check for and process messages that are due"""
        try:
            # Get all pending scheduled messages
            messages = self.db_manager.get_scheduled_messages()
            now = datetime.now()
            
            logger.info(f"🔍 Checking {len(messages)} scheduled messages. Server time (UTC): {now.isoformat()}")
            
            for message in messages:
                if message['status'] != 'pending':
                    continue
                
                # Parse scheduled time
                try:
                    scheduled_for_str = message['scheduled_for']
                    logger.info(f"📅 Processing message {message['id']}: scheduled_for='{scheduled_for_str}'")
                    
                    # Parse the scheduled time - treat as user's local time if no timezone info
                    if scheduled_for_str.endswith('Z'):
                        # UTC time format - already in UTC
                        scheduled_time = datetime.fromisoformat(scheduled_for_str.replace('Z', '+00:00'))
                        if scheduled_time.tzinfo:
                            scheduled_time = scheduled_time.replace(tzinfo=None)
                    elif '+' in scheduled_for_str and scheduled_for_str.count(':') >= 2:
                        # Time with timezone info - convert to UTC
                        from datetime import timezone
                        scheduled_time = datetime.fromisoformat(scheduled_for_str)
                        if scheduled_time.tzinfo:
                            # Convert to UTC
                            scheduled_time_utc = scheduled_time.utctimetuple()
                            scheduled_time = datetime(*scheduled_time_utc[:6])
                        else:
                            # Should not happen but fallback
                            scheduled_time = scheduled_time
                    else:
                        # No timezone info - this is the common case from frontend
                        # Frontend sends user's local time, but we need to treat it as UTC for now
                        # until we implement proper timezone detection
                        scheduled_time = datetime.fromisoformat(scheduled_for_str)
                        
                        # For now: assume the scheduled time is intended as user's local time
                        # We'll compare against server time but add timezone awareness later
                        
                        # Quick fix: If scheduled time seems to be in the past by more than a few hours,
                        # it's likely a timezone issue - try adding common timezone offsets
                        time_diff = (now - scheduled_time).total_seconds()
                        
                        if time_diff > 3600:  # More than 1 hour in the past
                            # Common timezone adjustments (this is a temporary fix)
                            # Try different timezone offsets to find a reasonable match
                            for offset_hours in [0, 1, 2, 3, 4, 5, 6, 7, 8, -5, -6, -7, -8]:
                                adjusted_time = scheduled_time + timedelta(hours=offset_hours)
                                adjusted_diff = (adjusted_time - now).total_seconds()
                                
                                # If this adjustment makes the time future and reasonable (within 24h)
                                if -300 <= adjusted_diff <= 86400:  # Between 5 min ago and 24h future
                                    scheduled_time = adjusted_time
                                    logger.info(f"🔧 Adjusted scheduled time by {offset_hours}h for timezone: {scheduled_time.isoformat()}")
                                    break
                    
                    logger.info(f"⏰ Message {message['id']}: scheduled={scheduled_time.isoformat()}, now={now.isoformat()}")
                    
                except ValueError as e:
                    logger.error(f"Invalid date format for message {message['id']}: {message['scheduled_for']} - {str(e)}")
                    self.db_manager.update_message_status(message['id'], 'failed', now.isoformat())
                    continue
                
                # Check if message is due (with 1 minute tolerance)
                if scheduled_time <= now + timedelta(minutes=1):
                    logger.info(f"🚀 Processing scheduled message {message['id']} (due: {scheduled_time})")
                    self._execute_message(message)
                else:
                    time_until_due = (scheduled_time - now).total_seconds()
                    logger.info(f"⏳ Message {message['id']} not yet due. Time remaining: {int(time_until_due/60)} minutes")
        
        except Exception as e:
            logger.error(f"Error processing due messages: {str(e)}")
    
    def _execute_message(self, message):
        """Execute a single scheduled message"""
        message_id = message['id']
        phone_number = message['phone_number']
        
        try:
            # Check if user is still connected
            if not self.telegram_manager.is_connected(phone_number):
                logger.warning(f"User {phone_number} not connected, skipping message {message_id}")
                self.db_manager.update_message_status(message_id, 'failed', datetime.now().isoformat())
                return
            
            # Parse recipients
            try:
                recipients = json.loads(message['recipients']) if isinstance(message['recipients'], str) else message['recipients']
            except json.JSONDecodeError:
                logger.error(f"Invalid recipients format for message {message_id}")
                self.db_manager.update_message_status(message_id, 'failed', datetime.now().isoformat())
                return
            
            # Send the message
            logger.info(f"📤 Sending scheduled message {message_id} to {len(recipients)} recipients")
            
            # Use the async executor to run the coroutine
            results = run_async(self.telegram_manager.send_message_to_recipients(
                phone_number, 
                recipients, 
                message['message']
            ))
            
            # Update status based on results
            sent_count = sum(1 for r in results if r['success'])
            failed_count = len(results) - sent_count
            
            if sent_count > 0:
                status = 'sent'
                logger.info(f"✅ Scheduled message {message_id} sent successfully ({sent_count}/{len(results)})")
            else:
                status = 'failed'
                logger.error(f"❌ Scheduled message {message_id} failed to send to all recipients")
            
            self.db_manager.update_message_status(message_id, status, datetime.now().isoformat())
            
        except Exception as e:
            logger.error(f"❌ Error executing scheduled message {message_id}: {str(e)}")
            self.db_manager.update_message_status(message_id, 'failed', datetime.now().isoformat())

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    
    # Initialize global managers
    db_manager = DatabaseManager(DATABASE_FILE)
    telegram_manager = TelegramManager(db_manager)
    async_executor = AsyncExecutor()
    
    # Initialize and start the scheduled message processor
    message_processor = ScheduledMessageProcessor(db_manager, telegram_manager)
    message_processor.start()
    
    # Restore existing sessions after all components are ready
    logger.info("🔄 Restoring existing Telegram sessions...")
    run_async(telegram_manager.restore_existing_sessions())
    
    logger.info("🚀 Starting Flask server...")
    
    try:
        # Run Flask app
        app.run(debug=True, host='0.0.0.0', port=8000)
    finally:
        # Clean shutdown
        logger.info("🛑 Shutting down server...")
        
        # Close all Telegram sessions
        if telegram_manager:
            run_async(telegram_manager.close_all_sessions())
        
        if message_processor:
            message_processor.stop()
        if async_executor:
            async_executor.close()
        logger.info("✅ Server shutdown complete") 
